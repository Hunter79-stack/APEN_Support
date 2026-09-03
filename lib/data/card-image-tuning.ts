/**
 * Single source of truth for per-card image tuning.
 *
 * To adjust the position, size, or chrome of any card's logo image
 * site-wide, add or edit an entry below keyed by the EXACT card title.
 * You do not need to touch HoverRevealCard.tsx, LinksGrid.tsx, or any
 * data file — just this file.
 *
 * Hot-reload tip: run `npm run dev` (not `npm run build`) while
 * tweaking. Saved changes appear in the browser within ~1 second —
 * no manual rebuild required.
 *
 * Keys: the card's `title` prop. The lookup is case-sensitive and an
 * exact string match.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                  THE THREE KNOBS — what each does                ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║   imageClassName         the <img> itself — its SIZE and FIT     ║
 * ║                          (how big the logo is inside the card)   ║
 * ║                                                                  ║
 * ║   shellClassName         the box AROUND the image — its size,    ║
 * ║                          rounding, border, background colour     ║
 * ║                                                                  ║
 * ║   imageWrapperClassName  WHERE the image sits inside the card —  ║
 * ║                          top/bottom/left/right anchoring         ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * ───────────────────────────────────────────────────────────────────
 *                       QUICK RECIPES (copy-paste)
 * ───────────────────────────────────────────────────────────────────
 *
 * ── SIZE ─────────────────────────────────────────────────────
 *
 *   // Bigger image (less padding around it):
 *   { imageClassName: 'p-1' }
 *
 *   // Smaller image (more padding):
 *   { imageClassName: 'p-8' }
 *
 *   // No padding — logo bleeds to the card edges:
 *   { imageClassName: 'p-0' }
 *
 *
 * ── POSITION inside the card ─────────────────────────────────
 *
 *   // Top-align the logo:
 *   { imageWrapperClassName: 'items-start' }
 *
 *   // Bottom-align:
 *   { imageWrapperClassName: 'items-end' }
 *
 *   // Left-align (default is centred):
 *   { imageWrapperClassName: 'justify-start' }
 *
 *   // Right-align:
 *   { imageWrapperClassName: 'justify-end' }
 *
 *   // Nudge down from the top by 1.5rem:
 *   { imageWrapperClassName: 'items-start pt-6' }
 *
 *
 * ── HOW THE IMAGE FILLS ITS SPACE ────────────────────────────
 *
 *   // Default is `object-contain` — preserves aspect ratio.
 *   // Override to crop-fit (logo edges may be cut off):
 *   { imageClassName: 'object-cover' }
 *
 *   // Stretch to fill (distorts non-square logos):
 *   { imageClassName: 'object-fill' }
 *
 *   // Slight zoom on hover, image still contained:
 *   { imageClassName: 'scale-105' }
 *
 *
 * ── ADD A BACKDROP BEHIND THE LOGO ───────────────────────────
 *
 *   // Subtle dark backdrop on the shell:
 *   { shellClassName: 'bg-white/5 rounded-2xl' }
 *
 *   // Coloured tint matching the logo's brand:
 *   { shellClassName: 'bg-cyan-500/10 rounded-2xl' }
 *
 *   // Circle frame around a square logo:
 *   { shellClassName: 'bg-white/5 rounded-full' }
 *
 *
 * ── COMBINING MULTIPLE TWEAKS ────────────────────────────────
 *
 *   // Top-left logo, tight padding, dark backdrop:
 *   {
 *     imageWrapperClassName: 'items-start justify-start pt-4 pl-4',
 *     shellClassName:        'bg-white/5 rounded-xl',
 *     imageClassName:        'p-2',
 *   }
 *
 *   // Big centred logo with no background, no padding:
 *   {
 *     imageClassName: 'p-0 scale-110',
 *   }
 *
 * ───────────────────────────────────────────────────────────────────
 *
 * Explicit props passed to HoverRevealCard at a call site still win
 * over the values here — but in practice almost nothing passes these
 * directly, so this file is the practical single location.
 */

export interface CardImageTuning {
  /** Tailwind classes for the `<img>` element itself.
   *  Use to change the logo's size, padding, scale, or object-fit. */
  imageClassName?: string
  /** Tailwind classes for the box (shell) around the image.
   *  Use to add a background colour, border, or rounded corners. */
  shellClassName?: string
  /** Tailwind classes for the flex wrapper around the shell.
   *  Use to anchor the logo to a side/corner of the card. */
  imageWrapperClassName?: string
}

export const CARD_IMAGE_TUNING: Record<string, CardImageTuning> = {

  /* ────────────────────────────────────────────────────────────
   * /home → "Where should I start?"
   * ──────────────────────────────────────────────────────────── */
  // 'Solve a known problem':       {},


  /* ────────────────────────────────────────────────────────────
   * /home → Operational Services
   * ──────────────────────────────────────────────────────────── */
  // 'APEN Service Catalog':        {},
  // Tenable iris: white-stroke Lottie animation sits directly on the dark
  // card (no tile) — see LOGOS.tenableIris / LottieMark.
  // 'Tenable Security Center':     {},
  // 'APEN Voltron':                {},


  /* ────────────────────────────────────────────────────────────
   * /home → Quick Links Library
   * ──────────────────────────────────────────────────────────── */
  // 'OS & Application Documents':  {},
  // 'Linux Repositories':          {},
  // 'Software & ISOs':             {},
  // 'VMware Products':             {},
  // 'Evaluate-STIG':               {},
  // 'Video Guides':                {},
  // 'PDQ Deploy & Inventory':      {},
  // 'Microsoft Products':          {},
  // 'Trellix for Linux (CUI)':     {},
  // 'Visual Studio Products':      {},


  /* ────────────────────────────────────────────────────────────
   * Other pages (Trellix, VMware, ISOs, etc.)
   * ────────────────────────────────────────────────────────────
   * Add entries by exact card title from anywhere on the site.
   * The lookup is global — one entry tunes that card on every page
   * it appears.
   */
}

/** Returns tuning for a given card title, or an empty object. */
export function getCardImageTuning(title: string): CardImageTuning {
  return CARD_IMAGE_TUNING[title] ?? {}
}
