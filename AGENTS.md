# Astro Blog - Agent Instructions

This guide provides high-signal context and developer instructions to avoid common implementation mistakes.

---

## 1. Key Developer Commands

An agent must use the correct commands for testing, building, and verifying search behaviors:

*   **`pnpm dev`**: Standard Astro dev server (`http://localhost:4321`).
    *   *Caution*: Proxies `/api` to production (`https://blog.juchunko.com`). It does NOT run local Worker APIs.
*   **`pnpm build`**: Astro static build + runs Pagefind indexer into `./dist`.
*   **`pnpm preview:worker`**: Runs Wrangler local development server (`wrangler dev`).
    *   *Prerequisite*: You must build the static site (`pnpm build`) first.
*   **`pnpm search:dev:index`**: Generates the Pagefind search database into `public/pagefind/` for local search testing under `pnpm dev`.
*   **`pnpm verify:search`**: Highly focused verification script checking Pagefind tags (`data-pagefind-body`, etc.), header links, search autofocus, page structure, and SEO configurations. **Always run this when modifying search, headers, layouts, or main pages.**
*   **`npx astro check`**: Essential for type-checking and frontmatter schema validation across `.astro` components.

---

## 2. Core Architecture Quirks & Gotchas

*   **Local API Development**: The actual API code resides in `src/worker/index.ts`. Because `pnpm dev` proxies all `/api` calls to production, you **cannot** test local changes to `/api/chat` or `/api/summary` using only the Astro dev server. You must run:
    ```bash
    pnpm build && pnpm preview:worker
    ```
*   **Pagefind Search**: Pagefind indexing normally only runs on production builds. To test search locally in dev, run `pnpm search:dev:index`. The database is written to `public/pagefind/`, which is ignored in `.gitignore`.
*   **View Transitions Autofocus**: Direct `.focus()` calls fail immediately after Astro View Transitions. You must wrap them in a timeout inside the page load listener:
    ```javascript
    document.addEventListener("astro:page-load", () => {
      setTimeout(() => input.focus(), 100);
    });
    ```
*   **Showing/Hiding Grid Layouts**: Never toggle the Tailwind `hidden` class on a CSS Grid container as it kills the grid gap. Instead, control visibility via inline styles:
    ```javascript
    gridContainer.style.display = ""; // Show
    gridContainer.style.display = "none"; // Hide
    ```
*   **TTS (Text-To-Speech) Pipeline**: Syncing speech segments is done via `scripts/sync-tts.sh`. It automatically processes newly pushed posts in `src/content/blog/**` in GitHub Actions on push, provided `TTS_API_TOKEN` is configured.

---

## 3. Content Structure & Frontmatter Schema

*   **Locales**: Multi-language directories:
    *   English: `src/content/blog/en/` (Default language is `en`)
    *   Traditional Chinese: `src/content/blog/zh/`
*   **Schema Configuration**: Defined in `src/content.config.ts` (not `src/content/config.ts`).
*   **Related Entities**: Authors and Categories are loaded via JSON files:
    *   Authors: `src/content/authors/<id>.json`
    *   Categories: `src/content/categories/<id>.json`
    *   *Reference format in post frontmatter*: Use the filename ID as reference (e.g. `author: "juchun-ko"`, `categories: ["legislative-diary"]`).

---

## 4. UI Design & Aesthetic Constraints

To match the existing professional, minimalist look (see `.agents/skills/blog-design/SKILL.md`):

*   **Borders**: Strictly use hairline translucent borders for all structural separations:
    ```html
    border border-black/10 dark:border-white/15
    ```
*   **Shadows**: Do NOT use shadows on content cards or general layouts. Shadows are reserved exclusively for contextual UI overlays like dropdowns, headers, and mobile menus.
*   **Theme**: Grayscale monochromatic aesthetic.

---

## 5. Image Assets & Optimization

*   **Hybrid Storage Architecture**:
    *   **Blog Post Images**: All blog-post-specific images must be stored under `src/assets/images/` and `src/assets/journal/`. Do NOT store blog images in the `public/` folder, as this bypasses Astro's native build-time optimizations.
    *   **Author Avatars & Global Icons**: Site-wide global assets (like `noise.svg`, `avatar.webp`, `cynthia.webp`, `Leo.webp`, etc.) MUST be kept in the `/public/images/` directory. This is because they are referenced statically as literal string paths inside layout files (`BaseHead.astro`), CSS background properties, Open Graph SEO metadata, and JSON content schemas (`src/content/authors/*.json`).
*   **Astro Native Conversion**: Frontmatter `heroImage` uses Astro's native `image()` schema validation. The blog layouts and component grids use the `<Image />` component from `astro:assets` to automatically optimize and convert these images to WebP and AVIF during compilation.
*   **Markdown/MDX Images**: Standard markdown image syntax (e.g. `![alt](../../../assets/images/...)`) with relative paths is automatically recognized and optimized by Astro's built-in image processor.
*   **MDX Inline `<Image />`**: If using `<Image />` inside MDX files, you must import the image as a variable at the top of the file:
    ```mdx
    import { Image } from 'astro:assets';
    import myImage from '../../../assets/images/post-images/pic.jpg';

    <Image src={myImage} alt="Description" width={400} height={600} />
    ```
*   **Post-build Compression**: `@playform/compress` is enabled in `astro.config.mjs` to automatically perform fine-tuned post-build compression on all compiled images, HTML, CSS, and JS output files in the `dist/` directory, specifying `quality: 80` for WebP and `quality: 75` for AVIF.
