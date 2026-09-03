/* ===========================================================================
 * report_popup.js — APEN shared result-report popup.
 *
 * Self-contained (injects its own glass-themed styles, no dependencies).
 * Renders a structured report — modelled on sample_report.html (verdict badge,
 * Metric / Value / Status tables, thresholds footnote) — inside a modal, with:
 *   • An (i) info bubble next to every metric: hover/focus shows a concise
 *     explanation of what that metric means (from a built-in glossary, or a
 *     per-row `tip` override).
 *   • "Copy report" : rich HTML table + plain-text fallback (paste into a doc).
 *   • "Copy CSV"    : comma-separated values (paste into a spreadsheet).
 *
 * Usage:  window.ApenReport.show({
 *   title, subtitle, overall, footnote,
 *   sections: [{ name, verdict, headline, rows: [{metric, value, status, tip?}] }]
 * });
 * `status`/`verdict`/`overall` ∈ good | degraded | unhealthy | unknown.
 * ======================================================================== */
(function (global) {
  "use strict";

  var STYLE_ID = "apen-report-style";

  // Concise, plain-language explanations keyed by exact metric label. A row may
  // override with its own `tip`. Anything not found simply gets no bubble.
  var GLOSSARY = {
    // -- latency / jitter / loss --
    "RTT — average": "Round-trip time: how long a small request takes to reach the server and return, averaged over the samples. Lower is better — it sets the floor for responsiveness.",
    "RTT — min / max": "The fastest and slowest round trips observed. A wide gap between them points to an unstable, variable path.",
    "Jitter (mean deviation)": "Average variation between consecutive round-trip times. High jitter makes audio/video choppy even when the average latency looks fine.",
    "RTT — 95th percentile": "95% of round trips were at or below this value — a worst-case latency figure that ignores rare outliers.",
    "Packet loss": "Percentage of probe requests that got no reply. Even a little loss badly degrades real-time media like calls.",
    // -- bufferbloat --
    "Baseline RTT (unloaded)": "Round-trip time measured while the link is idle — the reference point for the loaded figures below.",
    "RTT under download load": "Round-trip time measured while the connection is saturated downloading. Big increases mean downloads will disrupt calls.",
    "RTT under upload load": "Round-trip time while saturating the upload. Uploads (e.g. screen-share, backups) often cause the worst latency spikes.",
    "Added latency under load": "How much latency rises when the link is busy versus idle. This 'bufferbloat' is the main cause of lag during transfers.",
    "Bufferbloat grade": "An A–F rating of the latency increase under load (A ≈ none, F ≥ 200 ms added). Less added latency means better real-time performance.",
    // -- throughput --
    "Download throughput": "Measured download speed, server to this browser, in Mbps = MEGABITS per second (lowercase b = bits, not bytes). Divide by 8 for MB/s (megabytes).",
    "Upload throughput": "Measured upload speed, this browser to the server, in Mbps = MEGABITS per second (bits, not bytes; ÷8 for MB/s). Often far lower than download and critical for video calls.",
    // -- video sim --
    "Sustained rate (target 4 Mbps)": "Throughput achieved while emulating a 4 Mbps HD video-call stream. Falling short of the target predicts a degraded picture.",
    "Late / lost frames": "Share of emulated video packets that arrived too late or not at all — these become dropped frames and visible artifacts.",
    // -- voice sim --
    "Sustained rate (target 128 kbps)": "Throughput achieved while emulating a 128 kbps voice stream. Voice needs little bandwidth but is very sensitive to timing.",
    "Late / lost packets": "Share of emulated voice packets arriving too late or not at all — heard as dropouts or garbled speech.",
    "Inter-packet jitter": "Timing variation between consecutive emulated stream packets. High jitter causes freezing, pixelation and robotic audio.",
    // -- stability --
    "Samples": "How many latency probes were collected during the stability window, and over what period.",
    "Latency spikes (> 2× median)": "Number of probes whose round trip was more than twice the typical value — momentary slowdowns that disrupt live media.",
    "Dropouts (timeouts)": "Number of probes that timed out entirely — brief connection drops. Any dropouts are bad for calls.",
    "Stability grade": "Overall verdict on connection steadiness (Stable / Variable / Unstable), derived from jitter, spikes and dropouts.",
    // -- speed test --
    "Latency (avg)": "Average round-trip time to the server and back. Lower is more responsive.",
    "Jitter": "Variation in round-trip time between pings. High jitter hurts calls, conferencing and gaming.",
    "Download": "Measured download speed, server to this browser. Mbps = MEGABITS per second (lowercase b = bits, not bytes). Divide by 8 for MB/s (megabytes).",
    "Upload": "Measured upload speed, this browser to the server. Mbps = MEGABITS per second (bits, not bytes; ÷8 for MB/s)."
  };

  var CSS = [
    ".apen-ov{position:fixed;inset:0;z-index:99999;background:rgba(3,5,12,.66);",
    "backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;",
    "align-items:flex-start;justify-content:center;overflow:auto;padding:32px 16px}",
    ".apen-modal{max-width:760px;width:100%;color:#e6edf3;line-height:1.6;font-size:14px;",
    "font-family:'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;",
    "border-radius:16px;border:1px solid rgba(255,255,255,.1);",
    "background:linear-gradient(180deg,#12172a,#0a0c16);box-shadow:0 40px 100px rgba(0,0,0,.6)}",
    ".apen-rpt{padding:22px 24px}",
    ".apen-head{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap}",
    ".apen-head h2{font-size:1.15rem;margin:0;background:linear-gradient(90deg,#e6edf3,#9fb0c8);",
    "-webkit-background-clip:text;background-clip:text;color:transparent}",
    ".apen-actions{display:flex;align-items:center;gap:.5rem}",
    ".apen-btn{appearance:none;cursor:pointer;font:inherit;font-weight:600;font-size:.8rem;color:#05060a;",
    "border:none;border-radius:9px;padding:.45rem .8rem;background:linear-gradient(135deg,#22d3ee,#818cf8 60%,#f472b6)}",
    ".apen-btn:disabled{opacity:.7;cursor:default}",
    ".apen-x{appearance:none;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.18);",
    "color:#93a3bd;border-radius:8px;width:32px;height:32px;font-size:1.1rem;line-height:1}",
    ".apen-meta{color:#93a3bd;font-size:.85rem;margin:.5rem 0 0}",
    ".apen-verdict{color:#93a3bd;font-size:.85rem;margin:.8rem 0 1.1rem}",
    ".apen-badge,.apen-pill{display:inline-flex;align-items:center;border-radius:999px;font-weight:700;",
    "text-transform:uppercase;border:1px solid currentColor}",
    ".apen-badge{padding:.2rem .65rem;font-size:.7rem;letter-spacing:.08em}",
    ".apen-pill{padding:.12rem .55rem;font-size:.66rem;letter-spacing:.05em}",
    ".apen-p-good{color:#34d399}.apen-p-degraded{color:#fbbf24}.apen-p-unhealthy{color:#f87171}.apen-p-unknown{color:#818cf8}",
    ".apen-card{border-radius:14px;padding:1.1rem 1.2rem;margin:0 0 1.1rem;",
    "background:linear-gradient(180deg,rgba(18,22,36,.7),rgba(10,12,22,.78));border:1px solid rgba(255,255,255,.08)}",
    ".apen-card h3{font-size:1rem;margin:0 0 .3rem;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;color:#f3f7ff}",
    ".apen-headline{color:#93a3bd;font-size:.83rem;margin:.1rem 0 .8rem}",
    ".apen-tbl{width:100%;border-collapse:collapse;font-size:.85rem}",
    ".apen-tbl th,.apen-tbl td{text-align:left;padding:.5rem .55rem;border-bottom:1px solid rgba(255,255,255,.08)}",
    ".apen-tbl th{color:#93a3bd;font-weight:600;font-size:.66rem;text-transform:uppercase;letter-spacing:.1em}",
    ".apen-tbl td{color:#e6edf3}",
    ".apen-tbl .num{text-align:right;font-variant-numeric:tabular-nums;color:#cdd6e6;white-space:nowrap}",
    ".apen-foot{color:#7a8aa3;font-size:.76rem;border-top:1px solid rgba(255,255,255,.08);",
    "padding-top:.9rem;margin-top:.2rem;line-height:1.7}",
    // info bubble + tooltip
    ".apen-info{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;",
    "margin-left:7px;border-radius:50%;border:1px solid currentColor;color:#7f8db0;font-size:10px;",
    "font-weight:700;font-style:normal;line-height:1;cursor:help;position:relative;vertical-align:middle}",
    ".apen-info:hover,.apen-info:focus{color:#22d3ee;outline:none}",
    ".apen-tip{position:absolute;bottom:150%;left:50%;transform:translateX(-50%);width:max-content;",
    "max-width:240px;white-space:normal;text-align:left;background:#0a0c16;color:#cdd6e6;",
    "border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:.5rem .6rem;font-size:.72rem;",
    "font-weight:400;line-height:1.45;letter-spacing:0;text-transform:none;box-shadow:0 14px 34px rgba(0,0,0,.55);",
    "opacity:0;visibility:hidden;transition:opacity .12s ease;z-index:6;pointer-events:none}",
    ".apen-tip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);",
    "border:5px solid transparent;border-top-color:#0a0c16}",
    ".apen-info:hover .apen-tip,.apen-info:focus .apen-tip{opacity:1;visibility:visible}"
  ].join("");

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cls(s) { return "apen-p-" + (s || "unknown"); }

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function infoIcon(tip) {
    return '<span class="apen-info" tabindex="0" role="note" aria-label="' + esc(tip) + '">' +
           '<span class="apen-tip">' + esc(tip) + '</span>i</span>';
  }

  function worstOf(data) {
    var rank = { good: 0, degraded: 1, unhealthy: 2 }, w = -1, val = null;
    (data.sections || []).forEach(function (sec) {
      (sec.rows || []).forEach(function (r) {
        if (r.status in rank && rank[r.status] > w) { w = rank[r.status]; val = r.status; }
      });
    });
    return val;
  }

  function tableHTML(rows) {
    var h = '<table class="apen-tbl"><thead><tr><th>Metric</th><th class="num">Value</th><th>Status</th></tr></thead><tbody>';
    (rows || []).forEach(function (r) {
      var tip = r.tip || GLOSSARY[r.metric];
      h += '<tr><td>' + esc(r.metric) + (tip ? infoIcon(tip) : '') + '</td><td class="num">' + esc(r.value) +
           '</td><td><span class="apen-pill ' + cls(r.status) + '">' + esc(r.status || "—") + '</span></td></tr>';
    });
    return h + '</tbody></table>';
  }

  function buildHTML(data) {
    var overall = data.overall || worstOf(data);
    var h = '<div class="apen-rpt"><div class="apen-head"><h2>' + esc(data.title || "Report") + '</h2>' +
            '<div class="apen-actions">' +
            '<button class="apen-btn" data-doc>Copy report</button>' +
            '<button class="apen-btn" data-csv>Copy CSV</button>' +
            '<button class="apen-x" data-x aria-label="Close">×</button></div></div>';
    if (data.subtitle) h += '<div class="apen-meta">' + esc(data.subtitle) + '</div>';
    if (overall) h += '<div class="apen-verdict">Overall verdict: <span class="apen-badge ' + cls(overall) + '">' + esc(overall) + '</span></div>';
    (data.sections || []).forEach(function (sec) {
      h += '<div class="apen-card"><h3>' + esc(sec.name) +
           (sec.verdict ? ' <span class="apen-badge ' + cls(sec.verdict) + '">' + esc(sec.verdict) + '</span>' : '') + '</h3>';
      if (sec.headline) h += '<div class="apen-headline">' + esc(sec.headline) + '</div>';
      h += tableHTML(sec.rows);
      h += '</div>';
    });
    if (data.footnote) h += '<div class="apen-foot">' + esc(data.footnote) + '</div>';
    return h + '</div>';
  }

  function matrix(data) {
    var rows = [["Section", "Metric", "Value", "Status"]];
    (data.sections || []).forEach(function (sec) {
      (sec.rows || []).forEach(function (r) {
        rows.push([sec.name || "", r.metric || "", String(r.value == null ? "" : r.value), r.status || ""]);
      });
    });
    return rows;
  }
  function toCSV(data) {
    return matrix(data).map(function (row) {
      return row.map(function (c) {
        c = String(c == null ? "" : c);
        return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(",");
    }).join("\r\n");
  }
  function toTSV(data) {
    var lines = [];
    if (data.title) lines.push(data.title);
    if (data.subtitle) lines.push(data.subtitle);
    if (lines.length) lines.push("");
    matrix(data).forEach(function (row) { lines.push(row.join("\t")); });
    if (data.footnote) { lines.push(""); lines.push(data.footnote); }
    return lines.join("\n");
  }
  function toRichHTML(data) {
    var cap = (data.title ? "<p><b>" + esc(data.title) + "</b></p>" : "") +
              (data.subtitle ? "<p>" + esc(data.subtitle) + "</p>" : "");
    var h = '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">';
    h += "<tr><th>Section</th><th>Metric</th><th>Value</th><th>Status</th></tr>";
    matrix(data).slice(1).forEach(function (r) {
      h += "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td><td>" + esc(r[2]) + "</td><td>" + esc(r[3]) + "</td></tr>";
    });
    h += "</table>";
    return cap + h;
  }

  function flash(btn, msg) {
    var t = btn.textContent; btn.textContent = msg; btn.disabled = true;
    setTimeout(function () { btn.textContent = t; btn.disabled = false; }, 1400);
  }
  function fallback(text, btn) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy"); ta.remove(); flash(btn, "Copied ✓");
    } catch (e) { flash(btn, "Copy failed"); }
  }
  function copyDoc(data, btn) {
    var html = toRichHTML(data), text = toTSV(data);
    if (global.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      try {
        var item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        });
        navigator.clipboard.write([item]).then(function () { flash(btn, "Copied ✓"); },
                                               function () { fallback(text, btn); });
        return;
      } catch (e) { /* fall through */ }
    }
    fallback(text, btn);
  }
  function copyCsv(data, btn) {
    var csv = toCSV(data);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(csv).then(function () { flash(btn, "CSV copied ✓"); },
                                              function () { fallback(csv, btn); });
    } else { fallback(csv, btn); }
  }

  function show(data) {
    inject();
    var ov = document.createElement("div"); ov.className = "apen-ov";
    var modal = document.createElement("div"); modal.className = "apen-modal";
    modal.innerHTML = buildHTML(data);
    ov.appendChild(modal); document.body.appendChild(ov);
    function close() { ov.remove(); document.removeEventListener("keydown", onkey); }
    function onkey(e) { if (e.key === "Escape") close(); }
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    modal.querySelector("[data-x]").addEventListener("click", close);
    modal.querySelector("[data-doc]").addEventListener("click", function () { copyDoc(data, this); });
    modal.querySelector("[data-csv]").addEventListener("click", function () { copyCsv(data, this); });
    document.addEventListener("keydown", onkey);
    return { close: close };
  }

  global.ApenReport = { show: show, glossary: GLOSSARY };
})(window);
