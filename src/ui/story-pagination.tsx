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

export function StoryPagination({ page, pageCount }: { page: number; pageCount: number }) {
  const router = useRouter();

  return (
    <Pagination
      aria-label="Páginas de Historias"
      className="mt-8"
      page={page}
      pageCount={pageCount}
      getHref={storyPageHref}
      onPageChange={(next, details) => {
        if (details.reason === "imperative") router.push(storyPageHref(next));
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
