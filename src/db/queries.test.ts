import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Db } from "./index.ts";
import { getCatalogCounts, listStoriesPage } from "./queries.ts";
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
