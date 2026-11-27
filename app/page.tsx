import { cacheLife } from "next/cache";
import { listEpisodesWithStories, type EpisodeWithStories } from "@/src/db/queries.ts";
import { db } from "@/src/db/server.ts";
import { ThemeSwitcher } from "@/src/ui/theme-switcher.tsx";

const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

type StoryWithEpisode = EpisodeWithStories["stories"][number] & {
  episode: Omit<EpisodeWithStories, "stories">;
};

function youtubeUrl(videoId: string, startSeconds?: number) {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  if (startSeconds) url.searchParams.set("t", `${startSeconds}s`);
  return url.toString();
}

export default async function Home() {
  "use cache";
  // La ingesta corre una vez por semana, fuera de Vercel.
  cacheLife("hours");

  const episodes = await listEpisodesWithStories(db);
  const stories: StoryWithEpisode[] = episodes.flatMap(({ stories, ...episode }) =>
    stories.map((story) => ({ ...story, episode })),
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Historias</h1>
          <p className="mt-2 text-muted-foreground">
            {stories.length} Historias de {episodes.length} Episodios.
          </p>
        </div>
        <ThemeSwitcher />
      </header>

      {stories.length === 0 ? (
        <p>Todavía no hay Historias en la base.</p>
      ) : (
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </ol>
      )}

      <footer className="mt-16 border-t pt-6 text-sm text-muted-foreground">
        Sitio hecho por fans. No es oficial ni está asociado al podcast.
      </footer>
    </main>
  );
}

function flagEmoji(countryCode: string) {
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
}

function Flag({ icon, label, code }: { icon: string; label: string; code: string }) {
  const name = `${label} ${countryNames.of(code)}`;
  return (
    <span
      title={name}
      className="flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-sm shadow-sm backdrop-blur-sm"
    >
      <span aria-hidden="true" className="text-xs">
        {icon}
      </span>
      <span aria-hidden="true">{flagEmoji(code)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

function StoryCard({ story }: { story: StoryWithEpisode }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground">
      <div className="relative flex aspect-video items-center justify-center bg-muted">
        <span aria-hidden="true" className="text-2xl font-semibold text-muted-foreground">
          #{story.episode.number}
        </span>
        {(story.storyCountry || story.senderCountry) && (
          <div className="absolute bottom-2 left-2 flex gap-1.5">
            {story.storyCountry && <Flag icon="📍" label="Ocurre en" code={story.storyCountry} />}
            {story.senderCountry && (
              <Flag icon="✉️" label="Enviada desde" code={story.senderCountry} />
            )}
          </div>
        )}
        {story.type === "bonus" && (
          <span className="absolute top-2 right-2 rounded-full bg-highlight px-2 py-0.5 text-xs font-medium text-highlight-foreground shadow-sm">
            Bonus Track
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold">
          <a
            href={youtubeUrl(story.episode.videoId, story.startSeconds)}
            className="hover:underline"
          >
            Episodio #{story.episode.number} · {story.episode.title}
          </a>
        </h2>
        <p className="line-clamp-4 text-sm">{story.summary}</p>
        <ul aria-label="Temáticas" className="mt-auto flex flex-wrap gap-1.5">
          {story.themes.map(({ theme }) => (
            <li key={theme} className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {theme}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}
