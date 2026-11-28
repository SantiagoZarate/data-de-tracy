import assert from "node:assert/strict";
import { test } from "node:test";
import { sliceStoryTranscript } from "./stories.ts";

test("recorta la transcripción a los timestamps de la Historia, incluidos sus extremos", () => {
  const segments = [
    { startSeconds: 9.9, text: "Charla previa" },
    { startSeconds: 10.2, text: "Hola, chicos" },
    { startSeconds: 17, text: "Les cuento que…" },
    { startSeconds: 20.7, text: "Les mando un abrazo" },
    { startSeconds: 21, text: "Comentario de los conductores" },
  ];

  assert.equal(
    sliceStoryTranscript(segments, { startSeconds: 10, endSeconds: 20 }),
    "Hola, chicos Les cuento que… Les mando un abrazo",
  );
  assert.equal(sliceStoryTranscript(segments, { startSeconds: 25, endSeconds: 30 }), "");
});
