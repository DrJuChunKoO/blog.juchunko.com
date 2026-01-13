import rss from "@astrojs/rss";
import { getCollection, getEntry } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
  const posts = await getCollection("blog");
  // 取得所有作者與分類資料
  const authors = {};
  const categories = {};

  // 預先 resolve 作者與分類
  for (const post of posts) {
    // author is now an array
    if (post.data.author) {
      for (const authorRef of post.data.author) {
        const authorId = typeof authorRef === 'string' ? authorRef : authorRef.id;
        if (!authors[authorId]) {
          const authorEntry = await getEntry(authorRef);
          authors[authorId] = authorEntry?.data?.name || {};
        }
      }
    }
    if (post.data.categories) {
      for (const cat of post.data.categories) {
        if (!categories[cat]) {
          const catEntry = await getEntry(cat);
          categories[cat] = catEntry?.data?.name || {};
        }
      }
    }
  }

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts
      .filter(
        (post) =>
          typeof post.data.title === "string" &&
          typeof post.data.description === "string" &&
          (post.data.pubDate instanceof Date ||
            typeof post.data.pubDate === "string"),
      )
      .map((post) => {
        // 解析語言與 slug
        const slugWithLang = post.id.replace(/\.(md|mdx)$/, "");
        const [lang, ...slugParts] = slugWithLang.split("/");
        const slug = slugParts.join("/");
        // author name (now an array - join multiple authors with comma)
        const authorName = post.data.author
          ? post.data.author
            .map((authorRef) => {
              const authorId = typeof authorRef === 'string' ? authorRef : authorRef.id;
              return authors[authorId]?.[lang] ||
                authors[authorId]?.en ||
                authors[authorId]?.zh ||
                "";
            })
            .filter(Boolean)
            .join(", ")
          : "";
        // categories name (多語系)
        const categoryNames = post.data.categories
          ? post.data.categories.map(
            (cat) =>
              categories[cat]?.[lang] ||
              categories[cat]?.en ||
              categories[cat]?.zh ||
              cat,
          )
          : [];
        // updatedDate
        const updatedDate = post.data.updatedDate
          ? post.data.updatedDate.toISOString()
          : undefined;
        return {
          title: post.data.title || "",
          description: post.data.description || "",
          pubDate:
            post.data.pubDate instanceof Date
              ? post.data.pubDate
              : new Date(post.data.pubDate),
          ...(updatedDate ? { updatedDate } : {}),
          link: `/${lang}/${slug}`,
          author: authorName,
          categories: categoryNames,
          ...(post.data.heroImage ? { heroImage: post.data.heroImage } : {}),
        };
      }),
  });
}
