import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: image().optional(),
    heroImageAlt: z.string().optional(),
    // Allow assigning one or multiple authors to this post
    author: z
      .union([reference("authors"), z.array(reference("authors"))])
      .transform((val) => {
        return Array.isArray(val) ? val : [val];
      }),
    // Allow assigning one or multiple category ids to this post
    categories: z
      .union([reference("categories"), z.array(reference("categories"))])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        return Array.isArray(val) ? val : [val];
      }),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/authors" }),
  schema: z.object({
    name: z.object({
      en: z.string(),
      zh: z.string(),
    }),
    avatar: z.string().optional(),
    bio: z.object({
      en: z.string(),
      zh: z.string(),
    }),
    social: z
      .object({
        email: z.email().optional(),
        twitter: z.url().optional(),
        github: z.url().optional(),
        facebook: z.url().optional(),
        youtube: z.url().optional(),
        instagram: z.url().optional(),
        threads: z.url().optional(),
        website: z.url().optional(),
      })
      .optional(),
  }),
});

// Categories collection – used to store multilingual category names.
// Each category entry should be saved as a data-only JSON/TS file under
//   src/content/categories/<id>.json
// with the following shape:
// {
//   "name": {
//     "en": "<English name>",
//     "zh": "<Chinese name>"
//   }
// }
// Example:  src/content/categories/technology.json  ➔ id "technology"
//           referenced from post frontmatter as:
//           categories: ["technology"]
const categories = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/categories" }),
  schema: z.object({
    name: z.object({
      en: z.string(),
      zh: z.string(),
    }),
  }),
});

export const collections = { blog, authors, categories };
