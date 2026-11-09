// Builds one minified bundle per master:  src/bundles/<NAME>/index.js -> dist/<NAME>.min.js
// Usage: node scripts/build-campaigns.mjs            (all campaigns)
//        node scripts/build-campaigns.mjs CAM-05099  (one)
import { build } from "esbuild";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const only = process.argv[2];
const dir = join(root, "src/bundles");
const names = (existsSync(dir) ? readdirSync(dir) : [])
  .filter((n) => statSync(join(dir, n)).isDirectory() && existsSync(join(dir, n, "index.js")))
  .filter((n) => !only || n === only);

if (!names.length) { console.log("No campaign bundles to build" + (only ? " for " + only : "") + "."); process.exit(only ? 1 : 0); }

for (const name of names) {
  await build({
    entryPoints: [join(dir, name, "index.js")],
    bundle: true, minify: true, format: "iife", target: "es2018",
    outfile: join(root, "dist", name + ".min.js"),
    logLevel: "warning"
  });
  console.log("built dist/" + name + ".min.js");
}
