import { GITHUB_RATE_LIMITED } from '#/helpers/errors'

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
const GITHUB_TIMEOUT_MS = 10_000

type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string; type?: string }>
}

/**
 * Runs a GitHub GraphQL query authenticated with the GITHUB_TOKEN env variable.
 * Rejects on a missing token, a non-2xx response, GraphQL errors, or after 10 seconds.
 * Rate-limit failures reject with exactly GITHUB_RATE_LIMITED as the message.
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
    const body = await res.text()
    const limited =
      (res.status === 403 || res.status === 429) &&
      (res.headers.get('x-ratelimit-remaining') === '0' ||
        /rate limit/i.test(body))
    if (limited) throw new Error(GITHUB_RATE_LIMITED)
    throw new Error(`GitHub API responded ${res.status}: ${body}`)
  }

  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.some((e) => e.type === 'RATE_LIMITED')) {
    throw new Error(GITHUB_RATE_LIMITED)
  }
  if (json.errors?.length || !json.data) {
    throw new Error(
      `GitHub GraphQL error: ${json.errors?.map((e) => e.message).join('; ') ?? 'no data'}`,
    )
  }
  return json.data
}
