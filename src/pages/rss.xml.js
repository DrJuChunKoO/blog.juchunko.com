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
    if (post.data.author && !authors[post.data.author]) {
      const authorEntry = await getEntry(post.data.author);
      authors[post.data.author] = authorEntry?.data?.name || {};
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
        // author name
        const authorName = post.data.author
          ? authors[post.data.author]?.[lang] ||
            authors[post.data.author]?.en ||
            authors[post.data.author]?.zh ||
            ""
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
