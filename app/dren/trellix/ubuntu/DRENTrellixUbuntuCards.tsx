/**
 * Compatibility re-export — the canonical implementation lives at
 *   app/dren/trellix/DRENTrellixUbuntuCards.tsx
 *
 * This file used to hold a duplicated copy of the Ubuntu Trellix cards,
 * which drifted from the parent over time (different ring/shadow styling,
 * etc). The page that imported it now imports from `../` instead; this
 * file is preserved as a shim so any external link or stale build artifact
 * that still resolves to this path keeps working until the next full clean.
 *
 * Safe to delete once nothing imports from this path.
 */
export { DRENTrellixUbuntuCards } from '../DRENTrellixUbuntuCards'
