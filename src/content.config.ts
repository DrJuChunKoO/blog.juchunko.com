import { defineCollection, z, reference } from "astro:content";

const blog = defineCollection({
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      author: reference("authors"),
    }),
});

const authors = defineCollection({
  type: "data",
  schema: ({ image }) =>
    z.object({
      name: z.object({
        en: z.string(),
        zh: z.string(),
      }),
      avatar: image(),
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

export const collections = { blog, authors };
