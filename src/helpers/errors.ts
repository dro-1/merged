/** Error message used for any failure caused by GitHub rate limiting. */
export const GITHUB_RATE_LIMITED = 'GitHub rate limit exceeded'

/**
 * Turns a loading error into a short message safe to show a user. Raw error text is
 * never surfaced; only recognised causes get a specific message.
 * e.g. new Error(GITHUB_RATE_LIMITED) → "GitHub's rate limit was hit…"
 */
export function describeLoadError(error: unknown): string {
  if (error instanceof Error && error.message === GITHUB_RATE_LIMITED) {
    return "GitHub's rate limit was hit. Try again in a minute."
  }
  return 'Something went wrong while talking to GitHub.'
}
