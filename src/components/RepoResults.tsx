import { useState } from 'react'
import { RepoListItem } from '#/components/RepoListItem'
import { numberFormat } from '#/helpers/format'
import { requestRepoDetails } from '#/helpers/repo/details'
import type { RepoDetailsById } from '#/helpers/repo/details'
import type { RepoFilters } from '#/helpers/search/filters'
import { searchRepos } from '#/server/github'
import type { RepoSearchResult, RepoSummary } from '#/server/github'

/** Results beyond this many are not paged in; users are asked to narrow the search. */
const MAX_RESULTS = 200

type RepoResultsProps = {
  firstPage: RepoSearchResult
  firstPageDetails: RepoDetailsById
  /** Filters `firstPage` was searched with; later pages use the same ones. */
  filters: RepoFilters
  /** A new search is in flight, so these results are about to be replaced. */
  isSearching: boolean
}

type LoadedPages = {
  repos: Array<RepoSummary>
  details: RepoDetailsById
  endCursor: string | null
  hasNextPage: boolean
}

/**
 * A repository search result list that starts with one page and appends further pages
 * on demand, up to MAX_RESULTS. Remount it (via `key`) when the filters change.
 */
export function RepoResults({
  firstPage,
  firstPageDetails,
  filters,
  isSearching,
}: RepoResultsProps) {
  const [more, setMore] = useState<LoadedPages>({
    repos: [],
    details: {},
    endCursor: firstPage.endCursor,
    hasNextPage: firstPage.hasNextPage,
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const repos = [...firstPage.repos, ...more.repos]
  const details = { ...firstPageDetails, ...more.details }
  const reachedCap = repos.length >= MAX_RESULTS

  async function loadMore() {
    if (!more.endCursor) return
    setStatus('loading')
    try {
      const next = await searchRepos({
        data: { ...filters, after: more.endCursor },
      })
      // Search pages can overlap if GitHub's ranking shifts between requests.
      const known = new Set(repos.map((r) => r.id))
      const fresh = next.repos
        .filter((r) => !known.has(r.id))
        .slice(0, MAX_RESULTS - repos.length)
      const freshDetails = requestRepoDetails(fresh.map((r) => r.id))
      setMore((prev) => ({
        repos: [...prev.repos, ...fresh],
        details: { ...prev.details, ...freshDetails },
        endCursor: next.endCursor,
        hasNextPage: next.hasNextPage,
      }))
      setStatus('idle')
    } catch (err) {
      console.error('[load more]', err)
      setStatus('error')
    }
  }

  return (
    <>
      <p className="mt-6 text-sm text-gray-500">
        {isSearching
          ? 'Searching…'
          : `${numberFormat.format(firstPage.repositoryCount)} matches, showing ${repos.length}`}
      </p>

      <ul className="mt-4 divide-y divide-gray-100">
        {repos.map((repo) => (
          <RepoListItem key={repo.id} repo={repo} details={details[repo.id]} />
        ))}
      </ul>

      {more.hasNextPage && (
        <div className="mt-6 text-sm">
          {reachedCap ? (
            <p className="text-gray-500">
              Showing the first {MAX_RESULTS} results — narrow your filters to
              find more.
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={status === 'loading' || isSearching}
                className="rounded border border-gray-300 px-4 py-2 font-medium text-gray-800 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading'
                  ? 'Loading…'
                  : status === 'error'
                    ? 'Retry'
                    : 'Load more'}
              </button>
              {status === 'error' && (
                <span className="text-amber-700">Couldn't load more.</span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
