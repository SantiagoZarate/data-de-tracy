export function storyPageHref(page: number) {
  return page === 1 ? "/" : `/?pagina=${page}`;
}
