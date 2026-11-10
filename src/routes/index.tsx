import {
  createFileRoute,
  stripSearchParams,
  useLocation,
  useRouterState,
} from '@tanstack/react-router'
import { RepoFilterPanel } from '#/components/RepoFilterPanel'
import {
  DEFAULT_REPO_FILTERS,
  parseRepoFilters,
} from '#/helpers/search/filters'
import { searchRepos } from '#/server/github'

// Pinned locale and time zone so server-rendered text matches hydration.
const numberFormat = new Intl.NumberFormat('en-US')
const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

export const Route = createFileRoute('/')({
  validateSearch: parseRepoFilters,
  search: { middlewares: [stripSearchParams(DEFAULT_REPO_FILTERS)] },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => searchRepos({ data: deps }),
  component: Home,
})

function Home() {
  const { repositoryCount, repos } = Route.useLoaderData()
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
        <ul className="mt-6 space-y-2">
          {repos.map((repo) => (
            <li key={repo.nameWithOwner}>
              <a href={repo.url} className="text-blue-600 hover:underline">
                {repo.nameWithOwner}
              </a>{' '}
              · ★ {numberFormat.format(repo.stargazerCount)} · pushed{' '}
              {dateFormat.format(new Date(repo.pushedAt))}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
