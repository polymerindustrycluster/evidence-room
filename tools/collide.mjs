/* Overlapping and out-of-frame marks, measured rather than eyeballed.
 *
 *   node tools/collide.mjs [names...]
 *
 * Three defects this catches, all of which have shipped at least once:
 *   1. TEXT OVER TEXT — two labels printing on each other. Timeline lanes, scatter labels
 *      near an axis caption, series ends colliding with tick labels.
 *   2. MARKS PAST THE PLOT — a bar row running into the axis because the chart's height
 *      formula forgot its own margins. `H = pad + rows * rowHeight` is the usual culprit:
 *      it has to be `m.t + rows * rowHeight + m.b`.
 *   3. INK OUTSIDE THE VIEWBOX — anything drawn where the SVG will clip or the page will
 *      have to absorb it.
 *
 * Overlaps under MIN_OVERLAP px are ignored, and text sitting on a filled <rect> painted
 * immediately before it is treated as deliberate — that is the backing-plate idiom.
 */
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

/* ONE WIDTH IS NOT A TEST, AND THE INTERIOR IS NOT INTERPOLATION. This gate checked
   1440 only, so every collision found by hand during the 2026-08-28 rebuild was invisible
   to it: one chart collided at 390 and was clean at 1440, one was clean at both and
   collided at 560, and one had TWO separate collision zones (390-600 and 761-860) because
   the shared sheet collapses --measure below 760px, which makes a column get WIDER as the
   viewport narrows. Whether two labels overlap is a question about rendered string lengths
   against a column width that does not vary monotonically with the viewport, so the range
   has to be sampled. --sweep does that; the bare call keeps the fast 1440 check. */
const SWEEP = [360, 390, 430, 480, 560, 640, 700, 768, 820, 900, 1024, 1180, 1280, 1440];

const args = process.argv.slice(2);
const sweep = args.includes("--sweep");
const names = args.filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));
const WIDTHS = sweep ? SWEEP : [1440];
const b = await chromium.launch();
let bad = 0;
for (const n of list) {
 const found = [];
 for (const W of WIDTHS) {
  const p = await b.newPage({viewport: {width: W, height: 1000}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const MIN = 3;                                  // px of overlap worth reporting
    const out = {textOverText: [], pastAxis: [], outside: []};
    document.querySelectorAll(".chart svg").forEach((svg, si) => {
      // data-pv-plated marks a label drawn on its own backing rect — it covers what is
      // under it deliberately, which is the documented fix for a caption that must sit
      // over a point cloud. Excluded so it cannot mask a real collision.
      const texts = [...svg.querySelectorAll("text:not([data-pv-plated])")]
        .filter(t => t.textContent.trim());
      const boxes = texts.map(t => ({t, r: t.getBoundingClientRect(),
                                     s: t.textContent.trim().slice(0, 22)}));
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i].r, B = boxes[j].r;
          const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);
          const oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (ox > MIN && oy > MIN)
            out.textOverText.push(`svg${si}: "${boxes[i].s}" x "${boxes[j].s}"`);
        }
      // the baseline axis is the widest short horizontal line frame() draws
      let axis = null, aw = 0;
      svg.querySelectorAll("line").forEach(l => {
        const bb = l.getBoundingClientRect();
        if (bb.height < 3 && bb.width > aw) { aw = bb.width; axis = bb; }
      });
      if (axis) {
        svg.querySelectorAll("rect").forEach(el => {
          const bb = el.getBoundingClientRect();
          if (!bb.height || bb.width < 2) return;
          if (getComputedStyle(el).fill === "rgba(0, 0, 0, 0)") return;  // hover targets
          if (bb.bottom > axis.bottom + 2 && bb.top < axis.top - 2)
            out.pastAxis.push(`svg${si}: bar crosses the axis by ` +
              Math.round(bb.bottom - axis.bottom) + "px");
        });
      }
      // A FILLED MARK PAINTED OVER A TICK LABEL. This is the common form of the
      // height-arithmetic bug: the rows do not cross the axis LINE, they just run down
      // into the space where the tick labels live, so testing against the line misses it.
      const ticks = [...svg.querySelectorAll("text.pv-tick")]
        .map(t => ({r: t.getBoundingClientRect(), s: t.textContent.trim()}));
      svg.querySelectorAll("rect").forEach(el => {
        const bb = el.getBoundingClientRect();
        if (!bb.height || bb.width < 6) return;
        if (getComputedStyle(el).fill === "rgba(0, 0, 0, 0)") return;
        ticks.forEach(tk => {
          const ox = Math.min(bb.right, tk.r.right) - Math.max(bb.left, tk.r.left);
          const oy = Math.min(bb.bottom, tk.r.bottom) - Math.max(bb.top, tk.r.top);
          if (ox > MIN && oy > MIN)
            out.pastAxis.push(`svg${si}: a filled mark covers tick "${tk.s}"`);
        });
      });

      const vb = svg.getBoundingClientRect();
      [...svg.querySelectorAll("text,rect,circle,path")].forEach(el => {
        const bb = el.getBoundingClientRect();
        if (!bb.width && !bb.height) return;
        if (bb.bottom > vb.bottom + 4 || bb.top < vb.top - 4)
          out.outside.push(`svg${si}: ${el.tagName} outside the box vertically`);
      });
      /* HORIZONTALLY, THE TEST IS THE PAGE COLUMN, NOT THE SVG BOX. The header above has
         always claimed to catch ink outside the viewBox; it only ever looked up and down,
         and two agents found the same escape independently on 2026-08-28 (a right-anchored
         award name starting at x=-19.5, an annotation ending 30 units past a 1100-unit
         box). Measuring against the SVG flags 30 combinations, but 24 of them are the
         ordinary idiom of a last tick label centred on the end of its axis, which
         overhangs by half its width into a 32px gutter and harms nothing. Ink outside the
         WRAP is the real defect: that is past the page column, into the margin, and it is
         what the header meant. */
      /* ...EXCEPT where the chart deliberately pans. Between 761 and 1099 the shared
         sheet gives charts a 980px minimum inside an overflow-x:auto container, so ink
         beyond the column is the pan idiom working as designed, not a spill. Testing
         against the wrap without this exemption flagged six pages in that band on its
         first run. A scrollable container is the signal. */
      const box = svg.closest(".chart");
      const pans = box && box.scrollWidth > box.clientWidth + 1;
      const wrap = pans ? null : svg.closest(".wrap");
      if (wrap) {
        const wb = wrap.getBoundingClientRect();
        [...svg.querySelectorAll("text,rect,circle")].forEach(el => {
          const bb = el.getBoundingClientRect();
          if (!bb.width && !bb.height) return;
          const over = Math.max(bb.right - wb.right, wb.left - bb.left);
          if (over > 1) out.outside.push(
            `svg${si}: <${el.tagName}> "${(el.textContent || "").trim().slice(0, 24)}" ` +
            `${Math.round(over)}px past the page column`);
        });
      }
    });
    const uniq = a => [...new Set(a)];
    return {textOverText: uniq(out.textOverText), pastAxis: uniq(out.pastAxis),
            outside: uniq(out.outside)};
  });
  const issues = [];
  if (r.pastAxis.length) issues.push(`${r.pastAxis.length} past-axis`);
  if (r.textOverText.length) issues.push(`${r.textOverText.length} text-collisions`);
  if (r.outside.length) issues.push(`${r.outside.length} outside-box`);
  if (issues.length) {
    const all = [...r.pastAxis, ...r.textOverText, ...r.outside];
    found.push({W, issues, detail: all.slice(0, 12), elided: Math.max(0, all.length - 12)});
  }
  if (!sweep) {
    console.log(`${n.padEnd(18)} ${issues.length ? "FAIL  " + issues.join(", ") : "OK"}`);
    [...r.pastAxis, ...r.textOverText, ...r.outside].forEach(m => console.log("      " + m));
  }
  await p.close();
 }
 if (found.length) bad++;
 if (sweep) {
   console.log(`${n.padEnd(18)} ${found.length
     ? `FAIL  ${found.length}/${WIDTHS.length} widths: ` +
       found.map(f => f.W).join(", ")
     : `OK    clean at all ${WIDTHS.length} widths`}`);
   /* Every finding at the narrowest failing width, in full. Printing three per width
      handed one agent 4 of this page's 12 collisions, because the first chart's filled
      the quota before the second was reached, and a list that silently truncates is a
      list that gets half-fixed. Remaining widths are summarised by count. */
   const worst = found[0];
   if (worst) {
     worst.detail.forEach(m => console.log(`      @${worst.W} ${m}`));
     if (worst.elided) console.log(`      @${worst.W} ...and ${worst.elided} more`);
     found.slice(1).forEach(f => console.log(`      @${f.W} ${f.issues.join(", ")}`));
   }
 }
}
await b.close();
console.log(bad ? `\n${bad} artifact(s) with overlapping or out-of-frame marks`
                : "\nno collisions");
process.exit(bad ? 1 : 0);
