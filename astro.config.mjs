// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import partytown from "@astrojs/partytown";
// latex
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import react from "@astrojs/react";
//icon
import Icons from "unplugin-icons/vite";
// compression
import compress from "@playform/compress";
// https://astro.build/config
export default defineConfig({
  site: "https://blog.juchunko.com",
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  integrations: [
    mdx(),
    sitemap(),
    react({
      experimentalReactChildren: true,
      experimentalDisableStreaming: true,
    }),
    partytown({ config: { forward: ["dataLayer.push"] } }),
    compress({
      // csso drops Tailwind v4 range media queries like `@media (width>=48rem)`
      CSS: false,
      Image: false,
    }),
  ],
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "https://blog.juchunko.com",
          changeOrigin: true,
        },
      },
    },
    plugins: [
      tailwindcss(),
      Icons({
        autoInstall: true,
        compiler: "jsx",
        jsx: "react",
      }),
    ],
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.code === "EVAL" &&
            warning.id?.includes("node_modules/markdown-to-jsx/")
          ) {
            return;
          }
          warn(warning);
        },
      },
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
