/* DOES THE READER GET THE KEY BEFORE THE DATA?
 *
 *   node tools/legends.mjs [names...]
 *
 * House law (2026-08-31): a chart's legend renders ABOVE the chart, in reading order.
 * A below-chart key makes the reader meet the data, fail to decode it, scan down for
 * the key, and scan back up. The exemplars this room is built against agree: NYT colors
 * the category words directly above the graphic, Datawrapper defaults the scatter color
 * key above the plot (Silver Bulletin ships Datawrapper), and The Pudding keys color in
 * the prose itself. Direct labeling beats both where it fits, and the shared sheet's
 * .pv-lab labels are still the first choice; the .legend row exists for what cannot be
 * labeled in place (generic dot classes, hatch fills, dashed-vs-solid).
 *
 * Until today the site did both: every .legend sat BELOW its chart, at the correct left
 * rail, on twelve charts across nine pages. Alignment was consistent; position was the
 * defect. No gate could disagree, because none stated the rule.
 *
 * WHAT THIS DOES: static DOM-order check. A <div class="legend"> may not appear
 * immediately after a .chart div's close. It should precede its .chart. Static on
 * purpose — the rule is about document order, which the HTML states exactly; no
 * browser needed, so it costs nothing and cannot flake.
 *
 * WHAT THIS DOES NOT DO: it cannot see legends drawn INSIDE an svg by app.js (the
 * wages family key row is one), and it does not judge whether a legend should have
 * been a set of direct labels instead. Those stay editorial.
 */
import {readFileSync, existsSync, readdirSync, statSync} from "fs";
import {resolve, dirname, join} from "path";
import {fileURLToPath} from "url";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const pages = (args.length ? args : readdirSync(WEB).filter(d => {
  try { return statSync(join(WEB, d)).isDirectory() && existsSync(join(WEB, d, "index.html")); }
  catch { return false; }
})).filter(d => !d.startsWith("_") && !["node_modules","dist","tools","shots"].includes(d));

const divEnd = (t, start) => {
  let depth = 0;
  for (const m of t.slice(start).matchAll(/<div\b|<\/div>/g)) {
    depth += m[0] === "<div" ? 1 : -1;
    if (depth === 0) return start + m.index + m[0].length;
  }
  return -1;
};

let fail = 0, legends = 0;
for (const page of pages) {
  const t = readFileSync(join(WEB, page, "index.html"), "utf-8");
  legends += (t.match(/<div class="legend[" ]/g) || []).length;
  for (const m of t.matchAll(/<div class="chart[" ]/g)) {
    const end = divEnd(t, m.index);
    if (end < 0) continue;
    const after = t.slice(end).match(/^\s*(?:<!--[\s\S]*?-->\s*)?<div class="legend[" ]/);
    if (after) {
      const line = t.slice(0, end).split("\n").length;
      console.log(`  \x1b[31mKEY-AFTER-DATA\x1b[0m ${page}/index.html:${line}  a .legend follows its .chart — move it above; the reader decodes before they meet the data`);
      fail++;
    }
  }
}

console.log();
if (fail) {
  console.log(`\x1b[31mlegends: ${fail} chart(s) keyed after the fact\x1b[0m`);
  process.exit(1);
}
console.log(`\x1b[32mlegends: clean\x1b[0m  (${pages.length} pages, ${legends} legend blocks, all key-before-data)`);
