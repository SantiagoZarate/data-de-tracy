"use client";

import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input, InputClear, InputGroup } from "@ui-sdk/react/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MAX_STORY_QUERY_LENGTH, type StoryFilters, type StorySort } from "../story-metadata.ts";
import { countryNames } from "./country-flag.tsx";
import { SearchIcon } from "./search-icon.tsx";
import { StoryFilterPicker, storyTypeOptions } from "./story-filter-picker.tsx";
import { storyPageHref } from "./story-page-url.ts";

const SEARCH_DEBOUNCE_MS = 300;
const collator = new Intl.Collator("es");
const sortOptions = [
  { value: "recientes", label: "Más recientes" },
  { value: "antiguas", label: "Más antiguas" },
  { value: "mejor-puntuadas", label: "Mejor puntuadas (sin datos)", disabled: true },
  { value: "peor-puntuadas", label: "Peor puntuadas (sin datos)", disabled: true },
];

function SortSelect({
  value,
  onChange,
}: {
  value: StorySort;
  onChange: (sort: StorySort) => void;
}) {
  const [animatePopup, setAnimatePopup] = useState(false);

  return (
    <div className="col-start-3 row-start-1 flex items-center gap-2 justify-self-end max-[380px]:col-start-2 max-[380px]:row-start-2 sm:col-start-4">
      <Select
        name="orden"
        items={sortOptions}
        value={value}
        onValueChange={(value) => onChange(value === "antiguas" ? "antiguas" : "recientes")}
        onOpenChange={(_, { source }) =>
          setAnimatePopup(source === "mouse" || source === "touch" || source === "pen")
        }
      >
        <SelectLabel className="sr-only text-sm font-medium text-muted-foreground lg:not-sr-only">
          Ordenar por
        </SelectLabel>
        <SelectTrigger className="h-10 min-w-0 bg-card px-2 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring sm:px-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          align="end"
          sideOffset={6}
          className="story-filter-popup max-h-[min(20rem,var(--available-height))] bg-card"
          data-animate={animatePopup ? "" : undefined}
        >
          {sortOptions.map(({ value, label, disabled }) => (
            <SelectItem
              key={value}
              value={value}
              disabled={disabled}
              className="min-h-9 data-selected:font-semibold"
            >
              {label}
              <SelectItemIndicator />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type StoryCriteria = { filters: StoryFilters; sort: StorySort };

export function StoryFilterForm({
  filters,
  countries,
  page,
  sort,
}: {
  filters: StoryFilters;
  countries: string[];
  page: number;
  sort: StorySort;
}) {
  const router = useRouter();
  const appliedHref = storyPageHref(page, filters, sort);
  const [draft, setDraft] = useState<StoryCriteria>({ filters, sort });
  const [isSearchPending, startSearch] = useTransition();
  const [isFilterPending, startFilterChange] = useTransition();
  const isPending = isSearchPending || isFilterPending;
  const requestedHref = useRef(appliedHref);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const filtersTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const cancelSearch = () => clearTimeout(searchTimer.current);
    window.addEventListener("popstate", cancelSearch);
    return () => {
      window.removeEventListener("popstate", cancelSearch);
      cancelSearch();
    };
  }, []);

  useEffect(() => {
    // Solo una navegación externa reemplaza lo que se está escribiendo o seleccionando.
    if (isPending || requestedHref.current === appliedHref) return;
    clearTimeout(searchTimer.current);
    requestedHref.current = appliedHref;
    setDraft({ filters, sort });
  }, [appliedHref, filters, sort, isPending]);

  function showResults(next: StoryCriteria, history: "push" | "replace") {
    clearTimeout(searchTimer.current);
    const href = storyPageHref(1, next.filters, next.sort);
    if (href === requestedHref.current) return;
    requestedHref.current = href;
    const startTransition = history === "replace" ? startSearch : startFilterChange;
    startTransition(() => router[history](href, { scroll: false }));
  }

  function changeQuery(query: string) {
    const next = { ...draft, filters: { ...draft.filters, query } };
    setDraft(next);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => showResults(next, "replace"), SEARCH_DEBOUNCE_MS);
  }

  function changeCriteria(next: StoryCriteria) {
    setDraft(next);
    showResults(next, "push");
  }

  function changeFilters(changes: Partial<StoryFilters>) {
    changeCriteria({ ...draft, filters: { ...draft.filters, ...changes } });
  }

  const { query, country, themes, type } = draft.filters;
  const countryOptions = [...new Set(country ? [...countries, country] : countries)]
    .map((code) => ({ value: code, label: countryNames.of(code) ?? code }))
    .sort((a, b) => collator.compare(a.label, b.label));
  const typeLabel = storyTypeOptions.find(({ value }) => value === type)?.label;
  const activeFilters = [
    ...(country
      ? [
          {
            key: "country",
            name: "País",
            label: countryNames.of(country) ?? country,
            remove: { country: undefined },
          },
        ]
      : []),
    ...(themes ?? []).map((theme) => ({
      key: `theme-${theme}`,
      name: "Temática",
      label: theme,
      remove: { themes: themes?.filter((value) => value !== theme) },
    })),
    ...(typeLabel
      ? [{ key: "type", name: "Tipo", label: typeLabel, remove: { type: undefined } }]
      : []),
  ];

  return (
    <Form
      action="/"
      aria-label="Búsqueda y filtros de Historias"
      className="mb-6 grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2 max-[380px]:grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[clamp(9rem,22vw,16rem)_auto_minmax(0,1fr)_auto] sm:gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        showResults(draft, "replace");
      }}
    >
      <Field name="q" className="col-start-1 row-start-1 min-w-0">
        <FieldLabel className="sr-only">Palabras clave</FieldLabel>
        <InputGroup className="h-10 w-full gap-0.5 bg-card px-1.5 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-ring sm:gap-1 sm:px-2.5">
          <SearchIcon />
          <Input
            type="search"
            value={query ?? ""}
            onValueChange={changeQuery}
            maxLength={MAX_STORY_QUERY_LENGTH}
            placeholder="Buscar Historias"
            className="w-full min-w-0 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <InputClear aria-label="Limpiar búsqueda" className="size-6 sm:size-7">
              <span aria-hidden="true" className="text-base">
                ×
              </span>
            </InputClear>
          )}
          {isSearchPending && (
            <svg
              aria-hidden="true"
              className="size-4 shrink-0 text-primary motion-safe:animate-spin"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="8" cy="8" r="5.5" className="opacity-25" />
              <path d="M8 2.5A5.5 5.5 0 0 1 13.5 8" />
            </svg>
          )}
        </InputGroup>
        <output className="sr-only">{isSearchPending ? "Buscando Historias…" : ""}</output>
      </Field>
      <StoryFilterPicker
        filters={draft.filters}
        countries={countryOptions}
        onChange={changeFilters}
        triggerRef={filtersTrigger}
      />
      {activeFilters.length > 0 && (
        <ul
          aria-label="Filtros activos"
          className="col-span-full flex flex-wrap gap-1.5 self-center max-[380px]:col-span-1 sm:col-span-1 sm:col-start-3 sm:row-start-1"
        >
          {activeFilters.map(({ key, name, label, remove }) => (
            <li key={key} className="min-w-0">
              <Button
                type="button"
                aria-label={`Quitar filtro de ${name}: ${label}`}
                className="min-h-8 max-w-full gap-1.5 px-2.5 py-1 text-xs sm:text-sm"
                onClick={() => {
                  filtersTrigger.current?.focus();
                  changeFilters(remove);
                }}
              >
                <span className="truncate">{label}</span>
                <span aria-hidden="true" className="shrink-0 text-base leading-none">
                  ×
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <SortSelect value={draft.sort} onChange={(sort) => changeCriteria({ ...draft, sort })} />
    </Form>
  );
}
