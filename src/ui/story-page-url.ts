import { STORY_TYPES, THEMES, type StoryFilters, type StorySort } from "../story-metadata.ts";

type SearchParams = Record<string, string | string[] | undefined>;

export function parseStoryFilters({ pais, tematica, tipo }: SearchParams): StoryFilters {
  const country = typeof pais === "string" ? pais.toUpperCase() : "";
  const requestedThemes = Array.isArray(tematica) ? tematica : [tematica];
  const themes = THEMES.filter((theme) => requestedThemes.includes(theme));

  return {
    country: /^[A-Z]{2}$/.test(country) ? country : undefined,
    themes: themes.length ? themes : undefined,
    type: STORY_TYPES.find((type) => type === tipo),
  };
}

export function parseStorySort({ orden }: SearchParams): StorySort {
  return orden === "antiguas" ? "antiguas" : "recientes";
}

export function storyPageHref(
  page: number,
  { country, themes, type }: StoryFilters = {},
  sort: StorySort = "recientes",
) {
  const params = new URLSearchParams();
  if (country) params.set("pais", country);
  for (const theme of themes ?? []) params.append("tematica", theme);
  if (type) params.set("tipo", type);
  if (sort !== "recientes") params.set("orden", sort);
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
