import { cacheLife } from "next/cache";
import { listEpisodesWithStories, type EpisodeWithStories } from "@/src/db/queries.ts";
import { db } from "@/src/db/server.ts";
import { ThemeSwitcher } from "@/src/ui/theme-switcher.tsx";

const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

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
  const storyCount = episodes.reduce((total, e) => total + e.stories.length, 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Episodios procesados</h1>
          <p className="mt-2 text-muted-foreground">
            {episodes.length} Episodios y {storyCount} Historias en la base.
          </p>
        </div>
        <ThemeSwitcher />
      </header>

      {episodes.length === 0 ? (
        <p>Todavía no hay Episodios en la base.</p>
      ) : (
        <ol className="flex flex-col gap-10">
          {episodes.map((episode) => (
            <EpisodeItem key={episode.videoId} episode={episode} />
          ))}
        </ol>
      )}

      <footer className="mt-16 border-t pt-6 text-sm text-muted-foreground">
        Sitio hecho por fans. No es oficial ni está asociado al podcast.
      </footer>
    </main>
  );
}

function EpisodeItem({ episode }: { episode: EpisodeWithStories }) {
  return (
    <li>
      <h2 className="text-xl font-semibold">
        <a href={youtubeUrl(episode.videoId)} className="hover:underline">
          #{episode.number} · {episode.title}
        </a>
      </h2>
      {episode.stories.length === 0 ? (
        <p className="mt-2 text-muted-foreground">Sin Historias.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {episode.stories.map((story) => (
            <li key={story.id} className="rounded-lg border bg-card p-4 text-card-foreground">
              <h3 className="flex flex-wrap items-center gap-2 font-medium">
                {story.title}
                {story.type === "bonus" && (
                  <span className="rounded-full bg-highlight px-2 py-0.5 text-xs text-highlight-foreground">
                    Bonus Track
                  </span>
                )}
              </h3>
              <p className="mt-2">{story.summary}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <dt>Dónde ocurre</dt>
                <dd>{story.storyCountry ? countryNames.of(story.storyCountry) : "No se sabe"}</dd>
                <dt>Desde dónde la mandaron</dt>
                <dd>{story.senderCountry ? countryNames.of(story.senderCountry) : "No se sabe"}</dd>
                <dt>Temáticas</dt>
                <dd>{story.themes.map((t) => t.theme).join(", ")}</dd>
              </dl>
              <a
                href={youtubeUrl(episode.videoId, story.startSeconds)}
                className="mt-3 inline-block text-sm font-medium underline"
              >
                Escuchar desde el minuto {Math.floor(story.startSeconds / 60)}
              </a>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
