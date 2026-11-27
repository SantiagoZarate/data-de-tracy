"use client";

import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Rating } from "@ui-sdk/react/rating";
import { Textarea } from "@ui-sdk/react/textarea";

export function StoryRatingPreview() {
  return (
    <section className="surface space-y-4 p-4 sm:p-6">
      <header>
        <h2 className="section-title">Puntuación y opinión</h2>
        <p className="metadata mt-1">
          Demostración: podés probar las estrellas y escribir una opinión. Los cambios no se guardan
          ni se publican.
        </p>
      </header>
      <Rating
        aria-label="Tu puntuación"
        deselectable
        getValueLabel={(value) => `${value} ${value === 1 ? "estrella" : "estrellas"}`}
        className="[&_[data-slot=rating-item]]:size-10"
      />
      <Field name="opinion">
        <FieldLabel>Tu opinión</FieldLabel>
        <Textarea rows={3} placeholder="¿Qué te pareció esta Historia?" />
      </Field>
    </section>
  );
}
