import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { eq } from "drizzle-orm";
import type { Story } from "../ingestion/stories.ts";
import type { Db } from "./index.ts";
import { listStoriesPage } from "./queries.ts";
import { saveEpisode, type ProcessedEpisode } from "./save-episode.ts";
import { stories, storyThemes } from "./schema.ts";
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

function episode(stories: ProcessedEpisode["stories"]): ProcessedEpisode {
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

test("al re-procesar conserva las Correcciones manuales y actualiza los demás campos", async () => {
  const principal = story();
  const bonus = story({
    type: "bonus",
    startSeconds: 850,
    endSeconds: 1230,
  });
  await saveEpisode(db, episode([principal, bonus]));
  const [before] = await read();
  const [principalId, bonusId] = before.stories.map(({ id }) => id);

  await db
    .update(stories)
    .set({
      title: "Título corregido",
      titleCorrected: true,
      storyCountry: null,
      storyCountryCorrected: true,
      themesCorrected: true,
    })
    .where(eq(stories.id, principalId));
  await db.delete(storyThemes).where(eq(storyThemes.storyId, principalId));
  await db.insert(storyThemes).values({ storyId: principalId, theme: "Viajes" });
  await db
    .update(stories)
    .set({
      summary: "Resumen corregido",
      summaryCorrected: true,
      senderCountry: "UY",
      senderCountryCorrected: true,
    })
    .where(eq(stories.id, bonusId));

  const regenerated = {
    title: "Título regenerado",
    summary: "Resumen regenerado",
    storyCountry: "MX",
    senderCountry: "CL",
    themes: ["Humor"],
  } satisfies Partial<Story>;
  await saveEpisode(
    db,
    episode([
      { ...principal, ...regenerated, startSeconds: 280 },
      { ...bonus, ...regenerated },
    ]),
  );

  const [after] = await read();
  assert.deepEqual(
    after.stories.map(
      ({ id, title, summary, storyCountry, senderCountry, startSeconds, themes }) => ({
        id,
        title,
        summary,
        storyCountry,
        senderCountry,
        startSeconds,
        themes: themes.map(({ theme }) => theme),
      }),
    ),
    [
      {
        id: principalId,
        title: "Título corregido",
        summary: "Resumen regenerado",
        storyCountry: null,
        senderCountry: "CL",
        startSeconds: 280,
        themes: ["Viajes"],
      },
      {
        id: bonusId,
        title: "Título regenerado",
        summary: "Resumen corregido",
        storyCountry: "MX",
        senderCountry: "UY",
        startSeconds: 850,
        themes: ["Humor"],
      },
    ],
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

test("el índice conserva correcciones y se actualiza al guardar o quitar Historias", async () => {
  const principal = story();
  await saveEpisode(
    db,
    episode([
      { ...principal, transcript: "Jirafa" },
      { ...story({ type: "bonus" }), transcript: "Cocodrilo" },
    ]),
  );
  const [
    {
      stories: [saved, bonus],
    },
  ] = await read();
  await db
    .update(stories)
    .set({ title: "Título corregido", titleCorrected: true })
    .where(eq(stories.id, saved.id));

  const ids = async (query: string) =>
    (await listStoriesPage(db, 1, 12, { query })).map(({ id }) => id);
  assert.deepEqual(await ids("corregido"), [saved.id]);
  assert.deepEqual(await ids("choque"), [bonus.id]);

  await saveEpisode(db, episode([principal]));
  assert.deepEqual(await ids("jirafa"), [saved.id]);
  assert.deepEqual(await ids("cocodrilo"), []);

  await saveEpisode(db, episode([{ ...principal, transcript: "Elefante" }]));
  assert.deepEqual(await ids("corregido"), [saved.id]);
  assert.deepEqual(await ids("choque"), []);
  assert.deepEqual(await ids("jirafa"), []);
  assert.deepEqual(await ids("elefante"), [saved.id]);

  await saveEpisode(db, episode([{ ...principal, startSeconds: 290 }]));
  assert.deepEqual(await ids("elefante"), []);
});

test("deja intacto el Episodio si una Historia corregida desaparece o cambia de posición", async () => {
  const principal = story();
  const firstBonus = story({ type: "bonus", startSeconds: 850, endSeconds: 1230 });
  const secondBonus = story({ type: "bonus", startSeconds: 1420, endSeconds: 1790 });
  await saveEpisode(db, episode([principal, firstBonus, secondBonus]));
  const [original] = await read();
  await db
    .update(stories)
    .set({ title: "Bonus Track corregido", titleCorrected: true })
    .where(eq(stories.id, original.stories[1].id));
  const before = await read();

  const changedPrincipal = { ...principal, summary: "Otro resumen" };
  for (const regenerated of [
    [changedPrincipal, secondBonus],
    [changedPrincipal, secondBonus, firstBonus],
  ]) {
    await assert.rejects(
      saveEpisode(db, { ...episode(regenerated), title: "Otro título" }),
      /Historia 2 con Correcciones manuales del Episodio #100/,
    );
    assert.deepEqual(await read(), before);
  }
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
