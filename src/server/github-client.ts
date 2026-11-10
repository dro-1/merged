const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
const GITHUB_TIMEOUT_MS = 10_000

type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

/**
 * Runs a GitHub GraphQL query authenticated with the GITHUB_TOKEN env variable.
 * Rejects on a missing token, a non-2xx response, GraphQL errors, or after 10 seconds.
 */
export async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
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
    body: JSON.stringify({ query, variables }),
    // Covers reading the body too, so a stalled response can't hang a shared cache entry.
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  })

  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.length || !json.data) {
    throw new Error(
      `GitHub GraphQL error: ${json.errors?.map((e) => e.message).join('; ') ?? 'no data'}`,
    )
  }
  return json.data
}
