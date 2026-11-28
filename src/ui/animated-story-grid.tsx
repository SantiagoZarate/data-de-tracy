"use client";

import { AnimatePresence, domMax, LazyMotion, useIsPresent, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { forwardRef, useState, type ReactNode } from "react";

const StoryGridItem = forwardRef<HTMLLIElement, { children: ReactNode; reduceMotion: boolean }>(
  function StoryGridItem({ children, reduceMotion }, ref) {
    const isPresent = useIsPresent();

    return (
      <m.li
        ref={ref}
        inert={!isPresent}
        className={isPresent ? "relative z-10" : "z-0"}
        layout={reduceMotion ? false : "position"}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
        exit={
          reduceMotion
            ? undefined
            : { opacity: 0, scale: 0.96, transition: { duration: 0.14, ease: [0.23, 1, 0.32, 1] } }
        }
        transition={{
          duration: 0.18,
          ease: [0.23, 1, 0.32, 1],
          layout: { duration: 0.2, ease: [0.65, 0, 0.35, 1] },
        }}
      >
        {children}
      </m.li>
    );
  },
);

export function AnimatedStoryGrid({
  criteriaHref,
  start,
  items,
}: {
  criteriaHref: string;
  start: number;
  items: { id: number; content: ReactNode }[];
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const [previous, setPrevious] = useState({ criteriaHref, start, presenceKey: 0 });

  if (previous.criteriaHref !== criteriaHref || previous.start !== start) {
    // Cambiar solo de página monta una grilla nueva sin animar la entrada ni la salida.
    const presenceKey =
      previous.criteriaHref === criteriaHref ? previous.presenceKey + 1 : previous.presenceKey;
    setPrevious({ criteriaHref, start, presenceKey });
  }

  return (
    <ol
      start={start}
      aria-hidden={items.length === 0 ? true : undefined}
      className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <LazyMotion features={domMax}>
        <AnimatePresence
          key={previous.presenceKey}
          initial={false}
          mode={reduceMotion ? "sync" : "popLayout"}
        >
          {items.map(({ id, content }) => (
            <StoryGridItem key={id} reduceMotion={reduceMotion}>
              {content}
            </StoryGridItem>
          ))}
        </AnimatePresence>
      </LazyMotion>
    </ol>
  );
}
