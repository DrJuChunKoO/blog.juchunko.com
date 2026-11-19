#!/usr/bin/env node
// Submit changed blog post URLs to IndexNow (Bing, Yandex, Seznam, Naver…).
// Usage: node scripts/indexnow.mjs src/content/blog/zh/foo.mdx [...]
// Env: INDEXNOW_WAIT_SECONDS — how long to wait for new pages to go live (default 900).

const HOST = "blog.juchunko.com";
const KEY = "f12fd3e60b3209216ffc4325cda9dc16";
const BLOG_DIR = "src/content/blog/";

export function postUrl(file) {
  if (!file.startsWith(BLOG_DIR) || !/\.mdx?$/.test(file)) return null;
  const parts = file.slice(BLOG_DIR.length).replace(/\.mdx?$/, "").split("/");
  if (parts.length < 2 || parts.at(-1).startsWith("_")) return null;
  const path = parts.map((p) => p.toLowerCase().replace(/\s+/g, "-")).join("/");
  return `https://${HOST}/${path}/`;
}

async function waitUntilLive(url, deadline) {
  while (Date.now() < deadline) {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" }).catch(() => null);
    if (res?.status === 200) return true;
    await new Promise((r) => setTimeout(r, 15_000));
  }
  return false;
}

async function main() {
  const urls = [...new Set(process.argv.slice(2).map(postUrl).filter(Boolean))];
  if (urls.length === 0) {
    console.log("IndexNow: no post URLs to submit.");
    return;
  }

  const deadline = Date.now() + Number(process.env.INDEXNOW_WAIT_SECONDS ?? 900) * 1000;
  for (const url of urls) {
    const live = await waitUntilLive(url, deadline);
    console.log(`${live ? "live " : "not live (submitting anyway)"} ${url}`);
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: urls,
    }),
  });
  console.log(`IndexNow: HTTP ${res.status} for ${urls.length} URL(s).`);
  if (!res.ok && res.status !== 202) {
    console.error(await res.text());
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
