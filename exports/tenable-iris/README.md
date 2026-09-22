# Tenable iris — animated mark export

The animated Tenable iris from the APEN support site, in two forms:

1. **Animated AVIF** (`tenable-iris.avif`) — a single next-gen image file.
   Drop it in an `<img>` tag like a GIF; no JavaScript, no player. AV1-encoded
   with a real alpha channel, 45 frames @ 30 fps, loops forever.
2. **Lottie vector** (`tenable-iris.json` + `lottie_light.min.js`) — the
   original infinitely-scalable form, as used on the APEN site.

**Important:** the mark is drawn with WHITE strokes (transparent background).
Place it on a dark background or it will be invisible.

## Files

| File                      | What it is                                                   |
|---------------------------|--------------------------------------------------------------|
| `tenable-iris.avif`       | Animated AVIF, 912×940 (2× retina), ~148 KB                  |
| `tenable-iris-small.avif` | Animated AVIF, 456×470, ~78 KB — for smaller placements      |
| `tenable-iris.json`       | Original Lottie animation (vector)                           |
| `lottie_light.min.js`     | Self-hosted Lottie SVG player                                |
| `demo.html`               | Double-click to preview both, side by side                   |
| `LottieMark.tsx`          | React component (from this site) if the new site is React/Next |

## Option A — animated AVIF (any site, one tag)

```html
<img src="/images/tenable-iris.avif" width="220" height="227"
     alt="Tenable Security Center">
```

Browser support: Chrome/Edge 85+, Firefox 113+, Safari 17.4+. Older browsers
show nothing, so for belt-and-braces use the Lottie as the primary (Option B/C)
or accept a static fallback:

```html
<picture>
  <source type="image/avif" srcset="/images/tenable-iris.avif">
  <img src="/images/tenable-iris-fallback.png" width="220" height="227"
       alt="Tenable Security Center">
</picture>
```

Note: animated AVIF is raster. At sizes above ~456 px CSS the full-size file
may soften; the Lottie stays sharp at any size.

## Option B — Lottie on a plain HTML site

Copy `tenable-iris.json` and `lottie_light.min.js` into the site, then:

```html
<div id="iris" style="width:220px;height:227px" role="img" aria-label="Tenable Security Center"></div>
<script src="/vendor/lottie_light.min.js"></script>
<script>
  lottie.loadAnimation({
    container: document.getElementById('iris'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: '/logos/tenable-iris.json',   // adjust to wherever you put it
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
  });
</script>
```

(`path:` is fetched over HTTP, so this form needs to be served by a web server.
`demo.html` inlines the JSON instead, which is why it works straight from disk.)

## Option C — Lottie on a React / Next.js site

Copy all three of `tenable-iris.json` (e.g. to `public/logos/`),
`lottie_light.min.js` (to `public/vendor/` — the component expects
`/vendor/lottie_light.min.js`), and `LottieMark.tsx`, then:

```tsx
<LottieMark
  src="/logos/tenable-iris.json"
  label="Tenable Security Center"
  className="h-24 w-24"
/>
```

The component lazy-loads the player only when the mark nears the viewport and
respects `prefers-reduced-motion` (settles on the final frame instead of looping).

## How the AVIF was made

Lottie frames rendered headlessly (lottie-web canvas renderer + jsdom +
@napi-rs/canvas, 45 transparent PNGs), then encoded with ffmpeg's libaom-av1
into the AVIF container (color stream + monochrome alpha stream, infinite
loop). The color plane is flooded solid white — all shape information lives in
the alpha plane, which is what keeps the file small. Re-render at any size by
re-running the same pipeline with a different scale.

## Licences and provenance

- `lottie_light.min.js` is lottie-web 5.12.2 (https://github.com/airbnb/lottie-web),
  MIT License, Copyright (c) 2015 Bodymovin — full text in `LICENSE-lottie-web.txt`.
  Keep that file next to the player wherever you copy it.
- The iris animation and the AVIF renders are Tenable, Inc. brand artwork. APEN
  uses it to identify Tenable Security Center; no permission for further
  redistribution has been recorded — confirm with Tenable before reusing it on
  another site.
- `LottieMark.tsx` and `demo.html` are APEN-authored (U.S. Government work).
