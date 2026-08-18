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

const names = process.argv.slice(2);
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));
const b = await chromium.launch();
let bad = 0;
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
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
    });
    const uniq = a => [...new Set(a)];
    return {textOverText: uniq(out.textOverText), pastAxis: uniq(out.pastAxis),
            outside: uniq(out.outside)};
  });
  const issues = [];
  if (r.pastAxis.length) issues.push(`${r.pastAxis.length} past-axis`);
  if (r.textOverText.length) issues.push(`${r.textOverText.length} text-collisions`);
  if (r.outside.length) issues.push(`${r.outside.length} outside-box`);
  if (issues.length) bad++;
  console.log(`${n.padEnd(18)} ${issues.length ? "FAIL  " + issues.join(", ") : "OK"}`);
  [...r.pastAxis.slice(0, 2), ...r.textOverText.slice(0, 3), ...r.outside.slice(0, 2)]
    .forEach(m => console.log("      " + m));
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} artifact(s) with overlapping or out-of-frame marks`
                : "\nno collisions");
process.exit(bad ? 1 : 0);
