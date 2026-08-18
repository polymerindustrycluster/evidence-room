/* Where do the column edges actually land, across the whole viewport range?
 *
 *   node tools/widthsweep.mjs [name]
 *
 * Layout bugs that "come back" are usually two sizing systems that agree at the width you
 * tested and disagree everywhere else. This measures the text column and the figure column
 * at a sweep of widths and reports their RATIO, which is the thing a reader perceives.
 * A stable design holds that ratio roughly constant; a broken one crosses over.
 */
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const name = process.argv[2] || "talent";
const WIDTHS = [2560, 1920, 1600, 1440, 1280, 1100, 1000, 900, 820, 760, 640, 500, 390];
const b = await chromium.launch();
console.log(`${name}\n`);
console.log("  vw    wrap   lede   chart   h2    lede/chart   verdict");
for (const W of WIDTHS) {
  const p = await b.newPage({viewport: {width: W, height: 900}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + name + ".html").href);
  await p.waitForTimeout(650);
  const r = await p.evaluate(() => {
    const w = s => { const e = document.querySelector(s);
      return e ? Math.round(e.getBoundingClientRect().width) : 0; };
    return {wrap: w(".band .wrap"), lede: w(".band .lede"),
            chart: w(".chart"), h2: w(".band h2")};
  });
  const ratio = r.chart ? r.lede / r.chart : 0;
  const bad = r.chart && (ratio > 1.001 ? "TEXT WIDER THAN CHART"
            : ratio < 0.55 ? "text stranded" : "");
  console.log(`${String(W).padStart(5)} ${String(r.wrap).padStart(7)}` +
    `${String(r.lede).padStart(7)}${String(r.chart).padStart(8)}` +
    `${String(r.h2).padStart(6)}${(ratio ? ratio.toFixed(2) : "—").padStart(12)}   ${bad}`);
  await p.close();
}
await b.close();
