/* DOES EVERY BROWSER TOOL MEASURE ON THE SAME BASIS?
 *
 *   node tools/launchers.mjs
 *
 * Until 2026-10-06 the pixel gates read 20 to 60px differently on macOS and on the Linux CI
 * runner, because chromium hinted Lato on one and not the other, and the coldopen ratchet
 * had to be re-measured on CI by hand four times. tools/_browser.mjs now launches chromium
 * with hinting off, and the two platforms agree (ER-021). That only holds while every tool
 * launches through it: one gate that reaches Playwright directly measures on the old basis,
 * passes locally and fails on push, which is the problem the fix removed.
 *
 * WHAT THIS DOES: reads every .mjs/.js/.cjs under tools/ except _browser.mjs and fails on
 *   - a quoted module name containing playwright (an import or require of it),
 *   - a browser type's own launcher called directly (a dot-launch, dot-connect,
 *     launchServer, launchPersistentContext or connectOverCDP call), and
 *   - an import of ./_browser.mjs that does not take launch().
 * Prose that merely names Chromium is fine; only code that reaches a browser counts.
 * It also fails if the helper itself no longer passes --font-render-hinting=none.
 *
 * WHAT THIS DOES NOT DO: it reads text, so a launcher reached through a computed module
 * name escapes it, and it does not read Python (_data/build has no browser today) or files
 * outside tools/. It prints what it read so a shrinking count is visible.
 */
import {readFileSync, readdirSync} from "fs";
import {join, relative} from "path";
import {DETERMINISTIC_ARGS, launch} from "./_browser.mjs";

const ROOT = "tools";
const files = [];
const walk = dir => {
  for (const e of readdirSync(dir, {withFileTypes: true})) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(mjs|cjs|js)$/.test(e.name) && p !== join(ROOT, "_browser.mjs")) files.push(p);
  }
};
walk(ROOT);

/* the module name is assembled so this file's own source does not match it */
const PW = "play" + "wright";
const BYPASS = [
  new RegExp(`["'\`][^"'\`\\s]*${PW}[^"'\`\\s]*["'\`]`),
  /\.\s*(launch|connect|launchServer|launchPersistentContext|connectOverCDP)\s*\(/,
];
let bad = 0, helped = 0;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (BYPASS.some(re => re.test(line))) {
      bad++;
      console.log(`FAIL  ${relative(".", f)}:${i + 1}  reaches a browser around tools/_browser.mjs: ` +
                  line.trim().slice(0, 100));
    }
  });
  const imp = lines.find(l => /^import\b.*from\s+["']\.\/_browser\.mjs["']/.test(l));
  if (imp && !/\blaunch\b/.test(imp)) {
    bad++;
    console.log(`FAIL  ${relative(".", f)}  imports _browser.mjs without launch(): ${imp.trim()}`);
  } else if (imp && lines.some(l => /\bawait\s+launch\s*\(/.test(l))) helped++;
}
if (typeof launch !== "function" || !DETERMINISTIC_ARGS.includes("--font-render-hinting=none")) {
  bad++;
  console.log("FAIL  tools/_browser.mjs no longer launches with --font-render-hinting=none");
}
console.log(`\nread ${files.length} tool files; ${helped} launch a browser through tools/_browser.mjs` +
            ` (${DETERMINISTIC_ARGS.join(" ")}); not read: Python, files outside tools/`);
console.log(bad ? `${bad} launch(es) outside the shared helper` : "every browser launch goes through the shared helper");
process.exit(bad ? 1 : 0);
