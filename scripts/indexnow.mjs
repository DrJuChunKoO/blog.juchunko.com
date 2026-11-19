// IndexNow (Bing, Yandex, Seznam, Naver…): tell search engines which post URLs changed.
// The deployed site carries /indexnow-manifest.json (post URL -> source hash); a deploy
// diffs the live manifest against the new one and submits only what changed.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const HOST = "blog.juchunko.com";
export const KEY = "f12fd3e60b3209216ffc4325cda9dc16";
export const MANIFEST_PATH = "indexnow-manifest.json";
const BLOG_DIR = "src/content/blog/";

export function postUrl(file) {
  if (!file.startsWith(BLOG_DIR) || !/\.mdx?$/.test(file)) return null;
  const parts = file.slice(BLOG_DIR.length).replace(/\.mdx?$/, "").split("/");
  if (parts.length < 2 || parts.at(-1).startsWith("_")) return null;
  const path = parts.map((p) => p.toLowerCase().replace(/\s+/g, "-")).join("/");
  return `https://${HOST}/${path}/`;
}

export function buildManifest() {
  const manifest = {};
  for (const rel of readdirSync(BLOG_DIR, { recursive: true }).sort()) {
    const file = join(BLOG_DIR, rel);
    const url = postUrl(file);
    if (url) manifest[url] = createHash("sha1").update(readFileSync(file)).digest("hex");
  }
  return manifest;
}

export function changedUrls(before, after) {
  const changed = Object.keys(after).filter((url) => before[url] !== after[url]);
  const removed = Object.keys(before).filter((url) => !(url in after));
  return [...changed, ...removed];
}

export async function fetchLiveManifest() {
  const res = await fetch(`https://${HOST}/${MANIFEST_PATH}`, { cache: "no-store" });
  return res.ok ? res.json() : null;
}

export async function submit(urls) {
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
  return { status: res.status, ok: res.ok, body: res.ok ? "" : await res.text() };
}
