export const TAILSCAN_COLOR_FAMILIES = [
  'cyan',
  'emerald',
  'sky',
  'violet',
  'amber',
  'rose',
  'teal',
  'orange',
  'fuchsia',
  'indigo',
  'green',
  'purple',
  'red',
  'lime',
  'yellow',
  'blue',
  'pink',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
] as const

export const CARD_GLOW_SHADES = ['500', '400', '600', '300', '700'] as const

export type TailscanColorFamily = (typeof TAILSCAN_COLOR_FAMILIES)[number]
export type TailscanColorShade = (typeof CARD_GLOW_SHADES)[number]
export type GlowColorName = TailscanColorFamily | `${TailscanColorFamily}-${TailscanColorShade}`

export const CARD_GLOW_PALETTE = CARD_GLOW_SHADES.flatMap((shade) =>
  TAILSCAN_COLOR_FAMILIES.map((family) => `${family}-${shade}` as const)
)

interface FamilyColorMeta {
  hue: number
  chroma: number
}

interface ShadeColorMeta {
  lightness: number
  shadowLightness: number
  chromaScale: number
  spotlightSpread: number
}

export interface CardColorDefinition {
  hue: [number, number]
  from: string
  to: string
  via: string
}

// Hue + chroma are the exact Tailwind v4 OKLCH values for each family's 500
// shade (https://tailwindcss.com/docs/colors). The card's own SHADE_META curve
// supplies the lightness for the glow, so glows render as true Tailwind hues.
const FAMILY_META: Record<TailscanColorFamily, FamilyColorMeta> = {
  cyan:    { hue: 215.221, chroma: 0.143 },
  emerald: { hue: 162.48,  chroma: 0.17 },
  sky:     { hue: 237.323, chroma: 0.169 },
  violet:  { hue: 292.717, chroma: 0.25 },
  amber:   { hue: 70.08,   chroma: 0.188 },
  rose:    { hue: 16.439,  chroma: 0.246 },
  teal:    { hue: 182.503, chroma: 0.14 },
  orange:  { hue: 47.604,  chroma: 0.213 },
  fuchsia: { hue: 322.15,  chroma: 0.295 },
  indigo:  { hue: 277.117, chroma: 0.233 },
  green:   { hue: 149.579, chroma: 0.219 },
  purple:  { hue: 303.9,   chroma: 0.265 },
  red:     { hue: 25.331,  chroma: 0.237 },
  lime:    { hue: 130.85,  chroma: 0.233 },
  yellow:  { hue: 86.047,  chroma: 0.184 },
  blue:    { hue: 259.815, chroma: 0.214 },
  pink:    { hue: 354.308, chroma: 0.241 },
  slate:   { hue: 257.417, chroma: 0.046 },
  gray:    { hue: 264.364, chroma: 0.027 },
  zinc:    { hue: 285.938, chroma: 0.016 },
  neutral: { hue: 0,       chroma: 0 },
  stone:   { hue: 58.071,  chroma: 0.013 },
}

const SHADE_META: Record<TailscanColorShade, ShadeColorMeta> = {
  '300': { lightness: 0.86, shadowLightness: 0.48, chromaScale: 0.82, spotlightSpread: 12 },
  '400': { lightness: 0.78, shadowLightness: 0.40, chromaScale: 1.00, spotlightSpread: 14 },
  '500': { lightness: 0.70, shadowLightness: 0.34, chromaScale: 1.00, spotlightSpread: 16 },
  '600': { lightness: 0.61, shadowLightness: 0.29, chromaScale: 0.90, spotlightSpread: 13 },
  '700': { lightness: 0.52, shadowLightness: 0.24, chromaScale: 0.78, spotlightSpread: 10 },
}

function splitGlowColor(color: GlowColorName): { family: TailscanColorFamily; shade: TailscanColorShade } {
  const [family, shade] = color.split('-') as [TailscanColorFamily, TailscanColorShade | undefined]

  if (family in FAMILY_META && shade && shade in SHADE_META) {
    return { family, shade }
  }

  if (family in FAMILY_META) {
    return { family, shade: '500' }
  }

  return { family: 'cyan', shade: '500' }
}

export function getCardColorDefinition(color: GlowColorName): CardColorDefinition {
  const { family, shade } = splitGlowColor(color)
  const familyMeta = FAMILY_META[family]
  const shadeMeta = SHADE_META[shade]
  const chroma = familyMeta.chroma * shadeMeta.chromaScale

  return {
    hue: [familyMeta.hue - 8, familyMeta.hue + 8],
    from: `oklch(${shadeMeta.lightness} ${chroma} ${familyMeta.hue} / 0.72)`,
    to: `oklch(${shadeMeta.shadowLightness} ${chroma * 0.75} ${familyMeta.hue} / 0.52)`,
    via: 'transparent',
  }
}

export function getGlowSpotlightDefinition(color: GlowColorName): { base: number; spread: number } {
  const { family, shade } = splitGlowColor(color)
  const familyMeta = FAMILY_META[family]
  const shadeMeta = SHADE_META[shade]

  return {
    base: familyMeta.hue,
    spread: shadeMeta.spotlightSpread,
  }
}

export function getCardGlowColor(index: number, offset = 0): GlowColorName {
  const normalized = ((index + offset) % CARD_GLOW_PALETTE.length + CARD_GLOW_PALETTE.length) % CARD_GLOW_PALETTE.length
  return CARD_GLOW_PALETTE[normalized]
}

export function getUniqueCardGlowColors(count: number, offset = 0): GlowColorName[] {
  if (count > CARD_GLOW_PALETTE.length) {
    throw new Error(`Requested ${count} card colors, but only ${CARD_GLOW_PALETTE.length} unique colors are available.`)
  }

  return Array.from({ length: count }, (_, index) => getCardGlowColor(index, offset))
}
