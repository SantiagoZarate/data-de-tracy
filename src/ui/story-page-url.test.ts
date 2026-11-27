import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStoryFilters, parseStorySort, storyPageHref } from "./story-page-url.ts";

test("la primera página y la paginación conservan todos los filtros en la URL", () => {
  const filters = parseStoryFilters({ pais: "ar", tematica: ["Polémica", "Amor"], tipo: "bonus" });

  assert.equal(
    storyPageHref(1, filters),
    "/?pais=AR&tematica=Amor&tematica=Pol%C3%A9mica&tipo=bonus",
  );
  assert.equal(
    storyPageHref(2, filters),
    "/?pais=AR&tematica=Amor&tematica=Pol%C3%A9mica&tipo=bonus&pagina=2",
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
    { country: undefined, themes: ["Humor"], type: undefined },
  );
  assert.equal(storyPageHref(1, parseStoryFilters({ pais: "Argentina", tematica: "" })), "/");
});

test("conserva el orden al paginar y usa el más reciente para órdenes no disponibles", () => {
  const sort = parseStorySort({ orden: "antiguas" });
  assert.equal(storyPageHref(2, { type: "bonus" }, sort), "/?tipo=bonus&orden=antiguas&pagina=2");
  assert.equal(storyPageHref(1, {}, sort), "/?orden=antiguas");
  assert.equal(parseStorySort({ orden: "mejor-puntuadas" }), "recientes");
  assert.equal(parseStorySort({ orden: ["antiguas", "recientes"] }), "recientes");
});
