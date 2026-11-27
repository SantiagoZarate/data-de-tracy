"use client";

import {
  Pagination,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@ui-sdk/react/pagination";
import { TransitionLink } from "glimm/next";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import type { StoryFilters, StorySort } from "../story-metadata.ts";
import { storyPageHref } from "./story-page-url.ts";

function PageLink({ href, children, ...props }: ComponentProps<"a">) {
  return href ? (
    <TransitionLink href={href} {...props}>
      {children}
    </TransitionLink>
  ) : (
    <a {...props}>{children}</a>
  );
}

export function StoryPagination({
  page,
  pageCount,
  filters,
  sort,
}: {
  page: number;
  pageCount: number;
  filters: StoryFilters;
  sort: StorySort;
}) {
  const router = useRouter();
  const getHref = (next: number) => storyPageHref(next, filters, sort);

  return (
    <Pagination
      aria-label="Páginas de Historias"
      className="mt-8"
      page={page}
      pageCount={pageCount}
      getHref={getHref}
      onPageChange={(next, details) => {
        if (details.reason === "imperative") router.push(getHref(next));
      }}
    >
      <PaginationList className="flex flex-wrap justify-center">
        {({ items }) => (
          <>
            <PaginationItem>
              <PaginationPrevious aria-label="Página anterior" render={<PageLink />} />
            </PaginationItem>
            {items.map((item) => (
              <PaginationItem key={item}>
                {typeof item === "number" ? (
                  <PaginationLink page={item} aria-label={`Página ${item}`} render={<PageLink />} />
                ) : (
                  <PaginationEllipsis />
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext aria-label="Página siguiente" render={<PageLink />} />
            </PaginationItem>
          </>
        )}
      </PaginationList>
    </Pagination>
  );
}
