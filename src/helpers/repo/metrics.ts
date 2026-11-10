const DAY_MS = 24 * 60 * 60 * 1000

/** Middle value of a list of numbers, or null for an empty list: [5, 1, 3, 9] → 4. */
export function median(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export type MergeActivity = {
  /** Milliseconds between the latest merge and `now`, or null if there were none. */
  lastMergedAgoMs: number | null
  /** Merges within the window; `capped` means the sample was full, so the real count may be higher. */
  mergedInWindow: { count: number; capped: boolean }
}

/**
 * Summarises a sample of merge timestamps (ISO strings) relative to `now`.
 * e.g. two merges 1 and 40 days ago, window 30 days, sample size 30 →
 * { lastMergedAgoMs: 1 day, mergedInWindow: { count: 1, capped: false } }
 */
export function summarizeMerges(
  mergedAts: ReadonlyArray<string>,
  sampleSize: number,
  now: number,
  windowDays = 30,
): MergeActivity {
  const times = mergedAts.map((t) => Date.parse(t))
  const count = times.filter((t) => now - t <= windowDays * DAY_MS).length
  return {
    lastMergedAgoMs: times.length ? now - Math.max(...times) : null,
    mergedInWindow: { count, capped: count >= sampleSize },
  }
}

/** Median open-to-close duration in milliseconds for issues given as ISO timestamp pairs. */
export function medianCloseTimeMs(
  issues: ReadonlyArray<{ createdAt: string; closedAt: string }>,
): number | null {
  return median(
    issues.map((i) => Date.parse(i.closedAt) - Date.parse(i.createdAt)),
  )
}
