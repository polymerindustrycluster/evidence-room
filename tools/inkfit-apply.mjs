/* Apply the ink-fit corrections measured by inkfit.mjs, then re-measure, until every
 * chart's drawn content spans its viewBox edge to edge.
 *
 *   node tools/inkfit-apply.mjs [passes]
 *
 * WHY THIS IS AUTOMATED. Chart margins were hand-picked per chart, so the leftmost drawn
 * pixel landed anywhere from 155 units inside the box to 45 units outside it. Text on the
 * page starts at the column edge, so every chart read as indented by a different amount —
 * which is the "inconsistent widths" a reader sees even when every container is correct.
 * The right margin is the same problem at the other end. Forty charts is too many to
 * converge by hand, and by hand is how they drifted in the first place.
 */
import {readFile, writeFile} from "node:fs/promises";
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {execSync} from "node:child_process";
import {chromium} from "./_browser.mjs";

/* Six passes, not one. Shrinking a margin widens the plot, which moves the very label
 * that was setting the edge — so the correction only converges geometrically. */
const PASSES = Number(process.argv[2] || 6);
const TOL = 6;   // viewBox units; ~5px on screen at the 980px column
const pages = readdirSync(".", {withFileTypes: true})
  .filter(d => d.isDirectory() && !d.name.startsWith("_") &&
               !["dist", "tools", "node_modules", "shots"].includes(d.name))
  .map(d => d.name);

async function measure(browser) {
  const out = [];
  for (const n of pages) {
    let page;
    try { page = await browser.newPage({viewport: {width: 1440, height: 1000}}); }
    catch { continue; }
    try {
      await page.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
      await page.waitForTimeout(700);
      const r = await page.evaluate(() =>
        [...document.querySelectorAll(".chart svg")].map(svg => {
          const vb = svg.viewBox.baseVal, box = svg.getBoundingClientRect();
          if (!vb.width || !box.width || !svg.id) return null;
          const k = box.width / vb.width;
          let lo = Infinity, hi = -Infinity;
          svg.querySelectorAll("text,rect,circle,path,line").forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.fill === "rgba(0, 0, 0, 0)" && cs.stroke === "none") return;
            const bb = el.getBoundingClientRect();
            if (!bb.width && !bb.height) return;
            lo = Math.min(lo, bb.left); hi = Math.max(hi, bb.right);
          });
          if (lo === Infinity) return null;
          return {id: svg.id, l: Math.round((lo - box.left) / k),
                  r: Math.round((box.right - hi) / k)};
        }).filter(Boolean));
      r.forEach(c => out.push({page: n, ...c}));
    } catch { /* page may not exist in dist */ }
    await page.close();
  }
  return out;
}

/** Nudge the `l` and `r` entries of the m:{} object in this chart's call. */
function adjust(src, id, dl, dr) {
  const call = new RegExp(`chart\\(\\s*["']${id}["'][\\s\\S]{0,400}?m:\\s*\\{[^}]*\\}`, "m");
  const found = src.match(call);
  if (!found) return null;
  let block = found[0];
  const bump = (key, delta) => {
    const re = new RegExp(`(\\b${key}:\\s*)(-?\\d+)`);
    const m = block.match(re);
    if (!m) return;
    const next = Math.max(0, parseInt(m[2], 10) - delta);
    block = block.replace(re, `$1${next}`);
  };
  bump("l", dl); bump("r", dr);
  return src.replace(found[0], block);
}

const browser = await chromium.launch();
for (let pass = 1; pass <= PASSES; pass++) {
  const meas = await measure(browser);
  const off = meas.filter(c => Math.abs(c.l) > TOL || Math.abs(c.r) > TOL);
  console.log(`pass ${pass}: ${off.length} of ${meas.length} charts off by more than ${TOL} units`);
  if (!off.length) break;
  const byPage = {};
  off.forEach(c => (byPage[c.page] = byPage[c.page] || []).push(c));
  for (const [pg, list] of Object.entries(byPage)) {
    const f = `${pg}/app.js`;
    let src = await readFile(f, "utf8");
    for (const c of list) {
      const next = adjust(src, c.id, c.l, c.r);
      if (next) src = next;
      else console.log(`    could not locate chart("${c.id}") in ${f}`);
    }
    await writeFile(f, src, "utf8");
  }
  execSync("node tools/bundle.mjs", {stdio: "ignore"});
}
const final = (await measure(browser)).filter(c => Math.abs(c.l) > TOL || Math.abs(c.r) > TOL);
console.log(final.length
  ? `\nstill off: ${final.map(c => `${c.page}/${c.id}(L${c.l} R${c.r})`).join(", ")}`
  : "\nevery chart's ink spans its box");
await browser.close();
