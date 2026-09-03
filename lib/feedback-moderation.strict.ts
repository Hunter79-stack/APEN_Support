/**
 * Canonical public entry point for feedback moderation.
 *
 * The implementation remains in `lib/utils` for compatibility with existing
 * imports; new consumers should import this module so application code and
 * behavior tests share one stable API.
 */
export {
  analyzeFeedbackContent,
  normalizeFeedbackText,
  type FeedbackModerationResult,
  type FeedbackModerationSeverity,
} from './utils/feedback-moderation.strict'
