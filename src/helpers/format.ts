// Pinned locale and time zone so server-rendered text matches hydration.
export const numberFormat = new Intl.NumberFormat('en-US')

export const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** Compact, coarse duration: 20min → "<1h", 5h → "5h", 3 days → "3d", 90 days → "3mo", 3 years → "3y". */
export function formatDuration(ms: number): string {
  if (ms < HOUR_MS) return '<1h'
  if (ms < 2 * DAY_MS) return `${Math.round(ms / HOUR_MS)}h`
  if (ms < 60 * DAY_MS) return `${Math.round(ms / DAY_MS)}d`
  // Capped at 11 so anything under a year never reads "12mo".
  if (ms < 365 * DAY_MS) {
    return `${Math.min(11, Math.round(ms / ((365 / 12) * DAY_MS)))}mo`
  }
  return `${Math.round(ms / (365 * DAY_MS))}y`
}
