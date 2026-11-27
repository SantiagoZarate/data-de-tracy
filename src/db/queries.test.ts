import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Db } from "./index.ts";
import { listEpisodesWithStories } from "./queries.ts";
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

test("lista los Episodios del más nuevo al más viejo, con sus Historias en orden", async () => {
  await saveEpisode(db, {
    status: "processed",
    videoId: "viejo000000",
    number: 59,
    title: "VIEJO",
    needsTitleReview: false,
    stories: [
      { ...story, type: "principal", title: "PRIMERA", themes: ["Amor"] },
      { ...story, type: "bonus", title: "SEGUNDA", themes: ["Humor", "Terror"] },
    ],
  });
  await saveEpisode(db, {
    status: "processed",
    videoId: "nuevo000000",
    number: 307,
    title: "NUEVO",
    needsTitleReview: false,
    stories: [],
  });

  const episodes = await listEpisodesWithStories(db);

  assert.deepEqual(
    episodes.map((e) => e.number),
    [307, 59],
  );
  assert.deepEqual(episodes[0].stories, []);
  assert.deepEqual(
    episodes[1].stories.map((s) => s.title),
    ["PRIMERA", "SEGUNDA"],
  );
  assert.deepEqual(episodes[1].stories[1].themes.map((t) => t.theme).sort(), ["Humor", "Terror"]);
});
