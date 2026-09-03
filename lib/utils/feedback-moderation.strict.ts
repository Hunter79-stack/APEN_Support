export type FeedbackModerationSeverity = 'clear' | 'review' | 'blocked'

export interface FeedbackModerationResult {
  flagged: boolean
  severity: FeedbackModerationSeverity
  score: number
  reasons: string[]
  guidance: string
}

interface ModerationRule {
  reason: string
  severity: Exclude<FeedbackModerationSeverity, 'clear'>
  score: number
  pattern: RegExp
}

const CHARACTER_SUBSTITUTIONS: Array<[RegExp, string]> = [
  [/[4@]/g, 'a'],
  [/[3]/g, 'e'],
  [/[!1|]/g, 'i'],
  [/[0]/g, 'o'],
  [/[5$]/g, 's'],
  [/[7]/g, 't'],
]

const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g
const OBFUSCATION_GAP = String.raw`[\s._*~|"’‘-]*`

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Builds a stricter word pattern that catches common bypass attempts:
 * - stupid
 * - stuuupid
 * - s t u p i d
 * - s-t-u-p-i-d
 * - s_t_u_p_i_d
 */
function looseWord(word: string) {
  return escapeRegExp(word)
    .split('')
    .map((character) => `${character}+`)
    .join(OBFUSCATION_GAP)
}

function loosePhrase(phrase: string) {
  return phrase
    .trim()
    .split(/\s+/)
    .map(looseWord)
    .join(String.raw`[\s._*~|"’‘-]+`)
}

function looseAlternation(values: readonly string[]) {
  return values.map(loosePhrase).join('|')
}

/**
 * Single source of truth for every phrase the moderator flags. To tune
 * behavior, add or remove entries in the appropriate list — every rule
 * below pulls from this object. Phrases match case-insensitively and
 * tolerate spacing, repeated letters, and common character substitutions
 * (so `kys`, `k y s`, `k.y.s`, and `kyyyys` all hit the same entry).
 */
const PHRASE_LISTS = {
  directSelfHarm: [
    'kill yourself',
    'kys',
    'off yourself',
    'end yourself',
    'go die',
    'die already',
  ],
  violentActions: [
    'kill',
    'hurt',
    'harm',
    'attack',
    'stab',
    'shoot',
    'beat',
    'jump',
  ],
  threateningPursuit: [
    'come after',
    'come find',
    'coming for',
  ],
  threateningClaims: [
    'know where you live',
    'will find you',
    'am coming for you',
    'are coming for you',
  ],
  imperativeAttacks: [
    'shut up',
    'Bro Please',
    'Hey Bro',
  ],
  personalAttacks: [
    'idiot',
    'moron',
    'stupid',
    'worthless',
    'dumb',
    'loser',
    'clown',
    'pathetic',
    'garbage',
    'trash',
  ],
  harassingPhrases: [
    'asshat',
    'bag of dicks',
    'shut up',
    'you suck',
    'this bot sucks',
    'this is trash',
    'you are useless',
    'youre useless',
    'you are incompetent',
    'youre incompetent',
    'do your job',
    'nobody cares',
    'what is wrong with you',
    'are you even listening',
  ],
  profanity: [
    'ass',
    'dick',
    'motherfucker',
    'fuck',
    'fucking',
    'shit',
    'bullshit',
    'bitch',
    'asshole',
    'bastard',
    'wtf',
    'mf',
  ],
}

const THREAT_TARGETS = String.raw`(?:you|u|him|her|I|them|they|someone|people)`
const PERSON_TARGETS = String.raw`(?:owner|author|creator|developer|maintainer|admin|administrator|agent|support|staff|employee|person|people|team|he|she|they)`

const MODERATION_RULES: ModerationRule[] = [
  {
    reason: 'Self-harm command or violent directive',
    severity: 'blocked',
    score: 10,
    pattern: new RegExp(String.raw`\b(?:${looseAlternation(PHRASE_LISTS.directSelfHarm)})\b`, 'i'),
  },
  {
    reason: 'Threatening language',
    severity: 'blocked',
    score: 10,
    pattern: new RegExp(
      String.raw`\b(?:(?:(?:i|we)\s*(?:(?:will|ll|am|are|gonna|going|want|wanna|plan|planning|about)\s*){0,4})?(?:${looseAlternation(PHRASE_LISTS.violentActions)})\s*(?:${THREAT_TARGETS})|(?:${looseAlternation(PHRASE_LISTS.threateningPursuit)})\s*(?:${THREAT_TARGETS})|(?:i|we)\s*(?:${looseAlternation(PHRASE_LISTS.threateningClaims)}))\b`,
      'i',
    ),
  },
  {
    reason: 'Direct personal attack',
    severity: 'blocked',
    score: 6,
    pattern: new RegExp(
      String.raw`\b(?:(?:${looseAlternation(PHRASE_LISTS.imperativeAttacks)})|(?:(?:you|u|youre|ur|this|that)\s*(?:(?:are|r|is|look|looks|sound|sounds|seem|seems)\s*)?(?:(?:a|an)\s*)?(?:${looseAlternation(PHRASE_LISTS.personalAttacks)}))|(?:(?:${looseAlternation(PHRASE_LISTS.personalAttacks)})\s*(?:bot|agent|admin|support|person|people|team|you|u)))\b`,
      'i',
    ),
  },
  {
    reason: 'Personal attack',
    severity: 'review',
    score: 3,
    pattern: new RegExp(
      String.raw`\b(?:${PERSON_TARGETS})\s*(?:(?:is|are|looks?|sounds?|seems?)\s*)?(?:(?:a|an)\s*)?(?:${looseAlternation(PHRASE_LISTS.personalAttacks)})\b`,
      'i',
    ),
  },
  {
    reason: 'Harassing or abusive tone',
    severity: 'blocked',
    score: 5,
    pattern: new RegExp(String.raw`\b(?:${looseAlternation(PHRASE_LISTS.harassingPhrases)})\b`, 'i'),
  },
  {
    reason: 'Profanity',
    severity: 'blocked',
    score: 5,
    pattern: new RegExp(String.raw`\b(?:${looseAlternation(PHRASE_LISTS.profanity)})\b`, 'i'),
  },
]

export function normalizeFeedbackText(input: string) {
  let normalized = input
    .normalize('NFKD')
    .replace(ZERO_WIDTH_PATTERN, '')
    .replace(COMBINING_MARKS_PATTERN, '')
    .toLowerCase()
    .replace(/['`]/g, '')

  for (const [pattern, replacement] of CHARACTER_SUBSTITUTIONS) {
    normalized = normalized.replace(pattern, replacement)
  }

  return normalized
    .replace(/[_./\\]+/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function analyzeFeedbackContent(input: string): FeedbackModerationResult {
  const normalized = normalizeFeedbackText(input)

  if (!normalized) {
    return {
      flagged: false,
      severity: 'clear',
      score: 0,
      reasons: [],
      guidance: 'Enter feedback details to run the local AI reviewer.',
    }
  }

  const matches = MODERATION_RULES.filter((rule) => rule.pattern.test(normalized))
  const score = matches.reduce((total, rule) => total + rule.score, 0)
  const reasons = Array.from(new Set(matches.map((rule) => rule.reason)))
  const hasBlockedMatch = matches.some((rule) => rule.severity === 'blocked')

  const severity: FeedbackModerationSeverity = hasBlockedMatch
    ? 'blocked'
    : score >= 3
      ? 'review'
      : 'clear'

  const flagged = severity !== 'clear'

  return {
    flagged,
    severity,
    score,
    reasons,
    guidance:
      severity === 'blocked'
        ? 'This message was blocked because it contains threatening, abusive, harassing, or inappropriate language. Please revise the details before submitting.'
        : severity === 'review'
          ? 'Please revise the details before submitting. Keep the report focused on the issue, impact, and requested support.'
          : 'No offensive language detected by the local AI reviewer.',
  }
}
