/* ---------------------------------------------------------------------------
 * speedtest.js — WebUI orchestration for the APEN Speed Test.
 *
 * Responsibilities:
 *   - Fetch /speedtest/api/config to discover endpoints + tunables.
 *   - Drive three phases (ping, download, upload) with live gauge updates.
 *   - POST the aggregated result payload to /speedtest/api/results.
 *
 * The measurement math remains simple and in-browser to avoid pulling any
 * third-party runtime: bytes accumulated / wall-clock elapsed.
 * ------------------------------------------------------------------------- */

(async function () {
  "use strict";

  const cfg = await fetch("/speedtest/api/config", {
    cache: "no-store",
    credentials: "omit",
  }).then((r) => r.json());

  const { PING_COUNT, CHUNK_SIZE, PHASE_TIME_MS, ENDPOINTS } = cfg;
  const { ping: PING, download: DL, upload: UL, results: RES } = ENDPOINTS;
  const STREAMS = Math.max(1, cfg.STREAMS || 4);
  const WARMUP_MS = (cfg.WARMUP_MS != null ? cfg.WARMUP_MS : 1500);
  const DOWNLOAD_SIZE = cfg.DOWNLOAD_SIZE || (4 * 1024 * 1024);

  /* -------- DOM handles --------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const UI = {
    startBtn:  $("start-btn"),
    phasePill: $("phase-pill"),
    phaseLbl:  $("phase-label"),
    timer:     $("timer"),
    status:    $("status"),
    gaugeArc:  document.querySelector(".gauge-arc"),
    gVal:      $("gauge-value"),
    gUnit:     $("gauge-unit"),
    gSub:      $("gauge-sub"),
    latMin:    $("lat-min"),
    latAvg:    $("lat-avg"),
    latMax:    $("lat-max"),
    latJit:    $("lat-jit"),
    dlVal:     $("dl-mbps"),
    dlSub:     $("dl-sub"),
    ulVal:     $("ul-mbps"),
    ulSub:     $("ul-sub"),
    panels: {
      latency:  document.querySelector('.panel[data-phase="latency"]'),
      download: document.querySelector('.panel[data-phase="download"]'),
      upload:   document.querySelector('.panel[data-phase="upload"]'),
    },
  };

  /* -------- Formatting helpers ------------------------------------------- */
  const fmt2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "--");

  // Display in Gbps once we cross 1000 Mbps so the gauge stays readable.
  function formatSpeed(mbps) {
    if (!Number.isFinite(mbps) || mbps <= 0) return { value: "0.00", unit: "Mbps" };
    if (mbps >= 1000) return { value: (mbps / 1000).toFixed(2), unit: "Gbps" };
    return { value: mbps.toFixed(2), unit: "Mbps" };
  }

  /* -------- Gauge --------------------------------------------------------- */
  // The arc spans 75% of the circle (see CSS) → the visible dasharray length
  // is 452.389 user units. We map "fraction" (0..1) to stroke-dashoffset.
  const ARC_LEN = 452.389;

  // Log-ish mapping so 0..1000 Mbps spans nicely, and 1+ Gbps still advances.
  function speedToFraction(mbps) {
    if (!Number.isFinite(mbps) || mbps <= 0) return 0;
    const CAP = 1000; // full gauge = 1 Gbps
    const f = Math.log10(1 + mbps) / Math.log10(1 + CAP);
    return Math.max(0, Math.min(1, f));
  }

  function setGauge(mbps, subLabel) {
    const f = speedToFraction(mbps);
    UI.gaugeArc.style.strokeDashoffset = String(ARC_LEN * (1 - f));
    const { value, unit } = formatSpeed(mbps);
    UI.gVal.textContent = value;
    UI.gUnit.textContent = unit;
    if (subLabel !== undefined) UI.gSub.textContent = subLabel;
  }

  function setLatencyOnGauge({ avg }) {
    // For the latency phase we display ms in the gauge, mapped 0..500 ms.
    const f = Math.max(0, Math.min(1, avg / 500));
    UI.gaugeArc.style.strokeDashoffset = String(ARC_LEN * (1 - f));
    UI.gVal.textContent = fmt2(avg);
    UI.gUnit.textContent = "ms";
    UI.gSub.textContent = "avg latency";
  }

  function resetGauge() {
    UI.gaugeArc.style.strokeDashoffset = String(ARC_LEN);
    UI.gVal.textContent = "0.00";
    UI.gUnit.textContent = "Mbps";
    UI.gSub.textContent = "Ready";
  }

  /* -------- Phase chrome ------------------------------------------------- */
  function setPhase(name, state /* idle | running | done | error */) {
    UI.phaseLbl.textContent = name;
    UI.phasePill.dataset.state = state;
    for (const p of Object.values(UI.panels)) p.removeAttribute("data-active");
    if (state === "running") {
      const key = name.toLowerCase();
      if (UI.panels[key]) UI.panels[key].setAttribute("data-active", "true");
    }
  }

  function driveTimer(deadline) {
    let rafId;
    (function tick() {
      const remaining = Math.max(0, deadline - performance.now());
      UI.timer.textContent =
        remaining > 0 ? `${Math.ceil(remaining / 1000)}s remaining` : "";
      if (remaining > 0) rafId = requestAnimationFrame(tick);
      else cancelAnimationFrame(rafId);
    })();
    return () => cancelAnimationFrame(rafId);
  }

  /* -------- Latency phase ------------------------------------------------ */
  async function doPing() {
    setPhase("Latency", "running");
    UI.status.textContent = "Measuring round-trip latency…";
    resetGauge();

    const samples = [];
    for (let i = 0; i < PING_COUNT; i++) {
      const t0 = performance.now();
      const res = await fetch(PING, { cache: "no-store", credentials: "omit" });
      const t1 = performance.now();
      if (!res.ok) throw new Error("Ping failed: HTTP " + res.status);
      samples.push(t1 - t0);

      const runningAvg = samples.reduce((a, b) => a + b, 0) / samples.length;
      setLatencyOnGauge({ avg: runningAvg });
    }

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((sum, x) => sum + (x - avg) ** 2, 0) / samples.length;

    const result = {
      min: Math.min(...samples),
      avg,
      max: Math.max(...samples),
      jit: Math.sqrt(variance),
    };

    UI.latMin.textContent = fmt2(result.min);
    UI.latAvg.textContent = fmt2(result.avg);
    UI.latMax.textContent = fmt2(result.max);
    UI.latJit.textContent = fmt2(result.jit);

    setLatencyOnGauge(result);
    return result;
  }

  // crypto.getRandomValues caps at 65536 bytes/call, so fill in 64 KiB slices.
  function makeUploadChunk(size) {
    const c = new Uint8Array(size), MAX = 65536;
    for (let off = 0; off < size; off += MAX) crypto.getRandomValues(c.subarray(off, Math.min(off + MAX, size)));
    return c;
  }

  /* -------- Transfer phase (download + upload) --------------------------
   * Saturates the link with STREAMS parallel TCP streams (a single stream is
   * capped by the bandwidth-delay product and under-reads on fast/high-latency
   * links). A WARMUP_MS window is discarded so TCP slow-start is excluded and
   * the result reflects steady-state throughput. */
  async function doTransfer({ label, endpoint, deadline, isUpload, onLive }) {
    setPhase(label, "running");
    UI.status.textContent = isUpload
      ? `Pushing bytes upstream (\u00d7${STREAMS})\u2026`
      : `Pulling random bytes (\u00d7${STREAMS})\u2026`;
    resetGauge();

    const chunk = isUpload ? makeUploadChunk(CHUNK_SIZE) : null;
    const start = performance.now();
    let total = 0, measured = 0, measureStart = 0, lastPaint = 0;

    function account(bytes) {
      const now = performance.now();
      total += bytes;
      if (!measureStart && now - start >= WARMUP_MS) { measureStart = now; measured = 0; }
      if (measureStart) measured += bytes;
      if (now - lastPaint >= 80) {
        lastPaint = now;
        const base = measureStart || start;
        const secs = Math.max(1e-6, (now - base) / 1000);
        const mbps = ((measureStart ? measured : total) * 8) / (secs * 1e6);
        setGauge(mbps, isUpload ? "uploading\u2026" : "downloading\u2026");
        if (onLive) onLive(mbps);
      }
    }

    async function worker() {
      while (performance.now() < deadline) {
        if (isUpload) {
          await fetch(endpoint, { method: "POST", cache: "no-store", credentials: "omit",
            headers: { "Content-Type": "application/octet-stream" }, body: chunk }).catch(() => {});
          account(CHUNK_SIZE);
        } else {
          try {
            const res = await fetch(`${endpoint}?size=${DOWNLOAD_SIZE}`, { cache: "no-store", credentials: "omit" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const reader = res.body.getReader();
            for (;;) { const { done, value } = await reader.read(); if (done) break; account(value.byteLength); }
          } catch (e) { /* keep the remaining streams going */ }
        }
      }
    }

    await Promise.all(Array.from({ length: STREAMS }, worker));
    const base = measureStart || start;
    const secs = Math.max(1e-6, (performance.now() - base) / 1000);
    const mbps = ((measureStart ? measured : total) * 8) / (secs * 1e6);
    setGauge(mbps, "complete");
    return mbps;
  }

  /* -------- Orchestration ------------------------------------------------- */
  async function runFullTest() {
    UI.startBtn.disabled = true;
    UI.startBtn.dataset.running = "true";
    UI.startBtn.querySelector(".btn-label").textContent = "Testing…";

    try {
      await doPing();

      const dlDeadline = performance.now() + PHASE_TIME_MS;
      const stopDlTimer = driveTimer(dlDeadline);
      const dlMbps = await doTransfer({
        label: "Download",
        endpoint: DL,
        deadline: dlDeadline,
        isUpload: false,
        onLive: (live) => {
          const { value, unit } = formatSpeed(live);
          UI.dlVal.textContent = value;
          UI.dlSub.textContent = `LIVE · ${unit}`;
        },
      });
      stopDlTimer();
      UI.dlVal.textContent = formatSpeed(dlMbps).value;
      UI.dlSub.textContent = `FINAL · ${formatSpeed(dlMbps).unit}`;

      const ulDeadline = performance.now() + PHASE_TIME_MS;
      const stopUlTimer = driveTimer(ulDeadline);
      const ulMbps = await doTransfer({
        label: "Upload",
        endpoint: UL,
        deadline: ulDeadline,
        isUpload: true,
        onLive: (live) => {
          const { value, unit } = formatSpeed(live);
          UI.ulVal.textContent = value;
          UI.ulSub.textContent = `LIVE · ${unit}`;
        },
      });
      stopUlTimer();
      UI.ulVal.textContent = formatSpeed(ulMbps).value;
      UI.ulSub.textContent = `FINAL · ${formatSpeed(ulMbps).unit}`;

      setPhase("Done", "done");
      UI.status.textContent = "Test complete. Press Start Test to run again.";
      UI.timer.textContent = "";
      // Return the gauge to its initial "Ready" configuration once the run
      // finishes — the per-phase result panels below already carry the
      // download / upload numbers, so the gauge is the wrong place to pin
      // a single phase's value.
      resetGauge();

      await fetch(RES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "omit",
        body: JSON.stringify({
          latency: {
            min: parseFloat(UI.latMin.textContent),
            avg: parseFloat(UI.latAvg.textContent),
            max: parseFloat(UI.latMax.textContent),
            jit: parseFloat(UI.latJit.textContent),
          },
          download: dlMbps,
          upload: ulMbps,
          ts: Date.now(),
        }),
      });

      showSpeedtestReport(dlMbps, ulMbps);
    } catch (err) {
      console.error(err);
      setPhase("Error", "error");
      UI.status.textContent = "Speed test error: " + err.message;
    } finally {
      UI.startBtn.disabled = false;
      UI.startBtn.dataset.running = "false";
      UI.startBtn.querySelector(".btn-label").textContent = "Start Test";
    }
  }

  function showSpeedtestReport(dlMbps, ulMbps) {
    if (!window.ApenReport) return;
    function clsLow(metric, val) {
      if (val == null || !isFinite(val)) return "unknown";
      const t = { rtt_ms: [100, 250], jitter_ms: [20, 50] }[metric];
      if (val <= t[0]) return "good";
      if (val <= t[1]) return "degraded";
      return "unhealthy";
    }
    const avg = parseFloat(UI.latAvg.textContent), mn = parseFloat(UI.latMin.textContent),
          mx = parseFloat(UI.latMax.textContent), jit = parseFloat(UI.latJit.textContent);
    const sLat = clsLow("rtt_ms", avg), sJit = clsLow("jitter_ms", jit);
    const rank = { good: 0, degraded: 1, unhealthy: 2 };
    let verdict = "good";
    [sLat, sJit].forEach((x) => { if (x in rank && rank[x] > rank[verdict]) verdict = x; });
    const rows = [
      { metric: "Latency (avg)", value: `${fmt2(avg)} ms (min ${fmt2(mn)} / max ${fmt2(mx)})`, status: sLat },
      { metric: "Jitter", value: `${fmt2(jit)} ms`, status: sJit },
      { metric: "Download", value: `${fmt2(dlMbps)} Mbps`, status: isFinite(dlMbps) && dlMbps > 0 ? "good" : "unknown" },
      { metric: "Upload", value: `${fmt2(ulMbps)} Mbps`, status: isFinite(ulMbps) && ulMbps > 0 ? "good" : "unknown" },
    ];
    window.ApenReport.show({
      title: "APEN Speed Test \u2014 result",
      subtitle: `This browser \u2194 Speed Test server \u00b7 ${new Date().toLocaleString()}`,
      overall: verdict,
      sections: [{ name: "This browser \u2194 Speed Test server", verdict, rows }],
      footnote: "Latency and jitter are classified against VTC-tuned thresholds (RTT good \u2264100 ms / degraded \u2264250 ms; jitter good \u226420 ms / degraded \u226450 ms). Download and upload are raw measured throughput in Mbps (megabits per second \u2014 bits, not bytes; divide by 8 for MB/s).",
    });
  }

  UI.startBtn.addEventListener("click", runFullTest);
})();
