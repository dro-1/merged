import { createServerFn } from '@tanstack/react-start'
import { medianCloseTimeMs, summarizeMerges } from '#/helpers/repo/metrics'
import type { MergeActivity } from '#/helpers/repo/metrics'
import { buildSearchQuery, parseRepoFilters } from '#/helpers/search/filters'
import { GITHUB_RATE_LIMITED } from '#/helpers/errors'
import { createTtlCache } from './cache'
import { githubGraphQL } from './github-client'

const MERGED_PR_SAMPLE = 30
const CLOSED_ISSUE_SAMPLE = 20
const CACHE_TTL_MS = 5 * 60 * 1000

/** Maximum number of repositories per getRepoDetails call. */
export const DETAILS_BATCH_SIZE = 5

/** Repositories returned per searchRepos page. */
export const SEARCH_PAGE_SIZE = 20

// Only fields that keep the search fast belong here; slower per-repo
// fields are fetched separately by getRepoDetails.
const SEARCH_REPOS_QUERY = /* GraphQL */ `
  query SearchRepos($q: String!, $first: Int!, $after: String) {
    search(query: $q, type: REPOSITORY, first: $first, after: $after) {
      repositoryCount
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ... on Repository {
          id
          nameWithOwner
          url
          stargazerCount
          pushedAt
          licenseInfo {
            spdxId
            name
          }
          goodFirstIssues: issues(states: OPEN, labels: ["good first issue"]) {
            totalCount
          }
          helpWantedIssues: issues(states: OPEN, labels: ["help wanted"]) {
            totalCount
          }
        }
      }
    }
  }
`

const REPO_DETAILS_QUERY = /* GraphQL */ `
  query RepoDetails($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Repository {
        id
        contributingGuidelines {
          url
        }
        # PRs can't be ordered by merge time; recently updated is the closest proxy.
        mergedPullRequests: pullRequests(
          states: MERGED
          first: ${MERGED_PR_SAMPLE}
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            mergedAt
          }
        }
        # Issues can't be filtered by close reason here; non-COMPLETED ones are dropped after fetching.
        closedIssues: issues(
          states: CLOSED
          first: ${CLOSED_ISSUE_SAMPLE}
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            createdAt
            closedAt
            stateReason
          }
        }
      }
    }
  }
`

export type RepoSummary = {
  /** GitHub GraphQL node id, used to request RepoDetails. */
  id: string
  nameWithOwner: string
  url: string
  stargazerCount: number
  pushedAt: string
  /** SPDX id (e.g. "MIT"), "Other" for an unrecognised license, or null if none. */
  license: string | null
  goodFirstIssueCount: number
  helpWantedIssueCount: number
}

export type RepoSearchResult = {
  repositoryCount: number
  repos: Array<RepoSummary>
  /** Pass as `after` to fetch the following page; null when there is none. */
  endCursor: string | null
  hasNextPage: boolean
}

export type RepoDetails = {
  contributingUrl: string | null
  merges: MergeActivity
  /** Median open-to-close time of recently closed issues marked completed, or null if none were sampled. */
  medianIssueCloseMs: number | null
}

type SearchNode = {
  id: string
  nameWithOwner: string
  url: string
  stargazerCount: number
  pushedAt: string
  licenseInfo: { spdxId: string | null; name: string } | null
  goodFirstIssues: { totalCount: number }
  helpWantedIssues: { totalCount: number }
}

type DetailsNode = {
  id: string
  contributingGuidelines: { url: string | null } | null
  mergedPullRequests: { nodes: Array<{ mergedAt: string | null } | null> }
  closedIssues: {
    nodes: Array<{
      createdAt: string
      closedAt: string | null
      stateReason: string | null
    } | null>
  }
}

/** Flattens a GraphQL search node into a RepoSummary. */
function toRepoSummary(node: SearchNode): RepoSummary {
  const spdxId = node.licenseInfo?.spdxId
  return {
    id: node.id,
    nameWithOwner: node.nameWithOwner,
    url: node.url,
    stargazerCount: node.stargazerCount,
    pushedAt: node.pushedAt,
    license: !node.licenseInfo
      ? null
      : spdxId && spdxId !== 'NOASSERTION'
        ? spdxId
        : 'Other',
    goodFirstIssueCount: node.goodFirstIssues.totalCount,
    helpWantedIssueCount: node.helpWantedIssues.totalCount,
  }
}

/** Builds RepoDetails from a GraphQL repository node, with activity measured relative to `now`. */
function toRepoDetails(node: DetailsNode, now: number): RepoDetails {
  const mergedAts = node.mergedPullRequests.nodes.flatMap((pr) =>
    pr?.mergedAt ? [pr.mergedAt] : [],
  )
  // Not-planned and duplicate closures are often instant, so they'd skew the median low.
  const closedIssues = node.closedIssues.nodes.flatMap((issue) =>
    issue?.closedAt && issue.stateReason === 'COMPLETED'
      ? [{ createdAt: issue.createdAt, closedAt: issue.closedAt }]
      : [],
  )
  return {
    contributingUrl: node.contributingGuidelines?.url ?? null,
    merges: summarizeMerges(mergedAts, MERGED_PR_SAMPLE, now),
    medianIssueCloseMs: medianCloseTimeMs(closedIssues),
  }
}

/**
 * Validates a list of 1 to DETAILS_BATCH_SIZE GitHub node ids; throws on anything else.
 * e.g. { ids: ['R_kgDOAbc'] } → ['R_kgDOAbc']
 */
function parseRepoIds(input: unknown): Array<string> {
  const ids = (input as { ids?: unknown } | null)?.ids
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > DETAILS_BATCH_SIZE ||
    !ids.every((id) => typeof id === 'string' && /^[\w=-]{1,100}$/.test(id))
  ) {
    throw new Error('Invalid repository ids')
  }
  return ids
}

/**
 * Validates an optional pagination cursor; throws on anything but a short base64-like string.
 * e.g. undefined → undefined, 'Y3Vyc29yOjIw' → 'Y3Vyc29yOjIw'
 */
function parseCursor(input: unknown): string | undefined {
  if (input === undefined || input === null) return undefined
  if (typeof input !== 'string' || !/^[\w+/=-]{1,200}$/.test(input)) {
    throw new Error('Invalid cursor')
  }
  return input
}

/** Search results are reused for 5 minutes per page of a distinct GitHub query string. */
const searchCache = createTtlCache<RepoSearchResult>({
  ttlMs: CACHE_TTL_MS,
  // A fully paged search uses up to 10 entries (one per page).
  maxEntries: 2000,
})

/** Details are reused for 5 minutes per repository; null records an id GitHub couldn't resolve. */
const detailsCache = createTtlCache<RepoDetails | null>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: 5000,
})

/** Fetches details for the given repository ids in one GitHub query, keyed by id. */
async function fetchRepoDetails(
  ids: Array<string>,
): Promise<Record<string, RepoDetails>> {
  const data = await githubGraphQL<{
    nodes: Array<DetailsNode | null>
  }>(REPO_DETAILS_QUERY, { ids })
  const now = Date.now()
  return Object.fromEntries(
    data.nodes
      // Ids of non-repository nodes resolve to `{}`, so require an id too.
      .filter((node): node is DetailsNode => Boolean(node?.id))
      .map((node) => [node.id, toRepoDetails(node, now)]),
  )
}

/**
 * Logs a server-side failure in full and returns an error safe to send to a client:
 * the rate-limit message is kept, anything else becomes a generic message.
 */
function toClientError(label: string, error: unknown): Error {
  console.error(label, error)
  const rateLimited =
    error instanceof Error && error.message === GITHUB_RATE_LIMITED
  return new Error(rateLimited ? GITHUB_RATE_LIMITED : 'GitHub request failed')
}

/**
 * Searches GitHub repositories matching the given filters, one page at a time.
 * Pass a previous result's `endCursor` as `after` for the next page. Runs only on the
 * server; identical page requests within the cache TTL reuse one GitHub request.
 */
export const searchRepos = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    filters: parseRepoFilters(input),
    after: parseCursor((input as { after?: unknown } | null)?.after),
  }))
  .handler(async ({ data: { filters, after } }) => {
    const query = buildSearchQuery(filters)
    try {
      return await searchCache.getOrLoad(
        `${query}|${after ?? ''}`,
        async () => {
          const data = await githubGraphQL<{
            search: {
              repositoryCount: number
              pageInfo: { endCursor: string | null; hasNextPage: boolean }
              nodes: Array<SearchNode | null>
            }
          }>(SEARCH_REPOS_QUERY, { q: query, first: SEARCH_PAGE_SIZE, after })
          return {
            repositoryCount: data.search.repositoryCount,
            repos: data.search.nodes
              .filter((node): node is SearchNode => node !== null)
              .map(toRepoSummary),
            endCursor: data.search.pageInfo.endCursor,
            hasNextPage: data.search.pageInfo.hasNextPage,
          }
        },
      )
    } catch (error) {
      throw toClientError('[searchRepos]', error)
    }
  })

/**
 * Fetches contributing-guide and maintainer-activity details for a batch of repositories,
 * keyed by node id. Each repository is cached on its own, so only ids not already cached
 * are requested from GitHub. Ids GitHub can't resolve are omitted from the result.
 */
export const getRepoDetails = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({ ids: parseRepoIds(input) }))
  .handler(async ({ data: { ids } }) => {
    // The cache decides which ids need loading: each loader that actually runs
    // records its id, and one GitHub query then fetches exactly those.
    const toFetch: Array<string> = []
    let resolveBatch!: (batch: Promise<Record<string, RepoDetails>>) => void
    const batch = new Promise<Record<string, RepoDetails>>((resolve) => {
      resolveBatch = resolve
    })

    const pending = ids.map((id) =>
      detailsCache.getOrLoad(id, () => {
        toFetch.push(id)
        return batch.then((byId) => byId[id] ?? null)
      }),
    )
    resolveBatch(
      toFetch.length > 0 ? fetchRepoDetails(toFetch) : Promise.resolve({}),
    )

    const results = await Promise.all(pending).catch((error: unknown) => {
      throw toClientError('[getRepoDetails]', error)
    })
    return Object.fromEntries(
      ids.flatMap((id, i) => {
        const details = results[i]
        return details ? [[id, details]] : []
      }),
    )
  })
