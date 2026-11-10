import { Await } from '@tanstack/react-router'
import { dateFormat, formatDuration, numberFormat } from '#/helpers/format'
import type { RepoDetails, RepoSummary } from '#/server/github'

type BadgeTone = 'good' | 'neutral' | 'warn'

const toneClass: Record<BadgeTone, string> = {
  good: 'bg-good-soft text-good',
  neutral: 'bg-surface text-muted-foreground ring-1 ring-line ring-inset',
  warn: 'bg-warn-soft text-warn',
}

type RepoListItemProps = {
  repo: RepoSummary
  /** Resolves later with slower per-repo data; null when it couldn't be loaded. */
  details: Promise<RepoDetails | null> | undefined
}

/** One repository in a search result list, with contributor-readiness badges and maintainer activity. */
export function RepoListItem({ repo, details }: RepoListItemProps) {
  return (
    <li className="rounded-2xl border border-line bg-card p-5 shadow-sm transition-colors hover:border-line-strong">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold break-all text-fg hover:text-primary"
        >
          {repo.nameWithOwner}
        </a>
        <span className="text-sm text-subtle">
          ★ {numberFormat.format(repo.stargazerCount)} · pushed{' '}
          {dateFormat.format(new Date(repo.pushedAt))}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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
            <div
              aria-label="Loading activity"
              className="mt-3 h-4 w-2/3 animate-pulse rounded bg-skeleton"
            />
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
    return <p className="mt-3 text-sm text-subtle">Activity unavailable</p>
  }
  const { contributingUrl, merges, medianIssueCloseMs } = details

  return (
    <p className="mt-3 text-sm leading-5 text-muted-foreground">
      {contributingUrl && (
        <>
          <a
            href={contributingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
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
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  )
}
