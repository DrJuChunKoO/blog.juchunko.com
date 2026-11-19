// `pnpm run deploy`: wrangler deploy, then submit changed post URLs to IndexNow.
// Expects `pnpm build` to have produced ./dist. IndexNow failures never fail the deploy.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  MANIFEST_PATH,
  buildManifest,
  changedUrls,
  fetchLiveManifest,
  submit,
} from "./indexnow.mjs";

const manifest = buildManifest();
writeFileSync(`dist/${MANIFEST_PATH}`, JSON.stringify(manifest));
const before = await fetchLiveManifest().catch(() => null);

execFileSync("wrangler", ["deploy", ...process.argv.slice(2)], { stdio: "inherit" });

try {
  if (!before) {
    console.log("IndexNow: no live manifest yet; this deploy sets the baseline.");
  } else {
    const urls = changedUrls(before, manifest);
    if (urls.length === 0) {
      console.log("IndexNow: no post changes to submit.");
    } else {
      const { status, ok, body } = await submit(urls);
      console.log(`IndexNow: HTTP ${status} for ${urls.length} URL(s):\n  ${urls.join("\n  ")}`);
      if (!ok) console.warn(body);
    }
  }
} catch (error) {
  console.warn(`IndexNow: submission skipped (${error.message}).`);
}
