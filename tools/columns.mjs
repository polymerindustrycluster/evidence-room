/* THE COLUMN AUDIT. Every element on every page, at every width, must resolve to one of
 * three sanctioned widths — nothing in between.
 *
 *   node tools/columns.mjs          all artifacts, seven widths
 *   node tools/columns.mjs laborshed
 *
 * A page reads as "inconsistent widths" when a reader's eye finds more vertical rules than
 * the design has reasons for. Three is a system the eye learns in one screenful:
 *
 *   MEASURE  running prose — headline, lede, note. Narrow because reading is the job.
 *   FIGURE   anything with data in it — chart, source line, table, methodology.
 *   FULL     the band background only. Nothing with ink in it.
 *
 * Anything that lands on a fourth value is a mistake even if it looks fine in isolation,
 * because the reader sees it as a fourth rule and no rule explains it. That is the whole
 * defect: not that any one block is wrong, but that no two agree.
 */
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const only = process.argv[2];
const WIDTHS = only ? [1440] : [760, 900, 1100, 1280, 1440, 1800, 2560];
const pages = (only ? [only] : readdirSync(".", {withFileTypes: true})
  .filter(d => d.isDirectory() && !d.name.startsWith("_") &&
               !["dist", "tools", "node_modules", "shots"].includes(d.name))
  .map(d => d.name));

const browser = await chromium.launch();
let bad = 0, checked = 0;
for (const W of WIDTHS) {
  const offenders = [];
  for (const name of pages) {
    const page = await browser.newPage({viewport: {width: W, height: 1000}});
    try {
      await page.goto(pathToFileURL(process.cwd() + "/" + "dist/" + name + ".html").href);
      await page.waitForTimeout(400);
      const rows = await page.evaluate(() => {
        const root = document.querySelector(".band .wrap");
        if (!root) return null;
        const cs = getComputedStyle(root), cr = root.getBoundingClientRect();
        const FULL = cr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        /* Resolve the tokens by MEASURING them, not by reading them: a custom property
           computes to its token text ("min(74ch, calc(...))"), never to a pixel count.
           A probe element in the real container is the only honest reading — and it keeps
           the audit from restating values the stylesheet could later change. */
        const probe = v => {
          const d = document.createElement("div");
          d.style.cssText = `width:${v};height:0;visibility:hidden`;
          root.appendChild(d);
          const w = d.getBoundingClientRect().width;
          d.remove();
          return w;
        };
        const want = {measure: probe("var(--measure)"), figure: probe("var(--figure)"),
                      full: FULL};
        const out = [];
        document.querySelectorAll(
          ".band .takeaway, .band h2, .band .lede, .band .note, .band .src, " +
          ".band .chart, .band .legend, .band .pv-method, .hero .stand, .hero h1, " +
          ".closer h2, .closer p").forEach(e => {
            if (!e.getClientRects().length) return;
            const w = e.getBoundingClientRect().width;
            const near = Object.entries(want)
              .find(([, v]) => Math.abs(w - v) <= 2);
            out.push({sel: e.className || e.tagName.toLowerCase(),
                      w: Math.round(w), slot: near ? near[0] : null});
          });
        return {want: {measure: Math.round(want.measure), figure: Math.round(want.figure),
                       full: Math.round(FULL)}, out};
      });
      if (rows) {
        checked += rows.out.length;
        rows.out.filter(r => !r.slot).forEach(r =>
          offenders.push(`${name} .${String(r.sel).split(" ")[0]} = ${r.w}px ` +
                         `(measure ${rows.want.measure} / figure ${rows.want.figure} / full ${rows.want.full})`));
      }
    } catch { /* not built */ }
    await page.close();
  }
  bad += offenders.length;
  console.log(`${String(W).padStart(5)}px  ${offenders.length ? offenders.length + " off-column" : "all on-column"}`);
  [...new Set(offenders)].slice(0, 8).forEach(o => console.log(`         ${o}`));
}
console.log(`\n${checked} element measurements, ${bad} off-column`);
await browser.close();
process.exit(bad ? 1 : 0);
