import type { RepoFilters } from './search/filters'

/** Umami Cloud site this app reports to; public, as it ships in every page. */
export const UMAMI_WEBSITE_ID = '97622b92-d511-4752-a1e3-3131580d4e50'

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number>) => void
    }
  }
}

/**
 * Flattens filters into analytics event properties; lists become sorted,
 * comma-joined strings, with "any" for an empty list.
 * e.g. { langs: ['rust', 'go'], frameworks: [], ... } → { langs: 'go,rust', frameworks: 'any', ... }
 */
export function toSearchEventData(
  filters: RepoFilters,
): Record<string, string | number> {
  const list = (values: ReadonlyArray<string>) =>
    values.length ? [...values].sort().join(',') : 'any'
  return {
    langs: list(filters.langs),
    frameworks: list(filters.frameworks),
    minStars: filters.minStars,
    pushedWithinDays: filters.pushedWithinDays,
    minGoodFirstIssues: filters.minGoodFirstIssues,
    minHelpWantedIssues: filters.minHelpWantedIssues,
  }
}

/**
 * Records a "search" event with the given filters. If the analytics script
 * hasn't loaded yet, waits for the page's load event; does nothing when it is
 * blocked or absent.
 */
export function trackSearch(filters: RepoFilters): void {
  const send = () => window.umami?.track('search', toSearchEventData(filters))
  if (window.umami || document.readyState === 'complete') send()
  else window.addEventListener('load', send, { once: true })
}
