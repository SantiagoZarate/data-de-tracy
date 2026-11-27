import { TransitionLink } from "glimm/next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  getCatalogCounts,
  listStoriesPage,
  listStoryCountries,
  type CatalogStory,
} from "@/src/db/queries.ts";
import { db } from "@/src/db/server.ts";
import type { StoryFilters, StorySort } from "@/src/story-metadata.ts";
import { CountryFlag, countryNames } from "@/src/ui/country-flag.tsx";
import { StoryFilterForm } from "@/src/ui/story-filter-form.tsx";
import { StoryPagination } from "@/src/ui/story-pagination.tsx";
import { parseStoryFilters, parseStorySort, storyPageHref } from "@/src/ui/story-page-url.ts";
import { ThemeSwitcher } from "@/src/ui/theme-switcher.tsx";

const PAGE_SIZE = 12;

async function getCounts(filters: StoryFilters) {
  "use cache";
  cacheLife("hours");
  return getCatalogCounts(db, filters);
}

async function getStories(page: number, filters: StoryFilters, sort: StorySort) {
  "use cache";
  cacheLife("hours");
  return listStoriesPage(db, page, PAGE_SIZE, filters, sort);
}

async function getCountries() {
  "use cache";
  cacheLife("hours");
  return listStoryCountries(db);
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="page-shell">
      <header className="page-header">
        <h1 className="page-title">Historias</h1>
        <ThemeSwitcher />
      </header>

      <Suspense fallback={<p className="metadata">Cargando Historias…</p>}>
        <StoryGrid searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function StoryGrid({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const filters = parseStoryFilters(params);
  const sort = parseStorySort(params);
  const { pagina } = params;
  const page = typeof pagina === "string" ? Number(pagina) : 1;
  const firstPageHref = storyPageHref(1, filters, sort);
  if (
    pagina !== undefined &&
    (String(page) !== pagina || !Number.isSafeInteger(page) || page < 1)
  ) {
    redirect(firstPageHref);
  }

  const [{ storyCount, episodeCount }, countries] = await Promise.all([
    getCounts(filters),
    getCountries(),
  ]);
  const pageCount = Math.max(1, Math.ceil(storyCount / PAGE_SIZE));
  if (page > pageCount) redirect(storyPageHref(pageCount, filters, sort));

  const stories = storyCount > 0 ? await getStories(page, filters, sort) : [];
  if (stories.length === 0 && page > 1) redirect(firstPageHref);

  const summary = `${storyCount} ${storyCount === 1 ? "Historia" : "Historias"} de ${episodeCount} ${episodeCount === 1 ? "Episodio" : "Episodios"}.`;
  const emptyMessage =
    storyPageHref(1, filters) === "/"
      ? "Todavía no hay Historias en la base."
      : "No hay Historias que coincidan con estos filtros.";

  return (
    <>
      <StoryFilterForm filters={filters} countries={countries} page={page} sort={sort} />
      <output className="metadata mb-5 block">{stories.length > 0 ? summary : emptyMessage}</output>
      {stories.length > 0 && (
        <>
          <ol
            start={(page - 1) * PAGE_SIZE + 1}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </ol>
          {pageCount > 1 && (
            <StoryPagination page={page} pageCount={pageCount} filters={filters} sort={sort} />
          )}
        </>
      )}
    </>
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
      <CountryFlag code={code} />
      <span className="sr-only">{name}</span>
    </span>
  );
}

function StoryCard({ story }: { story: CatalogStory }) {
  const { number, videoId } = story.episode;
  const titleId = `story-title-${story.id}`;

  return (
    <li>
      <TransitionLink
        href={`/historias/${story.id}`}
        aria-labelledby={titleId}
        className="card-link group flex h-full flex-col p-3"
      >
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
            <span className="badge absolute top-2 right-2" data-variant="highlight">
              Bonus Track
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 px-1 pt-4 pb-1">
          <div>
            <h2 id={titleId} className="text-sm font-semibold group-hover:underline">
              {story.title}
            </h2>
            <p className="metadata mt-1 text-xs">Episodio #{number}</p>
          </div>
          <ul aria-label="Temáticas" className="mt-auto flex flex-wrap gap-1.5">
            {story.themes.map(({ theme }) => (
              <li key={theme} className="badge">
                {theme}
              </li>
            ))}
          </ul>
        </div>
      </TransitionLink>
    </li>
  );
}
