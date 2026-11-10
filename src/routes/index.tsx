import {
  createFileRoute,
  stripSearchParams,
  useLocation,
  useRouterState,
} from '@tanstack/react-router'
import { RepoFilterPanel } from '#/components/RepoFilterPanel'
import { RepoListItem } from '#/components/RepoListItem'
import { numberFormat } from '#/helpers/format'
import { requestRepoDetails } from '#/helpers/repo/details'
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
    const details = abortController.signal.aborted
      ? {}
      : requestRepoDetails(result.repos.map((r) => r.id))
    return { ...result, details }
  },
  component: Home,
})

function Home() {
  const { repositoryCount, repos, details } = Route.useLoaderData()
  // The pending location, not the committed match, so chips reflect clicks
  // immediately instead of after the search resolves.
  const filters = parseRepoFilters(useLocation({ select: (l) => l.search }))
  const navigate = Route.useNavigate()
  const isLoading = useRouterState({ select: (s) => s.isLoading })

  return (
    <main className="p-8">
      {isLoading && (
        <div className="fixed inset-x-0 top-0 h-0.5 overflow-hidden bg-blue-100">
          <div className="h-full w-1/3 animate-progress bg-blue-600" />
        </div>
      )}

      <h1 className="text-2xl font-bold">Repositories</h1>
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

      <section
        aria-busy={isLoading}
        className={`transition-opacity ${isLoading ? 'opacity-50' : ''}`}
      >
        <p className="mt-6 text-sm text-gray-500">
          {isLoading
            ? 'Searching…'
            : `${numberFormat.format(repositoryCount)} matches, showing ${repos.length}`}
        </p>
        <ul className="mt-4 divide-y divide-gray-100">
          {repos.map((repo) => (
            <RepoListItem
              key={repo.id}
              repo={repo}
              details={details[repo.id]}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}
