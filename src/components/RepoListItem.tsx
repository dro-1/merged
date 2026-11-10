import { Await } from '@tanstack/react-router'
import { dateFormat, formatDuration, numberFormat } from '#/helpers/format'
import type { RepoDetails, RepoSummary } from '#/server/github'

type BadgeTone = 'good' | 'neutral' | 'warn'

const toneClass: Record<BadgeTone, string> = {
  good: 'border-green-200 bg-green-50 text-green-800',
  neutral: 'border-gray-200 bg-gray-50 text-gray-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
}

type RepoListItemProps = {
  repo: RepoSummary
  /** Resolves later with slower per-repo data; null when it couldn't be loaded. */
  details: Promise<RepoDetails | null> | undefined
}

/** One repository in a search result list, with contributor-readiness badges and maintainer activity. */
export function RepoListItem({ repo, details }: RepoListItemProps) {
  return (
    <li className="py-3">
      <div className="text-sm">
        <a
          href={repo.url}
          className="font-medium text-blue-600 hover:underline"
        >
          {repo.nameWithOwner}
        </a>
        <span className="text-gray-500">
          {' '}
          · ★ {numberFormat.format(repo.stargazerCount)} · pushed{' '}
          {dateFormat.format(new Date(repo.pushedAt))}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {repo.goodFirstIssueCount > 0 && (
          <Badge tone="good">
            {numberFormat.format(repo.goodFirstIssueCount)} good first{' '}
            {repo.goodFirstIssueCount === 1 ? 'issue' : 'issues'}
          </Badge>
        )}
        {repo.helpWantedIssueCount > 0 && (
          <Badge tone="good">
            {numberFormat.format(repo.helpWantedIssueCount)} help wanted
          </Badge>
        )}
        {repo.license ? (
          <Badge tone="neutral">{repo.license}</Badge>
        ) : (
          <Badge tone="warn">No license</Badge>
        )}
      </div>

      {details && (
        <Await
          promise={details}
          fallback={
            <p className="mt-1.5 animate-pulse text-xs text-gray-400">
              Loading activity…
            </p>
          }
        >
          {(d) => <DetailsLine details={d} />}
        </Await>
      )}
    </li>
  )
}

function DetailsLine({ details }: { details: RepoDetails | null }) {
  if (!details) {
    return <p className="mt-1.5 text-xs text-gray-400">Activity unavailable</p>
  }
  const { contributingUrl, merges, medianIssueCloseMs } = details

  return (
    <p className="mt-1.5 text-xs text-gray-500">
      {contributingUrl && (
        <>
          <a href={contributingUrl} className="text-blue-600 hover:underline">
            Contributing guide
          </a>
          {' · '}
        </>
      )}
      {merges.lastMergedAgoMs === null ? (
        'No merged PRs'
      ) : (
        <>
          Last PR merged {formatDuration(merges.lastMergedAgoMs)} ago ·{' '}
          {merges.mergedInWindow.count}
          {merges.mergedInWindow.capped && '+'} merged in 30d
        </>
      )}
      {medianIssueCloseMs !== null && (
        <> · issues closed in ~{formatDuration(medianIssueCloseMs)}</>
      )}
    </p>
  )
}

function Badge({
  tone,
  children,
}: {
  tone: BadgeTone
  children: React.ReactNode
}) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs ${toneClass[tone]}`}>
      {children}
    </span>
  )
}
