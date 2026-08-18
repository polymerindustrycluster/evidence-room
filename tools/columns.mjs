/* THE COLUMN AUDIT. Every element on every page, at every width, must resolve to one of
 * three sanctioned widths — nothing in between.
 *
 *   node tools/columns.mjs          all artifacts, seven widths
 *   node tools/columns.mjs laborshed
 *
 * A page reads as "inconsistent widths" when a reader's eye finds more vertical rules than
 * the design has reasons for. Three is a system the eye learns in one screenful:
 *
 *   MEASURE  every line of PROSE — takeaway, headline, lede, note, source caption, the
 *            table toggle. Narrow because reading is the job. This includes prose that
 *            lives inside chart chrome; where it sits does not change what it is.
 *   FIGURE   things that ARE data — the chart svg, the table's rows, the legend.
 *   FULL     the band background only. Nothing with ink in it.
 *
 * Anything that lands on a fourth value is a mistake even if it looks fine in isolation,
 * because the reader sees it as a fourth rule and no rule explains it. That is the whole
 * defect: not that any one block is wrong, but that no two agree.
 *
 * TWO CHECKS, NOT ONE. Until 2026-08-18 this only asked "is it on SOME sanctioned width?"
 * — and a note box at figure width, sitting directly under a lede at measure width, passed
 * as on-column while a reader saw three right edges on one screen. Now every element also
 * has an EXPECTED slot, and landing on the wrong sanctioned width is reported the same as
 * landing on none. Being on a column is necessary; being on the right one is the point.
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
        // narrow is the third sanctioned width — a small-N series that chose not to fill
        // the figure. It is only ever legitimate on a .chart that declared it.
        const want = {measure: probe("var(--measure)"), figure: probe("var(--figure)"),
                      narrow: probe("var(--figure-narrow)"), full: FULL};
        // Which width each thing SHOULD sit on. Prose is measure; data is figure. The hero
        // h1 is display type and deliberately wide — 54px at 678 wraps into a tower.
        const EXPECT = [
          [".band .takeaway", "measure"], [".band h2", "measure"], [".band .lede", "measure"],
          [".band .note", "measure"], [".band .src", "measure"],
          [".band .pv-table summary", "measure"],
          [".hero .stand", "measure"], [".closer p", "measure"], [".closer h2", "measure"],
          [".band .chart", "figure"], [".band .legend", "figure"],
          [".band .pv-method", "figure"], [".hero h1", "figure"],
        ];
        const out = [];
        for (const [sel, expect] of EXPECT) {
          document.querySelectorAll(sel).forEach(e => {
            if (!e.getClientRects().length) return;
            const w = e.getBoundingClientRect().width;
            const near = Object.entries(want)
              .find(([, v]) => Math.abs(w - v) <= 2);
            const slot = near ? near[0] : null;
            // A short line (a one-word takeaway, a summary that fits) is narrower than its
            // column by content, not by rule — its max-width is what we are auditing.
            const cap = parseFloat(getComputedStyle(e).maxWidth);
            const capSlot = Object.entries(want).find(([, v]) => Math.abs(cap - v) <= 2);
            let effective = slot || (capSlot ? capSlot[0] : null);
            // A chart at the narrow width is on-column IF it opted in; a chart that
            // happens to be 640 without the class is a mistake, and prose at 640 always is.
            if (effective === "narrow") {
              effective = (expect === "figure" && e.classList.contains("narrow"))
                ? "figure" : "narrow-unexpected";
            }
            // Below ~760px the stylesheet collapses figure and measure to one width on
            // purpose (one column is the only honest layout on a phone). When they
            // coincide the "expected slot" question has no answer, so it is not asked.
            const collapsed = Math.abs(want.measure - want.figure) <= 2;
            out.push({sel, w: Math.round(w), slot: effective, expect,
                      wrong: !collapsed && effective && effective !== expect});
          });
        }
        return {want: {measure: Math.round(want.measure), figure: Math.round(want.figure),
                       full: Math.round(FULL)}, out};
      });
      if (rows) {
        checked += rows.out.length;
        rows.out.filter(r => !r.slot).forEach(r =>
          offenders.push(`${name} ${r.sel} = ${r.w}px OFF-COLUMN ` +
                         `(measure ${rows.want.measure} / figure ${rows.want.figure} / full ${rows.want.full})`));
        rows.out.filter(r => r.wrong).forEach(r =>
          offenders.push(`${name} ${r.sel} = ${r.w}px on ${r.slot.toUpperCase()}, ` +
                         `expected ${r.expect.toUpperCase()}`));
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
