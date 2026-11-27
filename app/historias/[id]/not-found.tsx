import { TransitionLink } from "glimm/next";

export default function StoryNotFound() {
  return (
    <main className="page-shell space-y-4">
      <h1 className="page-title">No encontramos esta Historia</h1>
      <TransitionLink href="/" className="text-link text-sm">
        Volver a Historias
      </TransitionLink>
    </main>
  );
}
