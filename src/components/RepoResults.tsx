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
      <p className="mt-6 text-sm text-muted-foreground">
        {isSearching
          ? 'Searching…'
          : `${numberFormat.format(firstPage.repositoryCount)} matches, showing ${repos.length}`}
      </p>

      {repos.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {repos.map((repo) => (
            <RepoListItem
              key={repo.id}
              repo={repo}
              details={details[repo.id]}
            />
          ))}
        </ul>
      ) : (
        !isSearching && (
          <div className="mt-4 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center text-muted-foreground">
            No repos match — try removing a filter.
          </div>
        )
      )}

      {more.hasNextPage && (
        <div className="mt-6 text-sm">
          {reachedCap ? (
            <p className="text-center text-muted-foreground">
              Showing the first {MAX_RESULTS} results — narrow your filters to
              find more.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={status === 'loading' || isSearching}
                className="w-full rounded-xl border border-line bg-card px-4 py-3 font-medium text-fg shadow-sm transition-colors hover:border-line-strong hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading'
                  ? 'Loading…'
                  : status === 'error'
                    ? 'Retry'
                    : 'Load more'}
              </button>
              {status === 'error' && (
                <span className="text-warn">Couldn't load more.</span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
