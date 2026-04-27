import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;
export type Language = "en" | "zh";

export const POSTS_PER_PAGE = 12;

export async function getPostsForLang(lang: Language) {
  return (await getCollection("blog"))
    .filter((post) => post.id.startsWith(`${lang}/`))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function paginateItems<T>(
  items: T[],
  currentPage: number,
  perPage = POSTS_PER_PAGE,
) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    currentPage: safePage,
    totalPages,
  };
}
