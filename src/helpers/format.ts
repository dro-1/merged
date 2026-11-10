// Pinned locale and time zone so server-rendered text matches hydration.
export const numberFormat = new Intl.NumberFormat('en-US')

export const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** Compact, coarse duration: 20min → "<1h", 5h → "5h", 3 days → "3d", 90 days → "3mo". */
export function formatDuration(ms: number): string {
  if (ms < HOUR_MS) return '<1h'
  if (ms < 2 * DAY_MS) return `${Math.round(ms / HOUR_MS)}h`
  if (ms < 60 * DAY_MS) return `${Math.round(ms / DAY_MS)}d`
  return `${Math.round(ms / (30 * DAY_MS))}mo`
}
