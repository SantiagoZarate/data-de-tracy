import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Db } from "./index.ts";
import { getCatalogCounts, getStoryById, listStoriesPage, listStoryCountries } from "./queries.ts";
import { saveEpisode } from "./save-episode.ts";
import { createTestDb } from "./test-db.ts";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});

afterEach(() => close());

const story = {
  startSeconds: 10,
  endSeconds: 20,
  summary: "Resumen",
  storyCountry: null,
  senderCountry: "MX",
};

test("pagina Historias del Episodio más nuevo al más viejo, en orden dentro de cada Episodio", async () => {
  await saveEpisode(db, {
    status: "processed",
    videoId: "viejo000000",
    number: 59,
    title: "VIEJO",
    needsTitleReview: false,
    stories: [
      {
        ...story,
        type: "principal",
        title: "PRIMERA",
        summary: "Primera del #59",
        themes: ["Amor"],
      },
      {
        ...story,
        type: "bonus",
        title: "SEGUNDA",
        summary: "Bonus del #59",
        themes: ["Humor", "Terror"],
      },
    ],
  });
  await saveEpisode(db, {
    status: "processed",
    videoId: "nuevo000000",
    number: 307,
    title: "NUEVO",
    needsTitleReview: false,
    stories: [{ ...story, type: "principal", title: "NUEVA", themes: ["Amistad"] }],
  });
  await saveEpisode(db, {
    status: "processed",
    videoId: "vacio000000",
    number: 308,
    title: "VACÍO",
    needsTitleReview: false,
    stories: [],
  });

  assert.deepEqual(await getCatalogCounts(db), { storyCount: 3, episodeCount: 3 });
  const firstPage = await listStoriesPage(db, 1, 2);
  assert.deepEqual(
    firstPage.map(({ episode, title }) => [episode.number, title]),
    [
      [307, "NUEVA"],
      [59, "PRIMERA"],
    ],
  );
  assert.equal(firstPage[1].summary, "Primera del #59");

  const secondPage = await listStoriesPage(db, 2, 2);
  assert.equal(secondPage.length, 1);
  const [bonus] = secondPage;
  assert.deepEqual(bonus.episode, firstPage[1].episode);
  assert.equal(bonus.type, "bonus");
  assert.equal(bonus.title, "SEGUNDA");
  assert.equal(bonus.summary, "Bonus del #59");
  assert.deepEqual(bonus.themes.map(({ theme }) => theme).sort(), ["Humor", "Terror"]);
  assert.deepEqual(await listStoriesPage(db, 3, 2), []);
});

test("busca una Historia por su ID y devuelve sus datos públicos", async () => {
  await saveEpisode(db, {
    status: "processed",
    videoId: "nuevo000000",
    number: 307,
    title: "NUEVO",
    needsTitleReview: false,
    stories: [
      { ...story, type: "principal", title: "PRIMERA", themes: ["Amistad"] },
      { ...story, type: "bonus", title: "BONUS", startSeconds: 15, themes: ["Humor"] },
    ],
  });

  const [first, bonus] = await listStoriesPage(db, 1, 2);
  assert.notEqual(first.id, bonus.id);
  assert.deepEqual(await getStoryById(db, bonus.id), {
    id: bonus.id,
    type: "bonus",
    startSeconds: 15,
    title: "BONUS",
    summary: "Resumen",
    storyCountry: null,
    senderCountry: "MX",
    episode: { number: 307, videoId: "nuevo000000" },
    themes: [{ theme: "Humor" }],
  });
  assert.equal(await getStoryById(db, 999), undefined);
});

test("combina país y tipo con cualquiera de las Temáticas antes de contar y paginar", async () => {
  const bonus = { ...story, type: "bonus", storyCountry: "AR", senderCountry: "UY" } as const;
  await saveEpisode(db, {
    status: "processed",
    videoId: "nuevo000000",
    number: 307,
    title: "NUEVO",
    needsTitleReview: false,
    stories: [
      { ...bonus, type: "principal", title: "PRINCIPAL", themes: ["Humor"] },
      { ...bonus, title: "DOS TEMÁTICAS", themes: ["Humor", "Terror"] },
      { ...bonus, title: "SOLO HUMOR", themes: ["Humor"] },
      { ...bonus, title: "OTRA TEMÁTICA", themes: ["Amor"] },
    ],
  });
  await saveEpisode(db, {
    status: "processed",
    videoId: "viejo000000",
    number: 59,
    title: "VIEJO",
    needsTitleReview: false,
    stories: [
      { ...bonus, title: "SOLO TERROR", themes: ["Terror"] },
      { ...bonus, storyCountry: "MX", senderCountry: "AR", title: "OTRO PAÍS", themes: ["Terror"] },
      { ...bonus, storyCountry: null, senderCountry: "AR", title: "SIN PAÍS", themes: ["Terror"] },
    ],
  });

  const filters = {
    country: "AR",
    themes: ["Humor", "Terror"],
    type: "bonus",
  } satisfies Parameters<typeof getCatalogCounts>[1];
  assert.deepEqual(await getCatalogCounts(db, filters), { storyCount: 3, episodeCount: 2 });
  const firstPage = await listStoriesPage(db, 1, 2, filters);
  const secondPage = await listStoriesPage(db, 2, 2, filters);
  assert.deepEqual(
    firstPage.map(({ title }) => title),
    ["DOS TEMÁTICAS", "SOLO HUMOR"],
  );
  assert.deepEqual(
    secondPage.map(({ title }) => title),
    ["SOLO TERROR"],
  );
  const oldestFirst = await listStoriesPage(db, 1, 2, filters, "antiguas");
  const oldestSecond = await listStoriesPage(db, 2, 2, filters, "antiguas");
  assert.deepEqual(
    oldestFirst.map(({ title }) => title),
    ["SOLO TERROR", "DOS TEMÁTICAS"],
  );
  assert.deepEqual(
    oldestSecond.map(({ title }) => title),
    ["SOLO HUMOR"],
  );
  assert.deepEqual(await getCatalogCounts(db, { country: "UY" }), {
    storyCount: 0,
    episodeCount: 0,
  });
  assert.deepEqual((await listStoryCountries(db)).sort(), ["AR", "MX"]);
});
