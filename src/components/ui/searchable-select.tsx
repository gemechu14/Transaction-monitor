"use client"

import * as React from "react"
import { Combobox } from "@base-ui/react/combobox"
import { cn } from "cn"
import { CheckIcon, ChevronDownIcon, SearchIcon, SearchXIcon } from "lucide-react"

/**
 * A Select-style dropdown with a search box at the top of its popup and a list
 * capped at a fixed height (it scrolls past that). For long option lists.
 */
function SearchableSelect({
  items,
  value,
  onValueChange,
  getLabel,
  renderItem,
  disabledValue,
  placeholder = "Search…",
  emptyMessage = "No matches",
  "aria-label": ariaLabel,
  leading,
  className,
  popupClassName,
}: {
  /** Option ids, in display order. */
  items: readonly string[]
  value: string
  onValueChange: (value: string) => void
  /** Text shown in the trigger and matched against the search. */
  getLabel: (value: string) => string
  /** Custom content for an option row; defaults to its label. */
  renderItem?: (value: string) => React.ReactNode
  /** An option shown but not pickable (e.g. the other side's choice). */
  disabledValue?: string
  placeholder?: string
  emptyMessage?: string
  "aria-label"?: string
  /** Icon or dot before the value in the trigger. */
  leading?: React.ReactNode
  className?: string
  popupClassName?: string
}) {
  return (
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={(next) => next != null && onValueChange(next)}
      itemToStringLabel={getLabel}
    >
      <Combobox.Trigger
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-fit items-center justify-between gap-1.5 rounded-[10px] border border-input bg-card py-2 pr-2 pl-3 text-sm whitespace-nowrap transition-colors outline-none select-none hover:border-foreground-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-primary dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
      >
        {leading}
        <span className="min-w-0 flex-1 truncate text-left">
          <Combobox.Value>{(selected: string | null) => (selected ? getLabel(selected) : null)}</Combobox.Value>
        </span>
        <Combobox.Icon className="text-muted-foreground transition-transform duration-150 data-popup-open:rotate-180">
          <ChevronDownIcon />
        </Combobox.Icon>
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner align="start" sideOffset={6} className="isolate z-50">
          <Combobox.Popup
            aria-label={ariaLabel}
            className={cn(
              "flex max-h-[min(22rem,var(--available-height))] w-(--anchor-width) origin-(--transform-origin) flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
              popupClassName
            )}
          >
            <div className="border-b border-border p-2">
              <label className="flex h-9 items-center gap-2 rounded-lg bg-muted/60 px-2.5 text-muted-foreground ring-1 ring-transparent transition-shadow focus-within:bg-background focus-within:ring-primary/60">
                <SearchIcon className="size-4 shrink-0" />
                <Combobox.Input
                  placeholder={placeholder}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground any-pointer-coarse:text-base"
                />
              </label>
            </div>
            <Combobox.Empty className="empty:hidden">
              <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center text-sm text-muted-foreground">
                <SearchXIcon className="size-5" />
                {emptyMessage}
              </div>
            </Combobox.Empty>
            <Combobox.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 scroll-py-1 empty:hidden">
              {(item: string) => (
                <Combobox.Item
                  key={item}
                  value={item}
                  disabled={item === disabledValue}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-semibold"
                >
                  {renderItem ? renderItem(item) : <span className="flex-1">{getLabel(item)}</span>}
                  <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-primary-strong">
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

export { SearchableSelect }
