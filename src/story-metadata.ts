export const THEMES = [
  "Terror",
  "Paranormal",
  "Amor",
  "Desamor",
  "Familia",
  "Amistad",
  "Bizarro",
  "Humor",
  "Crimen",
  "Trabajo",
  "Viajes",
  "Escuela",
  "Famosos",
  "Drogas",
  "Triste",
  "Polémica",
  "Inmoral",
] as const;

export const STORY_TYPES = ["principal", "bonus"] as const;

export type StorySort = "recientes" | "antiguas";

export interface StoryFilters {
  country?: string;
  themes?: (typeof THEMES)[number][];
  type?: (typeof STORY_TYPES)[number];
}
