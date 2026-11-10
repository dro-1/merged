import { useEffect } from 'react'
import {
  createFileRoute,
  stripSearchParams,
  useLocation,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { RepoFilterPanel } from '#/components/RepoFilterPanel'
import { RepoResults } from '#/components/RepoResults'
import { StatusMessage, statusActionClass } from '#/components/StatusMessage'
import { describeLoadError } from '#/helpers/errors'
import { requestRepoDetails } from '#/helpers/repo/details'
import type { RepoDetailsById } from '#/helpers/repo/details'
import {
  DEFAULT_REPO_FILTERS,
  parseRepoFilters,
} from '#/helpers/search/filters'
import { searchRepos } from '#/server/github'

export const Route = createFileRoute('/')({
  validateSearch: parseRepoFilters,
  search: { middlewares: [stripSearchParams(DEFAULT_REPO_FILTERS)] },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, abortController }) => {
    const result = await searchRepos({ data: deps })
    // Not awaited: the list renders as soon as the search resolves, and each
    // row's details stream in (during SSR too) as their batch completes.
    // Skipped when a newer navigation superseded this one mid-search.
    const details: RepoDetailsById = abortController.signal.aborted
      ? {}
      : requestRepoDetails(result.repos.map((r) => r.id))
    return { firstPage: result, details }
  },
  component: Home,
  errorComponent: SearchError,
})

function Home() {
  const { firstPage, details } = Route.useLoaderData()
  const searchedFilters = Route.useLoaderDeps()
  const isLoading = useRouterState({ select: (s) => s.isLoading })

  return (
    <SearchShell>
      <section
        aria-busy={isLoading}
        className={`transition-opacity ${isLoading ? 'opacity-50' : ''}`}
      >
        <RepoResults
          // A new search starts a fresh list; extra loaded pages are discarded.
          key={JSON.stringify(searchedFilters)}
          firstPage={firstPage}
          firstPageDetails={details}
          filters={searchedFilters}
          isSearching={isLoading}
        />
      </section>
    </SearchShell>
  )
}

/** Keeps the filters usable when a search fails, so changing one also retries. */
function SearchError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isLoading = useRouterState({ select: (s) => s.isLoading })

  useEffect(() => {
    console.error('[search]', error)
  }, [error])

  return (
    <SearchShell>
      <div className="mt-6">
        <StatusMessage
          title="Couldn't load repositories"
          message={describeLoadError(error)}
        >
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void router.invalidate()}
            className={`${statusActionClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isLoading ? 'Retrying…' : 'Try again'}
          </button>
        </StatusMessage>
      </div>
    </SearchShell>
  )
}

/** Page chrome for the search route: progress bar, header and the filter toolbar. */
function SearchShell({ children }: { children: React.ReactNode }) {
  // The pending location, not the committed match, so filters reflect clicks
  // immediately instead of after the search resolves.
  const filters = parseRepoFilters(useLocation({ select: (l) => l.search }))
  const navigate = Route.useNavigate()
  const isLoading = useRouterState({ select: (s) => s.isLoading })

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {isLoading && (
        <div className="fixed inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-accent">
          <div className="h-full w-1/3 animate-progress bg-primary" />
        </div>
      )}

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">merged</h1>
        <p className="mt-2 text-muted-foreground">
          Find open-source repos ready for your first contribution.
        </p>
      </header>

      <div className="mt-6">
        <RepoFilterPanel
          filters={filters}
          onChange={(patch) =>
            navigate({
              // `prev` is the latest location's search, so rapid clicks compose.
              search: (prev) => parseRepoFilters({ ...prev, ...patch }),
              resetScroll: false,
            })
          }
        />
      </div>

      {children}
    </main>
  )
}
