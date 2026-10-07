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
   Until 5 October 2026 .eyebrow was exempt, the brand lime at 4.12:1 on --ink, pending
   John's call; he made it (lighten the lime on the hero only), so nothing is exempt now. */
import {readdirSync, existsSync} from "fs";
import {spawnSync} from "child_process";
import {resolve, dirname} from "path";
import {fileURLToPath} from "url";
import {launch} from "./_browser.mjs";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* Published apparatus with no data source of its own (the corrections log), named with its
   reason in _data/build/masthead.py UNCARDED. Such a page owes no registry row; any other
   page absent from SOURCES.json still fails. Unreadable means nothing is exempt. */
const UNCARDED = (() => {
  const py = spawnSync("python3", ["-c", "import json,sys; sys.path.insert(0,'_data/build'); " +
    "import masthead; print(json.dumps(masthead.UNCARDED))"], {cwd: WEB, encoding: "utf8"});
  try { return py.status === 0 ? JSON.parse(py.stdout) : {}; } catch { return {}; }
})();
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(`${WEB}/dist`).filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

/* CONTRAST AGAINST THE PIXELS ACTUALLY BEHIND THE TEXT, added 5 October 2026. The layer
   walk below reads background colours off the text's ancestors, and a pseudo-element is
   not an ancestor: the hero's radial glow (.hero::before) sat under the eyebrow and
   took the new #C6DE5D to 4.35:1 on funding-map at 1440 while this gate printed OK (PR
   #48 review). So every text element in .mast and .hero is also measured off two
   screenshots of that region at device scale 1: one as rendered, one with the text made
   transparent. Pixels that differ are glyph pixels; the second shot gives the exact
   background under each, glow, gradient or image included, and the element's own colour
   is composited over it. The worst glyph pixel must clear 4.5:1 (3:1 for large text).
   A text element with no glyph pixel found (clipped, or painted in its background's
   colour) is reported as unmeasured and fails. Run at 1440, 768 and 390. */
async function pixelContrast(page) {
  await page.evaluate(() => document.fonts.ready);
  const pre = await page.evaluate(() => {
    const roots = [...document.querySelectorAll(".mast, .hero")];
    if (!roots.length) return null;
    const sx = scrollX, sy = scrollY;
    let x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0;
    roots.forEach(r => { const b = r.getBoundingClientRect();
      x0 = Math.min(x0, b.left + sx); y0 = Math.min(y0, b.top + sy);
      x1 = Math.max(x1, b.right + sx); y1 = Math.max(y1, b.bottom + sy); });
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    const els = [];
    roots.forEach(root => [root, ...root.querySelectorAll("*")].forEach(e => {
      if (e.closest("svg") || !e.checkVisibility({visibilityProperty: true, opacityProperty: true})) return;
      /* visually hidden until focused (the "Skip the chart" control): clipped to nothing */
      for (let p = e; p && p !== root.parentElement; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.clip !== "auto" || (ps.clipPath !== "none" && /inset\(50%|inset\(100%/.test(ps.clipPath))) return;
      }
      const texts = [...e.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim());
      if (!texts.length) return;
      const cs = getComputedStyle(e);
      let op = 1; for (let p = e; p; p = p.parentElement) op *= +getComputedStyle(p).opacity;
      const m = cs.color.match(/[\d.]+/g).map(Number);
      const rects = texts.flatMap(t => { const g = document.createRange(); g.selectNodeContents(t);
        return [...g.getClientRects()].map(q => ({x: q.left + sx, y: q.top + sy, r: q.right + sx, b: q.bottom + sy})); });
      const px = parseFloat(cs.fontSize);
      els.push({tag: `${e.tagName.toLowerCase()}${e.className ? "." + String(e.className).split(" ")[0] : ""}`,
        text: e.textContent.trim().slice(0, 24), fg: m.slice(0, 3), a: (m.length > 3 ? m[3] : 1) * op,
        large: px >= 24 || (+cs.fontWeight >= 700 && px >= 18.66), rects});
    }));
    return {clip: {x: x0, y: y0, width: Math.ceil(x1) - x0, height: Math.ceil(y1) - y0}, els};
  });
  if (!pre || !pre.els.length) return {bad: [], unmeasured: [], n: 0};
  const shot = async () => (await page.screenshot({fullPage: true, clip: pre.clip, animations: "disabled"})).toString("base64");
  /* transitions off first: a colour that eases to transparent is still half drawn when the
     second shot is taken, and its glyphs read as their own background (chain's chips) */
  const still = await page.addStyleTag({content: "*, *::before, *::after { transition: none !important }"});
  await page.waitForTimeout(200);
  const seen = await shot();
  const tagEl = await page.addStyleTag({content: ".mast, .mast *, .hero, .hero * { color: transparent !important; " +
    "text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important }"});
  const bare = await shot();
  await tagEl.evaluate(n => n.remove());
  await still.evaluate(n => n.remove());
  return page.evaluate(async ({pre, seen, bare}) => {
    const read = async d => { const im = new Image(); im.src = "data:image/png;base64," + d; await im.decode();
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      const x = c.getContext("2d"); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height); };
    const V = await read(seen), B = await read(bare);
    const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    const lum = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
    const out = {bad: [], unmeasured: [], n: 0};
    for (const e of pre.els) {
      let worst = Infinity, glyphs = 0;
      for (const q of e.rects) {
        for (let y = Math.max(0, Math.floor(q.y - pre.clip.y)); y < Math.min(V.height, Math.ceil(q.b - pre.clip.y)); y++)
          for (let x = Math.max(0, Math.floor(q.x - pre.clip.x)); x < Math.min(V.width, Math.ceil(q.r - pre.clip.x)); x++) {
            const i = (y * V.width + x) * 4;
            if (Math.max(Math.abs(V.data[i] - B.data[i]), Math.abs(V.data[i + 1] - B.data[i + 1]),
                         Math.abs(V.data[i + 2] - B.data[i + 2])) < 30) continue;
            glyphs++;
            const bg = [B.data[i], B.data[i + 1], B.data[i + 2]];
            const fg = e.fg.map((v, k) => v * e.a + bg[k] * (1 - e.a));
            const [h, l] = [lum(fg), lum(bg)].sort((p, q2) => q2 - p);
            worst = Math.min(worst, (h + .05) / (l + .05));
          }
      }
      if (!glyphs) { out.unmeasured.push(`${e.tag} "${e.text}" (no glyph pixels found)`); continue; }
      out.n++;
      if (worst < (e.large ? 3 : 4.5) - 0.005) out.bad.push(`${e.tag} "${e.text}" ${worst.toFixed(2)}:1`);
    }
    return out;
  }, {pre, seen, bare});
}

/* OVERFLOW WITH EVERY DISCLOSURE OPEN (PR #54 review, 7 October 2026). The pass above skips
   content inside a closed <details>, rightly: it is not on screen. But a reader opens them,
   and the hub's job-count table, inside a closed key, widened the whole document to 394px at
   360 and 390 the moment it was opened while this gate passed. So each page is measured a
   second time with every <details> opened, at 1440, 390 and 360. Contained overflow (an
   ancestor that scrolls or clips) is still not overflow. */
async function openOverflow(page) {
  await page.evaluate(() => document.querySelectorAll("details").forEach(d => { d.open = true; }));
  await page.waitForTimeout(150);
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    let over = 0, who = "";
    document.querySelectorAll("body *").forEach(e => {
      if (!e.getClientRects().length) return;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.display === "none") return;
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const x = getComputedStyle(p).overflowX;
        if (x === "auto" || x === "hidden" || x === "scroll") return;
      }
      const o = Math.round(e.getBoundingClientRect().right) - vw;
      if (o > over) { over = o; who = e.tagName.toLowerCase() + (e.className ? "." + String(e.className).split(" ")[0] : ""); }
    });
    const doc = document.documentElement.scrollWidth - vw;
    return doc > over ? {over: doc, who: "text past its box"} : {over, who};
  });
}

const browser = await launch();
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
    });
    if (errs.length) out.push(`${tag}:err(${errs.length}) ${errs[0]}`);
    if (r.over > 1) out.push(`${tag}:overflow ${r.over}px`);
    if (r.empty.length) out.push(`${tag}:empty ${r.empty.join(",")}`);
    if (r.raw) out.push(`${tag}:uninterpolated x${r.raw}`);
    if (r.fill && r.fill.length) out.push(`${tag}:stranded ${r.fill.join(",")}`);
    if (r.prov && !(UNCARDED[name] && r.prov.endsWith("is not in SOURCES.json")))
      out.push(`${tag}:provenance ${r.prov}`);
    if (r.contrast.bad.length) out.push(`${tag}:contrast ${r.contrast.bad.length} under AA: ${r.contrast.bad.slice(0, 3).join(", ")}`);
    if (r.contrast.unmeasured.length) out.push(`${tag}:contrast UNMEASURED ${r.contrast.unmeasured.slice(0, 3).join(", ")}`);
    const pc = await pixelContrast(page);
    if (pc.bad.length) out.push(`${tag}:contrast-rendered ${pc.bad.length} under AA: ${pc.bad.slice(0, 3).join(", ")}`);
    if (pc.unmeasured.length) out.push(`${tag}:contrast-rendered UNMEASURED ${pc.unmeasured.slice(0, 3).join(", ")}`);
    if (tag === "1440") out.push(`svg=${r.svgs} tables=${r.tables} hero-text=${r.contrast.n} hero-text-rendered=${pc.n}`);
    const oo = await openOverflow(page);
    if (oo.over > 1) out.push(`${tag}:overflow-open ${oo.over}px (${oo.who}) with every disclosure open`);
    await page.close();
  }
  {
    const page = await browser.newPage({viewport: {width: 360, height: 800}});
    await page.goto(`file:///${file.replace(/\\/g, "/")}`);
    await page.waitForTimeout(900);
    const oo = await openOverflow(page);
    if (oo.over > 1) out.push(`360:overflow-open ${oo.over}px (${oo.who}) with every disclosure open`);
    await page.close();
  }
  {
    /* 768 for the rendered measure only: the glow's geometry follows the hero's width,
       and its worst overlap with the eyebrow fell between the two widths above. */
    const page = await browser.newPage({viewport: {width: 768, height: 900}});
    await page.goto(`file:///${file.replace(/\\/g, "/")}`);
    await page.waitForTimeout(900);
    const pc = await pixelContrast(page);
    if (pc.bad.length) out.push(`768:contrast-rendered ${pc.bad.length} under AA: ${pc.bad.slice(0, 3).join(", ")}`);
    if (pc.unmeasured.length) out.push(`768:contrast-rendered UNMEASURED ${pc.unmeasured.slice(0, 3).join(", ")}`);
    await page.close();
  }
  const clean = out.every(s => /^svg=/.test(s));
  if (!clean) bad++;
  console.log(`${name.padEnd(20)} ${clean ? "OK  " : "FAIL"} ${out.join("  ")}`);
}
await browser.close();
console.log(bad ? `\n${bad} artifact(s) need attention` : "\nall clean");
process.exit(bad ? 1 : 0);
