/* 1:1 crop of one block, for judging composition and legibility that a downscaled
   full-page screenshot hides.
 *
 *   node tools/crop.mjs talent .hero            the top
 *   node tools/crop.mjs talent .closer 2000     the bottom, at a wide window
 *   node tools/crop.mjs talent chart:1          the second chart
 *
 * Full-page shots are for flow. They are NOT for judging whether a block is composed —
 * at 400px wide a dark band reads as a dark band and a half-empty hero looks fine.
 */
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";
const [name, selRaw = ".hero", wRaw] = process.argv.slice(2);
const W = Number(wRaw || 1440);
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: W, height: 1000}});
await p.goto(pathToFileURL(process.cwd() + "/dist/" + name + ".html").href);
await p.waitForTimeout(1000);
const box = await p.evaluate(sel => {
  const m = /^chart:(\d+)$/.exec(sel);
  const el = m ? document.querySelectorAll(".chart")[Number(m[1])]
                : document.querySelector(sel);
  if (!el) return null;
  el.scrollIntoView({block: "center"});
  const r = el.getBoundingClientRect();
  return {x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6),
          width: Math.min(r.width + 12, window.innerWidth),
          height: Math.min(r.height + 12, window.innerHeight)};
}, selRaw);
await p.waitForTimeout(300);
/* Named per page+selector so a batch of crops can be compared side by side; a single
   _crop.png meant every crop overwrote the one before it and only the last survived. */
const out = `shots/_crop-${name}-${selRaw.replace(/[^a-z0-9]+/gi, "")}-${W}.png`;
await p.screenshot({path: out, ...(box ? {clip: box} : {})});
console.log(`${out} — ${name} ${selRaw} at ${W}px${box ? "" : " (no match, full viewport)"}`);
await b.close();
