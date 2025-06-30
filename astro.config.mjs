// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import partytown from "@astrojs/partytown";
// latex
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import react from "@astrojs/react";
//icon
import Icons from "unplugin-icons/vite";
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
    partytown({ config: { forward: ["dataLayer.push"] } }),
  ],
  vite: {
    plugins: [tailwindcss(), Icons({ autoInstall: true })],
  },
  markdown: { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] },
});
