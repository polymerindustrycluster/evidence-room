/* Render each bundled artifact at desktop and phone width and report what is actually
   wrong on the page: console errors, horizontal overflow, and empty slots where a script
   was supposed to write copy. The claims harness checks the numbers; this checks that the
   page carrying them renders. Usage: node tools/verify.mjs [name ...]

   TEXT CONTRAST IN THE MASTHEAD AND HERO, added 4 October 2026. The byline under every
   hero measured 3.62:1 (#9CC4CA on --ink at 13px) and the hero stat labels 3.87:1, on all
   23 pages, and no gate measured colour (review ER-11). At 1440 every text element in
   .mast and .hero is measured against the background it actually sits on: WCAG 2 relative
   luminance, 4.5:1 below 24px (18.66px bold), else 3:1. A background it cannot resolve to
   one colour (an image or gradient under the text) is reported as unmeasured and fails.
   The one exemption is .eyebrow, the brand lime (#B8D637) at 12px bold, 4.12:1 on --ink:
   brand colour is John's call, not a gate's, and it is listed until he makes it. */
const CONTRAST_EXEMPT = ".eyebrow";
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
    const r = await page.evaluate(EXEMPT => {
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
      const contrast = {bad: [], unmeasured: [], n: 0};
      if (innerWidth >= 1000) {
        const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null;
          const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
          return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1}; };
        const lum = ({r, g, b}) => { const f = v => { v /= 255;
          return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
          return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
        const over = (t, u) => ({r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a),
          b: t.b * t.a + u.b * (1 - t.a), a: 1});
        const seen = new Set();
        document.querySelectorAll(".mast, .hero").forEach(root => [root, ...root.querySelectorAll("*")].forEach(e => {
          if (seen.has(e)) return; seen.add(e);
          if (e.closest("svg") || !e.checkVisibility({visibilityProperty: true, opacityProperty: true})) return;
          if (![...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) return;
          const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
          if (e.matches(EXEMPT)) return;
          const cs = getComputedStyle(e);
          const layers = []; let why = null, op = 1;
          for (let p = e; p; p = p.parentElement) {
            const ps = getComputedStyle(p);
            op *= +ps.opacity;
            if (ps.backgroundImage !== "none") { why = "an image or gradient behind it"; break; }
            const c = rgba(ps.backgroundColor);
            if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
          }
          const fg0 = rgba(cs.color);
          const tag = `${e.tagName.toLowerCase()}${e.className ? "." + String(e.className).split(" ")[0] : ""}`;
          if (why || !fg0) { contrast.unmeasured.push(`${tag} (${why || cs.color})`); return; }
          let bg = {r: 255, g: 255, b: 255, a: 1};
          for (const l of layers.reverse()) bg = over(l, bg);
          const fg = over({...fg0, a: fg0.a * op}, bg);
          const [x, y] = [lum(fg), lum(bg)].sort((p, q) => q - p);
          const ratio = (x + .05) / (y + .05);
          const px = parseFloat(cs.fontSize), large = px >= 24 || (+cs.fontWeight >= 700 && px >= 18.66);
          contrast.n++;
          if (ratio < (large ? 3 : 4.5) - 0.005)
            contrast.bad.push(`${tag} "${e.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}:1`);
        }));
      }
      return {over, empty, raw, fill, prov, contrast, svgs: document.querySelectorAll("svg").length,
              tables: document.querySelectorAll("table").length};
    }, CONTRAST_EXEMPT);
    if (errs.length) out.push(`${tag}:err(${errs.length}) ${errs[0]}`);
    if (r.over > 1) out.push(`${tag}:overflow ${r.over}px`);
    if (r.empty.length) out.push(`${tag}:empty ${r.empty.join(",")}`);
    if (r.raw) out.push(`${tag}:uninterpolated x${r.raw}`);
    if (r.fill && r.fill.length) out.push(`${tag}:stranded ${r.fill.join(",")}`);
    if (r.prov) out.push(`${tag}:provenance ${r.prov}`);
    if (r.contrast.bad.length) out.push(`${tag}:contrast ${r.contrast.bad.length} under AA: ${r.contrast.bad.slice(0, 3).join(", ")}`);
    if (r.contrast.unmeasured.length) out.push(`${tag}:contrast UNMEASURED ${r.contrast.unmeasured.slice(0, 3).join(", ")}`);
    if (tag === "1440") out.push(`svg=${r.svgs} tables=${r.tables} hero-text=${r.contrast.n}`);
    await page.close();
  }
  const clean = out.every(s => /^svg=/.test(s));
  if (!clean) bad++;
  console.log(`${name.padEnd(20)} ${clean ? "OK  " : "FAIL"} ${out.join("  ")}`);
}
await browser.close();
console.log(bad ? `\n${bad} artifact(s) need attention` : "\nall clean");
process.exit(bad ? 1 : 0);
