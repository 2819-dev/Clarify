/**
 * Stage OpenNext Cloudflare build into a Cloudflare Pages Advanced Mode
 * directory for `wrangler pages deploy` (not `wrangler deploy`).
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const openNext = join(root, ".open-next");
const out = join(root, ".pages-out");
const workerSrc = join(openNext, "worker.js");
const assetsSrc = join(openNext, "assets");

if (!existsSync(workerSrc) || !existsSync(assetsSrc)) {
  console.error("Missing .open-next build. Run: npx opennextjs-cloudflare build");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(assetsSrc, out, { recursive: true });
cpSync(workerSrc, join(out, "_worker.js"));

// Copy any sibling OpenNext runtime chunks the worker imports relatively
for (const name of [".build", "cloudflare", "middleware", "server-functions", "durable-objects"]) {
  const src = join(openNext, name);
  if (existsSync(src)) {
    cpSync(src, join(out, name), { recursive: true });
  }
}

// Include wrangler pages project metadata hint
writeFileSync(
  join(out, "_routes.json"),
  JSON.stringify(
    {
      version: 1,
      include: ["/*"],
      exclude: ["/channels/*-avatar.jpg", "/channels/*-banner.jpg", "/clarify-mark.svg", "/embed-probe.html"],
    },
    null,
    2,
  ),
);

console.log("Prepared Pages output at .pages-out");
console.log("worker bytes", readFileSync(join(out, "_worker.js")).length);
