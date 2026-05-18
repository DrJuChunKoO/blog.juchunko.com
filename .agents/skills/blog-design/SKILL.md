---
name: blog-design
description: Design system and UI guidelines for blog.juchunko.com. Use this skill when building, modifying, or reviewing any UI component, page, or layout in this Astro blog — including the header, search, post cards, navigation, and any new pages or features.
---

# blog.juchunko.com Design System

## Core Aesthetic

**Minimalist at the content level, refined at the chrome level.**

- Post/content cards: no shadows, no card backgrounds — pure typography with hover highlight
- Navigation chrome (header, dropdowns, menus): frosted glass, hairline borders, subtle depth
- No decorative elements (gradients, circles, lines) on content pages
- Monochromatic grayscale palette; the `--accent` blue (`#2337ff`) exists in CSS variables but is rarely applied visibly

---

## Color Palette

| Role             | Light                            | Dark                                       |
| ---------------- | -------------------------------- | ------------------------------------------ |
| Page background  | `bg-white`                       | `dark:bg-black`                            |
| Card/surface     | `bg-white`, `bg-gray-50`         | `dark:bg-zinc-950`, `dark:bg-white/5`      |
| Primary text     | `text-gray-950`                  | `dark:text-gray-50`                        |
| Secondary text   | `text-gray-600`                  | `dark:text-gray-300`                       |
| Muted text       | `text-gray-400`, `text-gray-500` | `dark:text-gray-400`, `dark:text-gray-500` |
| Subtle border    | `border-black/10`                | `dark:border-white/15`                     |
| Hover background | `hover:bg-gray-100`              | `dark:hover:bg-gray-800`                   |
| Frosted glass    | `bg-white/95 backdrop-blur-md`   | `dark:bg-black/90 backdrop-blur-md`        |

---

## Borders

The site's primary structural element is the **hairline translucent border**:

```
border border-black/10 dark:border-white/15
```

- Never use thick or solid-color borders
- Always pair with a dark-mode variant
- Use `border-black/20 dark:border-white/25` for hover/focus states

---

## Shadows

Shadows are reserved **exclusively for overlays and contextual UI** (dropdowns, menus). Content cards do NOT use shadows.

| Use case               | Shadow                                                       |
| ---------------------- | ------------------------------------------------------------ |
| Sticky header backdrop | `shadow-[0_2px_4px_rgba(0,0,0,.02),0_1px_0_rgba(0,0,0,.06)]` |
| Mobile dropdown menu   | `shadow-[0_2px_8px_rgba(0,0,0,.06)]`                         |
| Content cards          | **None**                                                     |

Dark mode shadows invert: `rgba(0,0,0,...)` → `rgba(255,255,255,...)` at much lower opacity.

---

## Border Radius

| Class          | Usage                                                              |
| -------------- | ------------------------------------------------------------------ |
| `rounded-full` | Pill buttons, tags, search shortcut badge, icon buttons            |
| `rounded-2xl`  | Mobile menu container                                              |
| `rounded-xl`   | Input fields, search result cards, post grid cards, dropdown items |
| `rounded-lg`   | Images                                                             |
| `rounded`      | Small inline elements (skip-to-content)                            |

---

## Typography

- **Font**: Geist (primary) + Noto Sans TC (Chinese), `sans-serif` fallback
- **Base body**: `20px`, `line-height: 1.7`; mobile drops to `18px`
- **Headings**: `font-semibold`, negative tracking (`tracking-[-0.04em]` for large, `tracking-[-0.02em]` for medium)
- **Nav/buttons**: `font-medium`
- **Mono labels**: `font-mono text-xs tracking-wider uppercase` (keyboard shortcuts, meta info)

---

## Spacing Patterns

| Context           | Classes                                         |
| ----------------- | ----------------------------------------------- |
| Listing pages     | `max-w-7xl mx-auto px-4 py-8 md:px-6`           |
| Search page       | `max-w-5xl mx-auto px-4 py-10 md:px-6 md:py-14` |
| Blog post content | `container` (custom: `mx-auto max-w-screen-md`) |
| Post grid         | `grid grid-cols-1 gap-4 md:grid-cols-2`         |

---

## Key Component Patterns

### Interactive Cards (post grid, search results)

```html
<!-- No shadows. Border + background define the card. Hover = bg change. -->
<article
  class="group rounded-xl border border-black/10 bg-white p-5 transition hover:border-black/20 hover:bg-gray-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:border-white/20 dark:hover:bg-white/5"
></article>
```

### Pill Buttons / Tags

```html
<a
  class="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:border-black/20 hover:bg-gray-100 dark:border-white/15 dark:hover:border-white/25 dark:hover:bg-white/10"
></a>
```

### Input Fields

```html
<div
  class="flex items-center gap-3 rounded-xl border border-black/10 bg-gray-50 px-4 py-3 transition focus-within:border-black/30 focus-within:bg-white dark:border-white/15 dark:bg-white/5 dark:focus-within:border-white/40 dark:focus-within:bg-white/10"
></div>
```

### Mobile Menu / Dropdown Overlay

```html
<div
  class="rounded-2xl border border-black/10 bg-white/95 p-2 shadow-[0_2px_8px_rgba(0,0,0,.06)] backdrop-blur-md dark:border-white/15 dark:bg-zinc-950/95 dark:shadow-[0_2px_8px_rgba(0,0,0,.25)]"
></div>
```

### Empty State

```html
<div class="flex flex-col items-center justify-center text-center">
  <!-- Large icon: 80x80, muted color, subtle bg circle -->
  <div
    class="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5"
  >
    <svg class="h-10 w-10 text-gray-400 dark:text-gray-500">...</svg>
  </div>
  <h2 class="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
    Title
  </h2>
  <p class="mt-3 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
    Description
  </p>
</div>
```

---

## View Transitions

The site uses Astro's `<ClientRouter />` (configured in `BaseHead.astro`).

- Use `transition:name` to connect matching elements across pages (e.g., the nav search pill → search input field)
- Use `transition:animate="initial"` on the source element for a browser-native morph
- Do **not** use `transition:animate="slide"` on page content — keep transitions subtle

### Auto-focus after View Transition

Direct `.focus()` calls fail during View Transitions. Use `setTimeout` instead:

```js
document.addEventListener("astro:page-load", () => {
  setTimeout(() => input.focus(), 100);
});
```

---

## Show/Hide with Grid Layout

Never toggle `hidden` on a `grid` container — `hidden` (`display:none`) overrides `grid` and kills `gap`. Use inline styles instead:

```js
// Show
results.style.display = "";
// Hide
results.style.display = "none";
```

---

## Keyboard Shortcut Labels

Detect platform client-side and render the appropriate shortcut:

```js
const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
label.textContent = isMac ? "\u2318+K" : "Ctrl+K";
```

- macOS: `⌘K` (Unicode `\u2318` + K, no plus sign)
- Windows/Linux: `Ctrl+K` (with plus sign)
