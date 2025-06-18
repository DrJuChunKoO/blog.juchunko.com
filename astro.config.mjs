// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
// latex

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import react from "@astrojs/react";
// https://astro.build/config
export default defineConfig({
  site: "https://blog.juchunko.com",
  integrations: [
    mdx(),
    sitemap(),
    react({
      experimentalReactChildren: true,
      experimentalDisableStreaming: true,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] },
});
