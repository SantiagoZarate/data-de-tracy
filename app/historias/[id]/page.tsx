import { Button } from "@ui-sdk/react/button";
import { TransitionLink } from "glimm/next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStoryById, listStoriesWithSharedThemes } from "@/src/db/queries.ts";
import { db } from "@/src/db/server.ts";
import { CountryFlag, countryNames } from "@/src/ui/country-flag.tsx";
import { StoryMentions } from "@/src/ui/story-mentions.tsx";
import { StoryRatingPreview } from "@/src/ui/story-rating-preview.tsx";
import { StoryVideo } from "@/src/ui/story-video.tsx";
import { ThemeSwitcher } from "@/src/ui/theme-switcher.tsx";

async function getStoryDetail(id: number) {
  "use cache";
  cacheLife("hours");
  const story = await getStoryById(db, id);
  if (!story) return;

  const relatedStories = await listStoriesWithSharedThemes(db, story);
  return { story, relatedStories };
}

export default function StoryPage({ params }: PageProps<"/historias/[id]">) {
  return (
    <main className="page-shell">
      <header className="page-header">
        <Button render={<TransitionLink href="/" />}>
          <svg
            aria-hidden="true"
            className="size-4 shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 10H4m5-5-5 5 5 5" />
          </svg>
          Volver a Historias
        </Button>
        <ThemeSwitcher />
      </header>

      <Suspense fallback={<p className="metadata">Cargando Historia…</p>}>
        <StoryDetail params={params} />
      </Suspense>
    </main>
  );
}

async function StoryDetail({ params }: Pick<PageProps<"/historias/[id]">, "params">) {
  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isSafeInteger(storyId) || storyId < 1 || String(storyId) !== id) notFound();

  const detail = await getStoryDetail(storyId);
  if (!detail) notFound();
  const { story, relatedStories } = detail;

  const youtubeUrl = new URL("https://www.youtube.com/watch");
  youtubeUrl.searchParams.set("v", story.episode.videoId);
  youtubeUrl.searchParams.set("t", `${story.startSeconds}s`);
  const youtubeLabelId = `youtube-link-label-${story.id}`;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <article key={story.id} className="min-w-0 space-y-8 sm:space-y-10">
        <StoryVideo
          videoId={story.episode.videoId}
          startSeconds={story.startSeconds}
          title={story.title}
        />

        <div className="space-y-5">
          <h1 className="page-title">{story.title}</h1>
          <p className="leading-relaxed">{story.summary}</p>
          <p className="metadata">
            Episodio #{story.episode.number}
            {story.type === "bonus" && " · Bonus Track"}
          </p>

          {(story.storyCountry || story.senderCountry) && (
            <dl className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
              {story.storyCountry && (
                <div>
                  <dt className="font-medium">País de la Historia</dt>
                  <dd className="flex items-center gap-2">
                    <CountryFlag code={story.storyCountry} />
                    {countryNames.of(story.storyCountry)}
                  </dd>
                </div>
              )}
              {story.senderCountry && (
                <div>
                  <dt className="font-medium">País del remitente</dt>
                  <dd className="flex items-center gap-2">
                    <CountryFlag code={story.senderCountry} />
                    {countryNames.of(story.senderCountry)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {story.themes.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium">Temáticas</h2>
              <ul className="flex flex-wrap gap-1.5">
                {story.themes.map(({ theme }) => (
                  <li key={theme} className="badge">
                    {theme}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button render={<a href={youtubeUrl.toString()} aria-labelledby={youtubeLabelId} />}>
            <span id={youtubeLabelId}>Ver en YouTube desde el inicio de la Historia</span>
          </Button>
        </div>

        <StoryRatingPreview />
        <StoryMentions title={story.title} summary={story.summary} />
      </article>

      <aside aria-label="Historias similares" className="space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="section-title">Historias similares</h2>
          <p className="metadata mt-1">Por Temáticas compartidas.</p>
        </div>

        {relatedStories.length === 0 ? (
          <p className="metadata">Todavía no hay otras Historias con estas Temáticas.</p>
        ) : (
          <ul className="space-y-2">
            {relatedStories.map((related) => (
              <li key={related.id}>
                <TransitionLink
                  href={`/historias/${related.id}`}
                  className="card-link group grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 p-2"
                >
                  <Image
                    src={`https://i.ytimg.com/vi/${encodeURIComponent(related.episode.videoId)}/mqdefault.jpg`}
                    width={320}
                    height={180}
                    alt=""
                    unoptimized
                    className="aspect-video w-full rounded-md bg-muted object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold group-hover:underline">{related.title}</p>
                    <p className="metadata mt-1 text-xs">
                      Episodio #{related.episode.number}
                      {related.type === "bonus" && " · Bonus Track"}
                    </p>
                  </div>
                </TransitionLink>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
