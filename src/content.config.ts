import { defineCollection, z, reference } from "astro:content";

const blog = defineCollection({
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    author: reference("authors"),
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
  type: "data",
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
        email: z.string().email().optional(),
        twitter: z.string().url().optional(),
        github: z.string().url().optional(),
        facebook: z.string().url().optional(),
        youtube: z.string().url().optional(),
        instagram: z.string().url().optional(),
        threads: z.string().url().optional(),
        website: z.string().url().optional(),
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
  type: "data",
  schema: z.object({
    name: z.object({
      en: z.string(),
      zh: z.string(),
    }),
  }),
});

export const collections = { blog, authors, categories };
