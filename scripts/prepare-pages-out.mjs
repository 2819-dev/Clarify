/**
 * Stage OpenNext Cloudflare build into a Cloudflare Pages Advanced Mode
 * directory for `wrangler pages deploy` (not `wrangler deploy`).
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from "fs";
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

// Static assets at the root of the Pages upload
cpSync(assetsSrc, out, { recursive: true });
cpSync(workerSrc, join(out, "_worker.js"));

// Runtime modules the worker imports relatively
for (const name of readdirSync(openNext)) {
  if (
    ["assets", "worker.js", "cache", "cloudflare-templates", "dynamodb-provider"].includes(
      name,
    )
  ) {
    continue;
  }
  cpSync(join(openNext, name), join(out, name), { recursive: true });
}

writeFileSync(
  join(out, "_routes.json"),
  JSON.stringify({ version: 1, include: ["/*"], exclude: [] }),
);

console.log("Prepared Pages output at .pages-out");
