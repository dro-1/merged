import { createServerFn } from '@tanstack/react-start'
import { medianCloseTimeMs, summarizeMerges } from '#/helpers/repo/metrics'
import type { MergeActivity } from '#/helpers/repo/metrics'
import { buildSearchQuery, parseRepoFilters } from '#/helpers/search/filters'
import { createTtlCache } from './cache'
import { githubGraphQL } from './github-client'

const MERGED_PR_SAMPLE = 30
const CLOSED_ISSUE_SAMPLE = 10
const CACHE_TTL_MS = 5 * 60 * 1000

/** Maximum number of repositories per getRepoDetails call. */
export const DETAILS_BATCH_SIZE = 5

// Only fields that keep the search fast belong here; slower per-repo
// fields are fetched separately by getRepoDetails.
const SEARCH_REPOS_QUERY = /* GraphQL */ `
  query SearchRepos($q: String!, $first: Int!) {
    search(query: $q, type: REPOSITORY, first: $first) {
      repositoryCount
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
        closedIssues: issues(
          states: CLOSED
          first: ${CLOSED_ISSUE_SAMPLE}
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            createdAt
            closedAt
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
}

export type RepoDetails = {
  contributingUrl: string | null
  merges: MergeActivity
  /** Median open-to-close time of recently closed issues, or null if none were sampled. */
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
    nodes: Array<{ createdAt: string; closedAt: string | null } | null>
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
  const closedIssues = node.closedIssues.nodes.flatMap((issue) =>
    issue?.closedAt
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

/** Search results are reused for 5 minutes per distinct GitHub query string. */
const searchCache = createTtlCache<RepoSearchResult>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: 500,
})

/** Details are reused for 5 minutes per distinct batch of repository ids. */
const detailsCache = createTtlCache<Record<string, RepoDetails>>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: 2000,
})

/**
 * Searches GitHub repositories matching the given filters.
 * Runs only on the server; identical searches within the cache TTL reuse one GitHub request.
 */
export const searchRepos = createServerFn({ method: 'GET' })
  .validator(parseRepoFilters)
  .handler(({ data: filters }) => {
    const query = buildSearchQuery(filters)
    return searchCache.getOrLoad(query, async () => {
      const data = await githubGraphQL<{
        search: {
          repositoryCount: number
          nodes: Array<SearchNode | null>
        }
      }>(SEARCH_REPOS_QUERY, { q: query, first: 20 })
      return {
        repositoryCount: data.search.repositoryCount,
        repos: data.search.nodes
          .filter((node): node is SearchNode => node !== null)
          .map(toRepoSummary),
      }
    })
  })

/**
 * Fetches contributing-guide and maintainer-activity details for a batch of repositories,
 * keyed by node id. Ids GitHub can't resolve are omitted from the result.
 */
export const getRepoDetails = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({ ids: parseRepoIds(input) }))
  .handler(({ data: { ids } }) =>
    detailsCache.getOrLoad(ids.join(','), async () => {
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
    }),
  )
