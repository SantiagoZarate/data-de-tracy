import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_STORY_QUERY_LENGTH } from "../story-metadata.ts";
import { parseStoryFilters, parseStorySort, storyPageHref } from "./story-page-url.ts";

test("la primera página y la paginación conservan todos los filtros en la URL", () => {
  const filters = parseStoryFilters({
    q: "  camión rojo  ",
    pais: "ar",
    tematica: ["Polémica", "Amor"],
    tipo: "bonus",
  });

  assert.equal(
    storyPageHref(1, filters),
    "/?q=cami%C3%B3n+rojo&pais=AR&tematica=Amor&tematica=Pol%C3%A9mica&tipo=bonus",
  );
  assert.equal(
    storyPageHref(2, filters),
    "/?q=cami%C3%B3n+rojo&pais=AR&tematica=Amor&tematica=Pol%C3%A9mica&tipo=bonus&pagina=2",
  );
  assert.equal(storyPageHref(1), "/");
  assert.equal(storyPageHref(2), "/?pagina=2");
});

test("ignora filtros inválidos y descarta Temáticas repetidas", () => {
  assert.deepEqual(
    parseStoryFilters({
      pais: ["AR", "MX"],
      tematica: ["Humor", "Desconocida", "Humor"],
      tipo: "otro",
    }),
    { query: undefined, country: undefined, themes: ["Humor"], type: undefined },
  );
  assert.equal(storyPageHref(1, parseStoryFilters({ pais: "Argentina", tematica: "" })), "/");
});

test("omite la búsqueda vacía o repetida y acota su longitud", () => {
  assert.equal(storyPageHref(1, parseStoryFilters({ q: "  " })), "/");
  assert.equal(storyPageHref(1, parseStoryFilters({ q: ["uno", "dos"] })), "/");
  assert.equal(
    parseStoryFilters({ q: "x".repeat(MAX_STORY_QUERY_LENGTH + 1) }).query?.length,
    MAX_STORY_QUERY_LENGTH,
  );
});

test("genera la misma URL para los filtros del formulario y los leídos en el servidor", () => {
  const href = storyPageHref(1, { query: "  camión  ", themes: ["Polémica", "Amor"] });
  assert.equal(href, "/?q=cami%C3%B3n&tematica=Amor&tematica=Pol%C3%A9mica");
  assert.equal(storyPageHref(1, { query: "  ", themes: [] }), "/");
});

test("conserva el orden al paginar y usa el más reciente para órdenes no disponibles", () => {
  const sort = parseStorySort({ orden: "antiguas" });
  assert.equal(storyPageHref(2, { type: "bonus" }, sort), "/?tipo=bonus&orden=antiguas&pagina=2");
  assert.equal(storyPageHref(1, {}, sort), "/?orden=antiguas");
  assert.equal(parseStorySort({ orden: "mejor-puntuadas" }), "recientes");
  assert.equal(parseStorySort({ orden: ["antiguas", "recientes"] }), "recientes");
});
