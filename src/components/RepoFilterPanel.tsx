import { XIcon } from 'lucide-react'
import { MultiSelect, dropdownTriggerClass } from '#/components/MultiSelect'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.id, label: l.name }))
const FRAMEWORK_OPTIONS = FRAMEWORKS.map((f) => ({
  value: f.topic,
  label: f.label,
}))
const STAR_OPTIONS = MIN_STARS_OPTIONS.map((o) => ({
  value: o.value,
  label: o.value === 0 ? o.label : `${o.label}+`,
}))
const PUSHED_OPTIONS = PUSHED_WITHIN_DAYS.map((days) => ({
  value: days,
  label: days === 365 ? '1 year' : `${days} days`,
}))

/** A compact toolbar of repository search filters; every change is reported immediately. */
export function RepoFilterPanel({ filters, onChange }: RepoFilterPanelProps) {
  const activeTags = [
    ...LANGUAGE_OPTIONS.filter((o) => filters.langs.includes(o.value)).map(
      (o) => ({
        key: `lang:${o.value}`,
        label: o.label,
        remove: () =>
          onChange({ langs: filters.langs.filter((l) => l !== o.value) }),
      }),
    ),
    ...FRAMEWORK_OPTIONS.filter((o) =>
      filters.frameworks.includes(o.value),
    ).map((o) => ({
      key: `framework:${o.value}`,
      label: o.label,
      remove: () =>
        onChange({
          frameworks: filters.frameworks.filter((f) => f !== o.value),
        }),
    })),
  ]

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <MultiSelect
          label="Languages"
          options={LANGUAGE_OPTIONS}
          selected={filters.langs}
          onChange={(langs) => onChange({ langs })}
        />
        <MultiSelect
          label="Frameworks"
          options={FRAMEWORK_OPTIONS}
          selected={filters.frameworks}
          onChange={(frameworks) => onChange({ frameworks })}
        />
        <FilterSelect
          prefix="Stars"
          options={STAR_OPTIONS}
          value={filters.minStars}
          onChange={(minStars) => onChange({ minStars })}
        />
        <FilterSelect
          prefix="Good first"
          options={MIN_ISSUES_OPTIONS}
          value={filters.minGoodFirstIssues}
          onChange={(minGoodFirstIssues) => onChange({ minGoodFirstIssues })}
        />
        <FilterSelect
          prefix="Help wanted"
          options={MIN_ISSUES_OPTIONS}
          value={filters.minHelpWantedIssues}
          onChange={(minHelpWantedIssues) => onChange({ minHelpWantedIssues })}
        />
        <FilterSelect
          prefix="Pushed"
          options={PUSHED_OPTIONS}
          value={filters.pushedWithinDays}
          onChange={(pushedWithinDays) => onChange({ pushedWithinDays })}
        />
      </div>

      {activeTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeTags.map((tag) => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 rounded-full bg-accent py-0.5 pr-1 pl-2.5 text-xs font-medium text-fg"
            >
              {tag.label}
              <button
                type="button"
                aria-label={`Remove ${tag.label}`}
                onClick={tag.remove}
                className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange({ langs: [], frameworks: [] })}
            className="rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

type FilterSelectProps<T extends number> = {
  /** Shown before the chosen option in the trigger, e.g. "Stars: 50+". */
  prefix: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}

function FilterSelect<T extends number>({
  prefix,
  options,
  value,
  onChange,
}: FilterSelectProps<T>) {
  const current = options.find((o) => o.value === value)
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => {
        const option = options.find((o) => String(o.value) === next)
        if (option) onChange(option.value)
      }}
    >
      <SelectTrigger
        aria-label={prefix}
        className={`${dropdownTriggerClass} data-[size=default]:h-9`}
      >
        <SelectValue>
          {prefix}: {current?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={String(o.value)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
