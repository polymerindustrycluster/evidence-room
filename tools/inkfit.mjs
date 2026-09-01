/* How far is each chart's INK from its own viewBox edges, in viewBox units?
 * That number is exactly how much to change m.l / m.r so the drawn content spans the
 * figure column edge to edge and every chart shares the page's left and right rules.
 *   node tools/inkfit.mjs [names...]
 */
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";
const names = process.argv.slice(2);
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0,-5));
const b = await chromium.launch();
for (const n of list) {
  const p = await b.newPage({viewport:{width:1440,height:1000}});
  await p.goto(pathToFileURL(process.cwd()+"/dist/"+n+".html").href);
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => [...document.querySelectorAll(".chart svg")].map((svg,i) => {
    const vb = svg.viewBox.baseVal, box = svg.getBoundingClientRect();
    if (!vb.width || !box.width) return null;
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
    return {i, id: svg.id, vbw: Math.round(vb.width),
            leftPad: Math.round((lo - box.left)/k), rightPad: Math.round((box.right - hi)/k)};
  }).filter(Boolean));
  r.forEach(c => {
    const fix = [];
    if (Math.abs(c.leftPad) > 4) fix.push(`m.l ${c.leftPad > 0 ? "-" : "+"}${Math.abs(c.leftPad)}`);
    if (Math.abs(c.rightPad) > 4) fix.push(`m.r ${c.rightPad > 0 ? "-" : "+"}${Math.abs(c.rightPad)}`);
    if (fix.length) console.log(`${n.padEnd(18)} #${c.i} ${(c.id||"").padEnd(10)} ` +
      `inkpad L${String(c.leftPad).padStart(4)} R${String(c.rightPad).padStart(4)}  ->  ${fix.join(", ")}`);
  });
  await p.close();
}
await b.close();
