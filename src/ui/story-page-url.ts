import {
  MAX_STORY_QUERY_LENGTH,
  STORY_TYPES,
  THEMES,
  type StoryFilters,
  type StorySort,
} from "../story-metadata.ts";

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeStoryQuery(query: string) {
  return query.trim().slice(0, MAX_STORY_QUERY_LENGTH).trimEnd();
}

export function parseStoryFilters({ q, pais, tematica, tipo }: SearchParams): StoryFilters {
  const query = typeof q === "string" ? normalizeStoryQuery(q) : "";
  const country = typeof pais === "string" ? pais.toUpperCase() : "";
  const requestedThemes = Array.isArray(tematica) ? tematica : [tematica];
  const themes = THEMES.filter((theme) => requestedThemes.includes(theme));

  return {
    query: query || undefined,
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
  { query, country, themes, type }: StoryFilters = {},
  sort: StorySort = "recientes",
) {
  const params = new URLSearchParams();
  const text = normalizeStoryQuery(query ?? "");
  if (text) params.set("q", text);
  if (country) params.set("pais", country);
  for (const theme of THEMES) {
    if (themes?.includes(theme)) params.append("tematica", theme);
  }
  if (type) params.set("tipo", type);
  if (sort !== "recientes") params.set("orden", sort);
  if (page > 1) params.set("pagina", String(page));
  const search = params.toString();
  return search ? `/?${search}` : "/";
}
