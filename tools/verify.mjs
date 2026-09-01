/* Render each bundled artifact at desktop and phone width and report what is actually
   wrong on the page: console errors, horizontal overflow, and empty slots where a script
   was supposed to write copy. The claims harness checks the numbers; this checks that the
   page carrying them renders. Usage: node tools/verify.mjs [name ...]  */
import {readdirSync, existsSync} from "fs";
import {resolve, dirname} from "path";
import {fileURLToPath} from "url";
import {chromium} from "./_browser.mjs";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(`${WEB}/dist`).filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const browser = await chromium.launch();
let bad = 0;
for (const name of names) {
  const file = `${WEB}/dist/${name}.html`;
  if (!existsSync(file)) { console.log(`${name.padEnd(20)} MISSING`); bad++; continue; }
  const out = [];
  for (const [w, h, tag] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    const page = await browser.newPage({viewport: {width: w, height: h}});
    const errs = [];
    page.on("console", m => m.type() === "error" && errs.push(m.text().slice(0, 90)));
    page.on("pageerror", e => errs.push(String(e).slice(0, 90)));
    await page.goto(`file:///${file.replace(/\\/g, "/")}`);
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      // Only count overflow a reader can actually see. Content inside a closed
      // <details> is laid out by Chromium but invisible, and counting it reports
      // horizontal scroll on pages that have none.
      const vw = document.documentElement.clientWidth;
      let over = 0;
      document.querySelectorAll("body *").forEach(e => {
        if (!e.getClientRects().length) return;
        if (e.closest("details:not([open])")) return;
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none") return;
        // an element inside its own scroll container is contained, not overflowing
        let p = e.parentElement, clipped = false;
        while (p && p !== document.body) {
          const pc = getComputedStyle(p);
          if (pc.overflowX === "auto" || pc.overflowX === "hidden" ||
              pc.overflowX === "scroll") { clipped = true; break; }
          p = p.parentElement;
        }
        if (clipped) return;
        over = Math.max(over, Math.round(e.getBoundingClientRect().right) - vw);
      });
      // a slot the script was meant to fill but left empty is invisible in a screenshot
      const empty = [...document.querySelectorAll("[id]")]
        .filter(e => /^(fig|closer|caveat|bound|footnote|.*(src|title|table|sub))/.test(e.id)
          && !e.children.length && !e.textContent.trim()
          // A slot inside a hidden dialog is not an unfilled slot. funding-map's detail
          // panel is `<aside hidden>` until a recipient is clicked, and its empty title
          // is the correct state on load, not a script that failed to run.
          && !e.closest("[hidden]")).map(e => "#" + e.id);
      // template literals that never interpolated
      const raw = (document.body.innerText.match(/\$\{[a-zA-Z]/g) || []).length;
      // STRANDED TEXT. Prose SHOULD be narrower than its container — that is a readable
      // measure. The defect is prose much narrower than a FULL-WIDTH SIBLING in the SAME
      // block: a standfirst at half the width of the chart under it reads as a broken
      // column. Measured per block, and only where both a standfirst and a wide sibling
      // exist, because a two-word headline is not a defect.
      const fill = [];
      const w = e => e ? e.getBoundingClientRect().width : 0;
      document.querySelectorAll(".band, .hero").forEach((b, i) => {
        const prose = w(b.querySelector(".lede, .stand"));
        const sib = Math.max(w(b.querySelector(".chart")), w(b.querySelector(".hero-row")));
        if (!prose || sib < 600) return;
        if (prose / sib < 0.6)
          fill.push(`block${i}=${Math.round(prose / sib * 100)}%`);
      });
      /* PROVENANCE. A page that shows charts and no "Reproduce this" block is asserting
         reproducibility it does not provide — the state every page was in before
         2026-08-17, when an audit found 3 of 20 datasets published a source URL and none
         published its industry codes. The registry (_data/SOURCES.json) decides which
         pages owe one; a page absent from it fails rather than quietly rendering nothing. */
      const reg = (() => {
        const t = document.querySelector('script[data-pv-file="SOURCES.json"]');
        try { return t ? JSON.parse(t.textContent) : null; } catch (e) { return null; }
      })();
      const slug = location.pathname.split("/").pop().replace(/\.html$/, "");
      let prov = null;
      if (!reg) prov = "no source registry in the bundle";
      else if (!(slug in (reg.by_artifact || {}))) prov = `${slug} is not in SOURCES.json`;
      else if ((reg.by_artifact[slug] || []).length &&
               !document.querySelector(".pv-repro")) prov = "no reproduce block rendered";
      return {over, empty, raw, fill, prov, svgs: document.querySelectorAll("svg").length,
              tables: document.querySelectorAll("table").length};
    });
    if (errs.length) out.push(`${tag}:err(${errs.length}) ${errs[0]}`);
    if (r.over > 1) out.push(`${tag}:overflow ${r.over}px`);
    if (r.empty.length) out.push(`${tag}:empty ${r.empty.join(",")}`);
    if (r.raw) out.push(`${tag}:uninterpolated x${r.raw}`);
    if (r.fill && r.fill.length) out.push(`${tag}:stranded ${r.fill.join(",")}`);
    if (r.prov) out.push(`${tag}:provenance ${r.prov}`);
    if (tag === "1440") out.push(`svg=${r.svgs} tables=${r.tables}`);
    await page.close();
  }
  const clean = out.every(s => /^svg=/.test(s));
  if (!clean) bad++;
  console.log(`${name.padEnd(20)} ${clean ? "OK  " : "FAIL"} ${out.join("  ")}`);
}
await browser.close();
console.log(bad ? `\n${bad} artifact(s) need attention` : "\nall clean");
process.exit(bad ? 1 : 0);
