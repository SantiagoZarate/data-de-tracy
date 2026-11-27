"use client";

import { Button } from "@ui-sdk/react/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import { TransitionLink } from "glimm/next";
import Form from "next/form";
import { useState } from "react";
import { THEMES, type StoryFilters, type StorySort } from "../story-metadata.ts";
import { countryNames } from "./country-flag.tsx";
import { storyPageHref } from "./story-page-url.ts";

const collator = new Intl.Collator("es");
const themeOptions = [...THEMES].sort(collator.compare).map((theme) => ({
  value: theme,
  label: theme,
}));
const typeOptions = [
  { value: "", label: "Todos los tipos" },
  { value: "principal", label: "Principal" },
  { value: "bonus", label: "Bonus Track" },
];
const sortOptions = [
  { value: "recientes", label: "Más recientes" },
  { value: "antiguas", label: "Más antiguas" },
  { value: "mejor-puntuadas", label: "Mejor puntuadas (sin datos)", disabled: true },
  { value: "peor-puntuadas", label: "Peor puntuadas (sin datos)", disabled: true },
];

function FilterSelect({
  name,
  label,
  options,
  defaultValue,
  placeholder,
  multiple = false,
}: {
  name: string;
  label: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
} & ({ defaultValue: string; multiple?: false } | { defaultValue: string[]; multiple: true })) {
  const [animatePopup, setAnimatePopup] = useState(false);

  return (
    <div className="grid min-w-0 gap-2">
      <Select<string, boolean>
        name={name}
        items={options}
        defaultValue={defaultValue}
        multiple={multiple}
        placeholder={placeholder}
        onOpenChange={(_, { source }) =>
          setAnimatePopup(source === "mouse" || source === "touch" || source === "pen")
        }
      >
        <SelectLabel className="text-sm font-medium">{label}</SelectLabel>
        <SelectTrigger className="h-11 w-full min-w-0 bg-card focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring">
          <SelectValue className="truncate">
            {({ label, labels }) =>
              labels.length > 1 ? `${labels[0]} y ${labels.length - 1} más` : label || placeholder
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          sideOffset={6}
          className="story-filter-popup max-h-[min(20rem,var(--available-height))] bg-card"
          data-animate={animatePopup ? "" : undefined}
        >
          {options.map(({ value, label, disabled }) => (
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
  const { country, themes, type } = filters;
  const hasFilters = storyPageHref(1, filters) !== "/";
  const countryOptions = [...new Set(country ? [...countries, country] : countries)]
    .map((code) => ({ value: code, label: countryNames.of(code) ?? code }))
    .sort((a, b) => collator.compare(a.label, b.label));

  return (
    <Form
      action="/"
      aria-label="Filtros de Historias"
      className="mb-6 flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-end"
    >
      <div
        key={storyPageHref(page, filters, sort)}
        className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <FilterSelect
          name="pais"
          label="País de la Historia"
          options={[{ value: "", label: "Todos los países" }, ...countryOptions]}
          defaultValue={country ?? ""}
        />
        <FilterSelect
          name="tematica"
          label="Temáticas"
          options={themeOptions}
          defaultValue={themes ?? []}
          placeholder="Todas las Temáticas"
          multiple
        />
        <FilterSelect
          name="tipo"
          label="Tipo de Historia"
          options={typeOptions}
          defaultValue={type ?? ""}
        />
        <FilterSelect name="orden" label="Ordenar por" options={sortOptions} defaultValue={sort} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" data-variant="solid">
          Aplicar
        </Button>
        {hasFilters && (
          <TransitionLink href={storyPageHref(1, {}, sort)} className="text-link text-sm">
            Limpiar filtros
          </TransitionLink>
        )}
      </div>
    </Form>
  );
}
