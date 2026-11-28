"use client";

import { Button } from "@ui-sdk/react/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPage,
  createCommandController,
} from "@ui-sdk/react/command";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@ui-sdk/react/popover";
import { useId, useState, type Ref } from "react";
import { THEMES, type StoryFilters } from "../story-metadata.ts";
import { SearchIcon } from "./search-icon.tsx";

const spanish = new Intl.Collator("es");
const themeOptions = [...THEMES].sort(spanish.compare);

export const storyTypeOptions = [
  { value: "", label: "Todos los tipos" },
  { value: "principal", label: "Principal" },
  { value: "bonus", label: "Bonus Track" },
] satisfies { value: NonNullable<StoryFilters["type"]> | ""; label: string }[];

interface FilterOption {
  value: string;
  label: string;
  checked: boolean;
  changes: Partial<StoryFilters>;
}

export function StoryFilterPicker({
  filters: { country, themes = [], type },
  countries,
  onChange,
  triggerRef,
}: {
  filters: StoryFilters;
  countries: { value: string; label: string }[];
  onChange: (changes: Partial<StoryFilters>) => void;
  triggerRef: Ref<HTMLButtonElement>;
}) {
  const [controller] = useState(createCommandController);
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<string[]>([]);
  const searchInputId = useId();

  const groups = [
    {
      value: "country",
      label: "País de la Historia",
      options: [{ value: "", label: "Todos los países" }, ...countries].map(({ value, label }) => ({
        value,
        label,
        checked: country === value,
        changes: { country: value || undefined },
      })),
    },
    {
      value: "themes",
      label: "Temáticas",
      options: themeOptions.map((theme) => ({
        value: theme,
        label: theme,
        checked: themes.includes(theme),
        changes: {
          themes: themes.includes(theme)
            ? themes.filter((value) => value !== theme)
            : [...themes, theme],
        },
      })),
    },
    {
      value: "type",
      label: "Tipo de Historia",
      options: storyTypeOptions.map(({ value, label }) => ({
        value,
        label,
        checked: type === value,
        changes: { type: value || undefined },
      })),
    },
  ];
  const activeGroup = groups.find(({ value }) => value === pages.at(-1));

  function renderOption(
    group: (typeof groups)[number],
    { value, label, checked, changes }: FilterOption,
  ) {
    return (
      <CommandItem
        key={value}
        value={`${group.value}:${value}`}
        label={label}
        keywords={[group.label]}
        className="min-h-10 justify-between px-3"
        onSelect={() => onChange(changes)}
      >
        {label}
        {checked && (
          <>
            <span className="sr-only">, aplicado</span>
            <span aria-hidden="true" className="text-primary">
              ✓
            </span>
          </>
        )}
      </CommandItem>
    );
  }

  return (
    <Popover
      presentation="auto"
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
          setPages([]);
        }
      }}
    >
      <PopoverTrigger
        ref={triggerRef}
        className="col-start-2 row-start-1 h-10 bg-card px-2.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring data-open:bg-muted sm:px-3"
      >
        Filtros
        <svg aria-hidden="true" className="size-3.5" viewBox="0 0 16 16" fill="none">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </PopoverTrigger>
      <PopoverContent
        initialFocus='[data-slot="command-input"]'
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="gap-0 bg-card p-1 data-[presentation=popover]:w-72 data-[presentation=popover]:max-w-[calc(100dvw-1.5rem)]"
      >
        <PopoverTitle className="sr-only">Filtros de Historias</PopoverTitle>
        <Command
          controller={controller}
          query={query}
          onQueryChange={setQuery}
          pages={pages}
          onPagesChange={setPages}
          filter="contains"
          className="w-full rounded-lg border-0 bg-transparent"
        >
          <label
            htmlFor={searchInputId}
            className="rounded-t-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring"
          >
            <SearchIcon />
            <CommandInput
              id={searchInputId}
              aria-label="Buscar opciones de filtro"
              placeholder={
                activeGroup
                  ? `Buscar en ${activeGroup.label.toLowerCase()}`
                  : "Buscar país, temática o tipo…"
              }
              className="h-10 min-w-0"
            />
          </label>
          {activeGroup && (
            <div className="flex items-center gap-2 px-2 pt-1">
              <Button
                type="button"
                className="min-h-8 px-2.5 py-1 text-xs"
                onClick={() => {
                  controller.pop();
                  controller.focus();
                }}
              >
                <span aria-hidden="true">←</span> Categorías
              </Button>
              <span className="text-xs font-medium text-muted-foreground">{activeGroup.label}</span>
            </div>
          )}
          <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
            No hay filtros que coincidan.
          </CommandEmpty>
          <CommandList className="max-h-[min(16rem,42dvh)]">
            <CommandPage>
              {query.trim()
                ? groups.map((group) => (
                    <CommandGroup key={group.value}>
                      <CommandGroupLabel>{group.label}</CommandGroupLabel>
                      {group.options.map((option) => renderOption(group, option))}
                    </CommandGroup>
                  ))
                : groups.map((group) => (
                    <CommandItem
                      key={group.value}
                      value={group.value}
                      page={group.value}
                      className="min-h-10 justify-between px-3"
                    >
                      {group.label}
                      <span aria-hidden="true" className="text-muted-foreground">
                        ›
                      </span>
                    </CommandItem>
                  ))}
            </CommandPage>
            {groups.map((group) => (
              <CommandPage key={group.value} value={group.value}>
                {group.options.map((option) => renderOption(group, option))}
              </CommandPage>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
