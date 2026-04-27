import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;
export type Language = "en" | "zh";

export interface CategorySummary {
  id: string;
  name: string;
  count: number;
}

export const POSTS_PER_PAGE = 12;
export const FEATURED_FIRST_PAGE_POSTS = POSTS_PER_PAGE + 1;

export async function getPostsForLang(lang: Language) {
  return (await getCollection("blog"))
    .filter((post) => post.id.startsWith(`${lang}/`))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getPostsForCategory(lang: Language, categoryId: string) {
  const posts = await getPostsForLang(lang);

  return posts.filter((post) =>
    post.data.categories?.some((category) => category.id === categoryId),
  );
}

export async function getCategorySummaries(
  lang: Language,
): Promise<CategorySummary[]> {
  const [categories, posts] = await Promise.all([
    getCollection("categories"),
    getPostsForLang(lang),
  ]);
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const category of post.data.categories ?? []) {
      counts.set(category.id, (counts.get(category.id) ?? 0) + 1);
    }
  }

  return categories
    .map((category) => ({
      id: category.id,
      name: category.data.name[lang],
      count: counts.get(category.id) ?? 0,
    }))
    .filter((category) => category.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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
