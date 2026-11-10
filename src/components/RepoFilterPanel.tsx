import {
  FRAMEWORKS,
  LANGUAGES,
  MIN_ISSUES_OPTIONS,
  MIN_STARS_OPTIONS,
  PUSHED_WITHIN_DAYS,
} from '#/helpers/search/constants'
import type { RepoFilters } from '#/helpers/search/filters'

type RepoFilterPanelProps = {
  filters: RepoFilters
  /** Receives only the fields that changed, e.g. { minStars: 100 }. */
  onChange: (patch: Partial<RepoFilters>) => void
}

/** Adds `item` to `list` if absent, removes it if present: (['a'], 'b') → ['a','b']. */
function toggleItem<T>(list: ReadonlyArray<T>, item: T): Array<T> {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

/** Click-to-apply controls for repository search filters; every change is reported immediately. */
export function RepoFilterPanel({ filters, onChange }: RepoFilterPanelProps) {
  return (
    <div className="space-y-5">
      <Group label="Languages">
        {LANGUAGES.map((l) => (
          <Chip
            key={l.id}
            selected={filters.langs.includes(l.id)}
            onClick={() => onChange({ langs: toggleItem(filters.langs, l.id) })}
          >
            {l.name}
          </Chip>
        ))}
      </Group>

      <Group label="Frameworks">
        {FRAMEWORKS.map((f) => (
          <Chip
            key={f.topic}
            selected={filters.frameworks.includes(f.topic)}
            onClick={() =>
              onChange({ frameworks: toggleItem(filters.frameworks, f.topic) })
            }
          >
            {f.label}
          </Chip>
        ))}
      </Group>

      <Group label="Min stars">
        {MIN_STARS_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            selected={filters.minStars === o.value}
            onClick={() => onChange({ minStars: o.value })}
          >
            {o.label}
          </Chip>
        ))}
      </Group>

      <Group label="Good first issues">
        {MIN_ISSUES_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            selected={filters.minGoodFirstIssues === o.value}
            onClick={() => onChange({ minGoodFirstIssues: o.value })}
          >
            {o.label}
          </Chip>
        ))}
      </Group>

      <Group label="Help wanted issues">
        {MIN_ISSUES_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            selected={filters.minHelpWantedIssues === o.value}
            onClick={() => onChange({ minHelpWantedIssues: o.value })}
          >
            {o.label}
          </Chip>
        ))}
      </Group>

      <Group label="Pushed within">
        <select
          value={filters.pushedWithinDays}
          onChange={(e) => {
            const days = PUSHED_WITHIN_DAYS.find(
              (d) => d === Number(e.target.value),
            )
            if (days) onChange({ pushedWithinDays: days })
          }}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {PUSHED_WITHIN_DAYS.map((days) => (
            <option key={days} value={days}>
              {days} days
            </option>
          ))}
        </select>
      </Group>
    </div>
  )
}

function Group({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-gray-600">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={
        selected
          ? 'rounded-full border border-gray-900 bg-gray-900 px-3 py-1 text-sm text-white'
          : 'rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:border-gray-500'
      }
    >
      {children}
    </button>
  )
}
