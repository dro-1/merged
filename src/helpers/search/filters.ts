import {
  FRAMEWORKS,
  LANGUAGES,
  MIN_ISSUES_OPTIONS,
  MIN_STARS_OPTIONS,
  PUSHED_WITHIN_DAYS,
} from './constants'
import type {
  FrameworkTopic,
  LanguageId,
  MinIssues,
  MinStars,
  PushedWithinDays,
} from './constants'

export type RepoFilters = {
  langs: Array<LanguageId>
  frameworks: Array<FrameworkTopic>
  minStars: MinStars
  pushedWithinDays: PushedWithinDays
  minGoodFirstIssues: MinIssues
  minHelpWantedIssues: MinIssues
}

export const DEFAULT_REPO_FILTERS: RepoFilters = {
  langs: [],
  frameworks: [],
  minStars: 50,
  pushedWithinDays: 30,
  minGoodFirstIssues: 0,
  minHelpWantedIssues: 0,
}

const DAY_MS = 24 * 60 * 60 * 1000

const LANGUAGE_IDS = LANGUAGES.map((l) => l.id)
const FRAMEWORK_TOPICS = FRAMEWORKS.map((f) => f.topic)
const MIN_STARS_VALUES = MIN_STARS_OPTIONS.map((o) => o.value)
const MIN_ISSUES_VALUES = MIN_ISSUES_OPTIONS.map((o) => o.value)

/** Returns the entry of `allowed` equal to `value`, or undefined if there is none. */
function pickOne<T>(allowed: ReadonlyArray<T>, value: unknown): T | undefined {
  return allowed.find((option) => option === value)
}

/**
 * Returns the distinct entries of `allowed` found in `value`, in `allowed` order.
 * A single non-array value is treated as a one-item list: ('go', ['go','rust']) → ['go'].
 */
function pickMany<T>(allowed: ReadonlyArray<T>, value: unknown): Array<T> {
  const values: Array<unknown> = Array.isArray(value) ? value : [value]
  return allowed.filter((option) => values.includes(option))
}

/**
 * Builds a valid RepoFilters from untrusted input (URL params, RPC payload).
 * Unknown keys and values outside the allowed options fall back to DEFAULT_REPO_FILTERS.
 */
export function parseRepoFilters(input: unknown): RepoFilters {
  const raw = (
    typeof input === 'object' && input !== null ? input : {}
  ) as Record<string, unknown>
  const d = DEFAULT_REPO_FILTERS

  return {
    langs: pickMany(LANGUAGE_IDS, raw.langs),
    frameworks: pickMany(FRAMEWORK_TOPICS, raw.frameworks),
    minStars: pickOne(MIN_STARS_VALUES, Number(raw.minStars)) ?? d.minStars,
    pushedWithinDays:
      pickOne(PUSHED_WITHIN_DAYS, Number(raw.pushedWithinDays)) ??
      d.pushedWithinDays,
    minGoodFirstIssues:
      pickOne(MIN_ISSUES_VALUES, Number(raw.minGoodFirstIssues)) ??
      d.minGoodFirstIssues,
    minHelpWantedIssues:
      pickOne(MIN_ISSUES_VALUES, Number(raw.minHelpWantedIssues)) ??
      d.minHelpWantedIssues,
  }
}

/**
 * Returns only the filters that differ from DEFAULT_REPO_FILTERS, in the same key order.
 * e.g. { ...DEFAULT_REPO_FILTERS, minStars: 500 } → { minStars: 500 }
 */
export function omitDefaultFilters(filters: RepoFilters): Partial<RepoFilters> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([key, value]) =>
        JSON.stringify(value) !==
        JSON.stringify(DEFAULT_REPO_FILTERS[key as keyof RepoFilters]),
    ),
  )
}

/**
 * Turns filters into a GitHub repository search string, with dates relative to `now`.
 * Repeated `language:` qualifiers match any of them; `topic:a,b` matches either topic.
 * e.g. { langs: ['go','rust'], frameworks: ['react','vue'], ... } →
 * `... language:"Go" language:"Rust" topic:react,vue`
 */
export function buildSearchQuery(
  filters: RepoFilters,
  now: Date = new Date(),
): string {
  const since = new Date(now.getTime() - filters.pushedWithinDays * DAY_MS)
  const parts = [
    'is:public',
    'archived:false',
    `stars:>=${filters.minStars}`,
    `pushed:>=${since.toISOString().slice(0, 10)}`,
  ]

  for (const language of LANGUAGES) {
    if (filters.langs.includes(language.id)) {
      parts.push(`language:"${language.name}"`)
    }
  }
  if (filters.frameworks.length > 0) {
    parts.push(`topic:${filters.frameworks.join(',')}`)
  }
  // GitHub documents only the `>n` form for these qualifiers.
  if (filters.minGoodFirstIssues > 0) {
    parts.push(`good-first-issues:>${filters.minGoodFirstIssues - 1}`)
  }
  if (filters.minHelpWantedIssues > 0) {
    parts.push(`help-wanted-issues:>${filters.minHelpWantedIssues - 1}`)
  }

  return parts.join(' ')
}
