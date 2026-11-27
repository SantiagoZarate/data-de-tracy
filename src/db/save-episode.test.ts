import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Story } from "../ingestion/stories.ts";
import type { Db } from "./index.ts";
import { saveEpisode, type ProcessedEpisode } from "./save-episode.ts";
import { createTestDb } from "./test-db.ts";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});

afterEach(() => close());

function story(changes: Partial<Story> = {}): Story {
  return {
    type: "principal",
    startSeconds: 273,
    endSeconds: 629,
    title: "CHOQUE EN LA ESQUINA",
    summary: "Tras una noche de alcohol, el conductor embiste a una moto y huye.",
    storyCountry: "AR",
    senderCountry: "AR",
    themes: ["Crimen", "Drogas"],
    ...changes,
  };
}

function episode(stories: Story[]): ProcessedEpisode {
  return {
    status: "processed",
    videoId: "7DiB6_P9jd4",
    number: 100,
    title: "ATROPELLAR y HUIR",
    needsTitleReview: false,
    stories,
  };
}

const read = () =>
  db.query.episodes.findMany({
    with: {
      stories: { orderBy: { position: "asc" }, with: { themes: true } },
    },
  });

test("guarda el Episodio, sus Historias en orden y sus Temáticas", async () => {
  await saveEpisode(
    db,
    episode([story(), story({ type: "bonus", title: "PEGAMENTO EN LA BOCA" })]),
  );

  const [saved, ...others] = await read();
  assert.equal(others.length, 0);
  assert.equal(saved.number, 100);
  assert.deepEqual(
    saved.stories.map((s) => [s.position, s.type, s.title]),
    [
      [1, "principal", "CHOQUE EN LA ESQUINA"],
      [2, "bonus", "PEGAMENTO EN LA BOCA"],
    ],
  );
  assert.deepEqual(saved.stories[0].themes.map((t) => t.theme).sort(), ["Crimen", "Drogas"]);
});

test("guardar dos veces no crea duplicados y las Historias conservan su id", async () => {
  await saveEpisode(db, episode([story(), story({ type: "bonus" })]));
  const [before] = await read();

  await saveEpisode(
    db,
    episode([story({ summary: "Otro resumen", themes: ["Humor"] }), story({ type: "bonus" })]),
  );
  const after = await read();

  assert.equal(after.length, 1);
  assert.equal(after[0].stories.length, 2);
  assert.deepEqual(
    after[0].stories.map((s) => s.id),
    before.stories.map((s) => s.id),
  );
  assert.equal(after[0].stories[0].summary, "Otro resumen");
  assert.deepEqual(
    after[0].stories[0].themes.map((t) => t.theme),
    ["Humor"],
  );
});

test("si al re-procesar hay menos Historias, borra las que sobran", async () => {
  await saveEpisode(db, episode([story(), story({ type: "bonus" })]));
  await saveEpisode(db, episode([story()]));

  const [saved] = await read();
  assert.deepEqual(
    saved.stories.map((s) => s.position),
    [1],
  );
  const themes = await db.query.storyThemes.findMany();
  assert.equal(themes.length, 2, "las Temáticas de la Historia borrada se van en cascada");
});

test("un Episodio sin Historias se guarda igual", async () => {
  await saveEpisode(db, episode([]));

  const [saved] = await read();
  assert.equal(saved.videoId, "7DiB6_P9jd4");
  assert.deepEqual(saved.stories, []);
});

test("una Temática repetida se guarda una sola vez", async () => {
  await saveEpisode(db, episode([story({ themes: ["Humor", "Humor"] })]));

  const [saved] = await read();
  assert.deepEqual(
    saved.stories[0].themes.map((t) => t.theme),
    ["Humor"],
  );
});
