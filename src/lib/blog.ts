import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;
export type Language = "en" | "zh";

export const POSTS_PER_PAGE = 12;
export const FEATURED_FIRST_PAGE_POSTS = POSTS_PER_PAGE + 1;

export async function getPostsForLang(lang: Language) {
  return (await getCollection("blog"))
    .filter((post) => post.id.startsWith(`${lang}/`))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function paginateItems<T>(
  items: T[],
  currentPage: number,
  perPage = POSTS_PER_PAGE,
  firstPageItems = perPage,
) {
  const totalPages = Math.max(
    1,
    items.length <= firstPageItems
      ? 1
      : 1 + Math.ceil((items.length - firstPageItems) / perPage),
  );
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = safePage === 1 ? 0 : firstPageItems + (safePage - 2) * perPage;
  const pageSize = safePage === 1 ? firstPageItems : perPage;

  return {
    items: items.slice(start, start + pageSize),
    currentPage: safePage,
    totalPages,
  };
}
