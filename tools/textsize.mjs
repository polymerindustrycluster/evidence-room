/* Chartability P3 — text below 12px / 9pt fails. Declarations are not the measure:
 * SVG text is authored in viewBox units and rendered at whatever scale the container
 * imposes, so a compliant 12px declaration can paint at 10.7 real pixels.
 *
 *   node tools/textsize.mjs [--mobile] [names...]
 *
 * Reports the smallest RENDERED text on each page, DOM and SVG separately, using the
 * element's own getBoundingClientRect against its computed font-size.
 */
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const names = args.filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));
const W = mobile ? 390 : 1440;

const b = await chromium.launch();
let bad = 0;
for (const n of list) {
  const p = await b.newPage({viewport: {width: W, height: 1000}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const out = {dom: [], svg: []};
    // DOM text: computed font-size is already in CSS pixels
    document.querySelectorAll("body *:not(svg):not(svg *)").forEach(e => {
      if (!e.getClientRects().length) return;
      if (![...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) return;
      const fs = parseFloat(getComputedStyle(e).fontSize);
      if (fs) out.dom.push({fs: +fs.toFixed(1), sel: e.className || e.tagName});
    });
    // SVG text: authored in user units, so multiply by the element's actual scale.
    // An SVG we cannot scale is UNMEASURED, not clean — a collapsed chart would
    // otherwise report "svg-min —" and pass the check that exists to catch it.
    const unmeasured = [];
    document.querySelectorAll("svg").forEach(svg => {
      const vb = svg.viewBox && svg.viewBox.baseVal;
      const box = svg.getBoundingClientRect();
      const texts = [...svg.querySelectorAll("text")].filter(t => t.textContent.trim());
      if (!vb || !vb.width || !box.width) {
        if (texts.length) unmeasured.push(
          (svg.getAttribute("class") || svg.parentElement?.className || "svg") +
          ":" + texts.length + (!vb || !vb.width ? " no-viewBox" : " zero-width"));
        return;
      }
      const scale = box.width / vb.width;
      texts.forEach(t => {
        const fs = parseFloat(getComputedStyle(t).fontSize) * scale;
        out.svg.push({fs: +fs.toFixed(1), cls: t.getAttribute("class") || "text",
                      scale: +scale.toFixed(3)});
      });
    });
    const min = a => a.length ? a.reduce((m, x) => x.fs < m.fs ? x : m) : null;
    const under = a => [...new Set(a.filter(x => x.fs < 12)
      .map(x => (x.cls || x.sel) + "@" + x.fs))].slice(0, 4);
    return {domMin: min(out.dom), svgMin: min(out.svg), unmeasured,
            domUnder: under(out.dom), svgUnder: under(out.svg),
            scale: out.svg[0] ? out.svg[0].scale : null};
  });
  const fail = (r.domUnder.length || r.svgUnder.length || r.unmeasured.length);
  if (fail) bad++;
  console.log(`${n.padEnd(18)} ${fail ? "FAIL" : "PASS"}  ` +
    `dom-min ${r.domMin ? r.domMin.fs : "—"}  svg-min ${r.svgMin ? r.svgMin.fs : "—"}` +
    `${r.scale ? `  (svg scale ${r.scale})` : ""}` +
    `${r.svgUnder.length ? "  svg<12: " + r.svgUnder.join(" ") : ""}` +
    `${r.domUnder.length ? "  dom<12: " + r.domUnder.join(" ") : ""}` +
    `${r.unmeasured.length ? "  UNMEASURED: " + r.unmeasured.join(" ") : ""}`);
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} artifact(s) below the 12px floor or unmeasurable`
                : "\nall text at or above 12px");
process.exit(bad ? 1 : 0);
