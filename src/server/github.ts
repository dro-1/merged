import { createServerFn } from '@tanstack/react-start'
import { buildSearchQuery, parseRepoFilters } from '#/helpers/search/filters'

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

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

/**
 * Searches GitHub repositories matching the given filters via the GraphQL API.
 * Runs only on the server, authenticating with the GITHUB_TOKEN env variable.
 */
export const searchRepos = createServerFn({ method: 'GET' })
  .validator(parseRepoFilters)
  .handler(async ({ data: filters }): Promise<RepoSearchResult> => {
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
        variables: {
          q: buildSearchQuery(filters),
          first: 20,
        },
      }),
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
  })
