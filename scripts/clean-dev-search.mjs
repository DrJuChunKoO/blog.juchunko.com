import { rmSync } from "node:fs";

rmSync("public/pagefind", { recursive: true, force: true });
console.log("Removed public/pagefind");
