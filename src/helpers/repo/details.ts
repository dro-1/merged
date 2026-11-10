import { DETAILS_BATCH_SIZE, getRepoDetails } from '#/server/github'
import type { RepoDetails } from '#/server/github'

/**
 * Requests details for the given repository ids in parallel batches and returns one
 * promise per id. A failed batch or an unknown id resolves to null rather than rejecting.
 * e.g. 12 ids → 3 getRepoDetails calls, { [id]: Promise<RepoDetails | null> }
 */
export function requestRepoDetails(
  ids: ReadonlyArray<string>,
): Record<string, Promise<RepoDetails | null>> {
  const byId: Record<string, Promise<RepoDetails | null>> = {}
  for (let i = 0; i < ids.length; i += DETAILS_BATCH_SIZE) {
    const batch = ids.slice(i, i + DETAILS_BATCH_SIZE)
    const batchPromise = getRepoDetails({ data: { ids: batch } }).catch(
      () => null,
    )
    for (const id of batch) {
      byId[id] = batchPromise.then((details) => details?.[id] ?? null)
    }
  }
  return byId
}
