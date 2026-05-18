import { existsSync, readFileSync } from "node:fs";

const checks = [
  {
    name: "Pagefind dependency is installed",
    pass: () => readFileSync("package.json", "utf8").includes('"pagefind"'),
  },
  {
    name: "build script generates the Pagefind index",
    pass: () =>
      readFileSync("package.json", "utf8").includes("pagefind --site dist"),
  },
  {
    name: "dev script can generate a public Pagefind database",
    pass: () => {
      const pkg = readFileSync("package.json", "utf8");
      return (
        pkg.includes('"search:dev:index"') &&
        pkg.includes("--output-path public/pagefind")
      );
    },
  },
  {
    name: "generated dev Pagefind database is ignored",
    pass: () => readFileSync(".gitignore", "utf8").includes("public/pagefind/"),
  },
  {
    name: "localized search page exists",
    pass: () => existsSync("src/pages/[lang]/search.astro"),
  },
  {
    name: "header exposes a search entry",
    pass: () =>
      readFileSync("src/components/Header.astro", "utf8").includes(
        "nav.search",
      ),
  },
  {
    name: "desktop search is centered in the nav",
    pass: () =>
      readFileSync("src/components/Header.astro", "utf8").includes(
        "data-desktop-search",
      ),
  },
  {
    name: "nav search is hidden on the search page",
    pass: () => {
      const header = readFileSync("src/components/Header.astro", "utf8");
      return (
        header.includes("isSearchPage") && header.includes("!isSearchPage")
      );
    },
  },
  {
    name: "mobile nav has a hamburger menu",
    pass: () =>
      readFileSync("src/components/Header.astro", "utf8").includes(
        "data-mobile-menu-toggle",
      ),
  },
  {
    name: "header registers a Cmd+K search shortcut",
    pass: () => {
      const header = readFileSync("src/components/Header.astro", "utf8");
      return (
        header.includes("data-search-shortcut") && header.includes("metaKey")
      );
    },
  },
  {
    name: "nav search links autofocus the search input",
    pass: () =>
      readFileSync("src/components/Header.astro", "utf8").includes(
        "searchFocusHref",
      ),
  },
  {
    name: "search page can autofocus from shortcut navigation",
    pass: () =>
      readFileSync("src/pages/[lang]/search.astro", "utf8").includes(
        "focusSearch",
      ),
  },
  {
    name: "article body is scoped for Pagefind",
    pass: () =>
      readFileSync("src/layouts/BlogPost.astro", "utf8").includes(
        "data-pagefind-body",
      ),
  },
  {
    name: "SearchAction points at the search page",
    pass: () =>
      readFileSync("src/components/BaseHead.astro", "utf8").includes(
        "/search/?q={search_term_string}",
      ),
  },
];

const failures = checks.filter((check) => !check.pass());

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${failure.name}`);
  }
  process.exit(1);
}

for (const check of checks) {
  console.log(`PASS ${check.name}`);
}
