// Compiles the Vercel functions the way Vercel runs them (plain ES modules, no bundler)
// and imports them. Catches missing ".js" extensions and other ESM-only crashes.
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, symlinkSync, existsSync } from "node:fs";
import path from "node:path";

const out = path.resolve(".vercel-test");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "package.json"), JSON.stringify({ type: "module" }));
if (!existsSync(path.join(out, "node_modules"))) symlinkSync(path.resolve("node_modules"), path.join(out, "node_modules"), "dir");
execSync(`npx tsc --ignoreConfig --outDir ${out} --module esnext --moduleResolution bundler --target es2022 --skipLibCheck --types node --rootDir . api/site.ts api/leads.ts`, { stdio: "inherit" });
let failed = false;
for (const fn of ["api/site.js", "api/leads.js"]) {
  try {
    const mod = await import(path.join(out, fn));
    if (typeof mod.default !== "function") throw new Error("no default export");
    console.log(`✓ ${fn} loads as an ES module`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${fn} failed to load: ${error.message}`);
  }
}
rmSync(out, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
