import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/** Shared look for dropdown triggers so multi- and single-selects line up in a toolbar. */
export const dropdownTriggerClass =
  'flex h-9 w-full items-center justify-between gap-1 rounded-lg border border-input bg-card px-2.5 text-sm whitespace-nowrap text-fg shadow-xs transition-colors outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-auto sm:gap-2 sm:px-3'

type MultiSelectOption<T extends string> = { value: T; label: string }

type MultiSelectProps<T extends string> = {
  /** Trigger text; the selection count is appended, e.g. "Languages · 2". */
  label: string
  options: ReadonlyArray<MultiSelectOption<T>>
  selected: ReadonlyArray<T>
  /** Receives the full new selection after each toggle. */
  onChange: (selected: Array<T>) => void
}

/** Adds `item` to `list` if absent, removes it if present: (['a'], 'b') → ['a','b']. */
function toggleItem<T>(list: ReadonlyArray<T>, item: T): Array<T> {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

/**
 * A dropdown with a searchable, checkable option list. Toggling an option reports the
 * new selection immediately and keeps the list open for further picks.
 */
export function MultiSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
}: MultiSelectProps<T>) {
  return (
    <Popover>
      <PopoverTrigger className={dropdownTriggerClass}>
        <span>
          {label}
          {selected.length > 0 && (
            <span className="text-primary"> · {selected.length}</span>
          )}
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() =>
                      onChange(toggleItem(selected, option.value))
                    }
                  >
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border border-input',
                        isSelected &&
                          'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {isSelected && (
                        <CheckIcon className="size-3 text-primary-foreground" />
                      )}
                    </span>
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
