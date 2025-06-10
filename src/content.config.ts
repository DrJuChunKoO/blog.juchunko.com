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
      name: z.string(),
      avatar: image(),
      bio: z.string(),
      social: z
        .object({
          twitter: z.string().url().optional(),
          github: z.string().url().optional(),
          website: z.string().url().optional(),
        })
        .optional(),
    }),
});

export const collections = { blog, authors };
