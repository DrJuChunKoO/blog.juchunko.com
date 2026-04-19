import {
  getCollection,
  getEntry,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";

export const POSTS_PER_PAGE = 12;

type Language = "en" | "zh";
type CategoryEntry = CollectionEntry<"categories">;
type PostEntry = CollectionEntry<"blog">;

export interface PostListItem {
  post: PostEntry;
  categoryEntries: CategoryEntry[];
}

function isCategoryEntry(
  entry: CollectionEntry<CollectionKey> | undefined,
): entry is CategoryEntry {
  return Boolean(entry && entry.collection === "categories");
}

export async function getPostsForLang(lang: Language): Promise<PostListItem[]> {
  const rawPosts = (await getCollection("blog"))
    .filter((post) => post.id.startsWith(`${lang}/`))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return Promise.all(
    rawPosts.map(async (post) => {
      const categoryEntries = post.data.categories
        ? (
            await Promise.all(post.data.categories.map((category) => getEntry(category)))
          ).filter(isCategoryEntry)
        : [];

      return { post, categoryEntries };
    }),
  );
}

export function paginateItems<T>(
  items: T[],
  currentPage: number,
  pageSize = POSTS_PER_PAGE,
) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    currentPage: safePage,
    pageSize,
    totalItems: items.length,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}

export function getPageUrl(lang: Language, page: number) {
  return page <= 1 ? `/${lang}/` : `/${lang}/page/${page}/`;
}
