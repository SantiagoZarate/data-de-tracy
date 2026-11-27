import { cacheLife } from "next/cache";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCatalogCounts, listStoriesPage, type CatalogStory } from "@/src/db/queries.ts";
import { db } from "@/src/db/server.ts";
import { StoryPagination } from "@/src/ui/story-pagination.tsx";
import { storyPageHref } from "@/src/ui/story-page-url.ts";
import { ThemeSwitcher } from "@/src/ui/theme-switcher.tsx";

const PAGE_SIZE = 12;
const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

function youtubeUrl(videoId: string, startSeconds?: number) {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  if (startSeconds) url.searchParams.set("t", `${startSeconds}s`);
  return url.toString();
}

async function getCounts() {
  "use cache";
  cacheLife("hours");
  return getCatalogCounts(db);
}

async function getStories(page: number) {
  "use cache";
  cacheLife("hours");
  return listStoriesPage(db, page, PAGE_SIZE);
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Historias</h1>
        <ThemeSwitcher />
      </header>

      <Suspense fallback={<p className="text-muted-foreground">Cargando Historias…</p>}>
        <StoryGrid searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function StoryGrid({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { pagina } = await searchParams;
  const page = typeof pagina === "string" ? Number(pagina) : 1;
  if (
    pagina !== undefined &&
    (String(page) !== pagina || !Number.isSafeInteger(page) || page < 1)
  ) {
    redirect(storyPageHref(1));
  }

  const { storyCount, episodeCount } = await getCounts();
  const pageCount = Math.max(1, Math.ceil(storyCount / PAGE_SIZE));
  if (page > pageCount) redirect(storyPageHref(pageCount));

  const stories = await getStories(page);
  if (stories.length === 0) {
    if (page > 1) redirect(storyPageHref(1));
    return <p>Todavía no hay Historias en la base.</p>;
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        {storyCount} {storyCount === 1 ? "Historia" : "Historias"} de {episodeCount}{" "}
        {episodeCount === 1 ? "Episodio" : "Episodios"}.
      </p>
      <ol
        start={(page - 1) * PAGE_SIZE + 1}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </ol>
      {pageCount > 1 && <StoryPagination page={page} pageCount={pageCount} />}
    </>
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

function StoryCard({ story }: { story: CatalogStory }) {
  const { number, videoId } = story.episode;

  return (
    <li className="flex flex-col rounded-lg p-3 hover:bg-muted/70 has-focus-visible:bg-muted/70">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        <Image
          src={`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`}
          alt=""
          width={320}
          height={180}
          unoptimized
          className="h-full w-full object-cover"
        />
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

      <div className="flex flex-1 flex-col gap-3 pt-3">
        <div>
          <h2 className="text-sm font-semibold">
            <a href={youtubeUrl(videoId, story.startSeconds)} className="hover:underline">
              {story.title}
            </a>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Episodio #{number}</p>
        </div>
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
