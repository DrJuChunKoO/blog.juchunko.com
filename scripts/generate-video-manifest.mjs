import { readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const outputDirectory = "dist";

async function collectVideos(directory) {
  const videos = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      videos.push(...(await collectVideos(path)));
    } else if (entry.name.endsWith(".mp4")) {
      videos.push(path);
    }
  }
  return videos;
}

const manifest = {};
for (const path of await collectVideos(outputDirectory)) {
  const urlPath = `/${relative(outputDirectory, path).split(sep).join("/")}`;
  manifest[urlPath] = (await stat(path)).size;
}

await writeFile(
  join(outputDirectory, "video-assets.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
