import { createServerFn } from '@tanstack/react-start'
import { buildSearchQuery, parseRepoFilters } from '#/helpers/search/filters'
import { createTtlCache } from './cache'

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
const GITHUB_TIMEOUT_MS = 10_000

const SEARCH_REPOS_QUERY = /* GraphQL */ `
  query SearchRepos($q: String!, $first: Int!) {
    search(query: $q, type: REPOSITORY, first: $first) {
      repositoryCount
      nodes {
        ... on Repository {
          nameWithOwner
          url
          stargazerCount
          pushedAt
        }
      }
    }
  }
`

export type RepoSummary = {
  nameWithOwner: string
  url: string
  stargazerCount: number
  pushedAt: string
}

export type RepoSearchResult = {
  repositoryCount: number
  repos: Array<RepoSummary>
}

type GraphQLResponse = {
  data?: {
    search: { repositoryCount: number; nodes: Array<RepoSummary> }
  }
  errors?: Array<{ message: string }>
}

/** Search results are reused for 5 minutes per distinct GitHub query string. */
const searchCache = createTtlCache<RepoSearchResult>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 500,
})

/** Runs a repository search query against the GitHub GraphQL API, authenticating with GITHUB_TOKEN. */
async function fetchRepoSearch(query: string): Promise<RepoSearchResult> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN is not set')
  }

  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: SEARCH_REPOS_QUERY,
      variables: { q: query, first: 20 },
    }),
    // Covers reading the body too, so a stalled response can't hang a shared cache entry.
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  })

  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as GraphQLResponse
  if (json.errors?.length || !json.data) {
    throw new Error(
      `GitHub GraphQL error: ${json.errors?.map((e) => e.message).join('; ') ?? 'no data'}`,
    )
  }

  return {
    repositoryCount: json.data.search.repositoryCount,
    repos: json.data.search.nodes,
  }
}

/**
 * Searches GitHub repositories matching the given filters.
 * Runs only on the server; identical searches within the cache TTL reuse one GitHub request.
 */
export const searchRepos = createServerFn({ method: 'GET' })
  .validator(parseRepoFilters)
  .handler(({ data: filters }) => {
    const query = buildSearchQuery(filters)
    return searchCache.getOrLoad(query, () => fetchRepoSearch(query))
  })
