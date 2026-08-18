/* Full-page screenshots of every bundled artifact, for HUMAN (or model) eyes.
 *
 *   node tools/shots.mjs                 every artifact at 1440
 *   node tools/shots.mjs --mobile        every artifact at 390
 *   node tools/shots.mjs talent peers    just those
 *
 * verify.mjs proves a page does not ERROR. It cannot see that a chart is squashed, a
 * label collides, a band is empty, or a section is starved of content. Those are the
 * defects that survive every automated check and are obvious the moment you look, so
 * looking is a step, not a nicety.
 *
 * Writes shots/<name>-<width>.png. Tables are opened first, because a page whose
 * table views are collapsed hides half of what it publishes.
 */
import {createRequire} from "module";
import {readdirSync, existsSync, mkdirSync} from "fs";
import {resolve, dirname} from "path";
import {fileURLToPath, pathToFileURL} from "url";

import {chromium} from "./_browser.mjs";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = resolve(WEB, "shots");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, {recursive: true});

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const openTables = args.includes("--tables");
const names = args.filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync(`${WEB}/dist`).filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const W = mobile ? 390 : 1440, H = mobile ? 844 : 900;
const browser = await chromium.launch();
for (const name of list) {
  const file = `${WEB}/dist/${name}.html`;
  if (!existsSync(file)) { console.log(`${name}: missing`); continue; }
  const page = await browser.newPage({viewport: {width: W, height: H}});
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(1100);
  if (openTables)
    await page.evaluate(() => document.querySelectorAll("details").forEach(d => d.open = true));
  await page.waitForTimeout(250);
  const dims = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    sections: document.querySelectorAll("section").length,
    svgs: document.querySelectorAll("svg").length}));
  const out = `${SHOTS}/${name}-${W}${openTables ? "-tables" : ""}.png`;
  await page.screenshot({path: out, fullPage: true});
  console.log(`${name.padEnd(20)} ${W}px  ${String(dims.h).padStart(6)}px tall  ` +
              `${dims.sections} sections  ${dims.svgs} svg  -> shots/${name}-${W}.png`);
  await page.close();
}
await browser.close();
