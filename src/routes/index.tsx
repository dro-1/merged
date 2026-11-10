import { createFileRoute } from '@tanstack/react-router'
import { searchRepos } from '#/server/github'

// Pinned locale and time zone so server-rendered text matches hydration.
const numberFormat = new Intl.NumberFormat('en-US')
const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

export const Route = createFileRoute('/')({
  loader: () => searchRepos(),
  component: Home,
})

function Home() {
  const { repositoryCount, repos } = Route.useLoaderData()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Repositories</h1>
      <p className="mt-1 text-sm text-gray-500">
        {numberFormat.format(repositoryCount)} matches, showing {repos.length}
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
    </main>
  )
}
