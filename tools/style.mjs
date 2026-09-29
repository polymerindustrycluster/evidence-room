/* HOUSE STYLE LAW, asserted against the rendered page.
 *
 * The law is written down and the pages broke it anyway: 34 em-dashes and 6 straight
 * apostrophes shipped across five pages. That is the pattern this harness keeps meeting
 * — a rule held only by an author's memory decays — so it becomes a check.
 *
 *   node tools/style.mjs [names...]
 *
 * WHY A TREEWALKER AND NOT innerText: innerText skips collapsed and hidden content, so
 * it cannot see the methodology box's source registry or the <details> table twins.
 * The first pass of this audit used innerText and undercounted by more than half.
 *
 * THREE THINGS ARE DELIBERATELY NOT VIOLATIONS:
 *   - a BARE em-dash alone in a cell or chart label: the no-data placeholder, correct
 *   - an en-dash between numbers (2015-2026): a range, correct
 *   - anything inside <script>: inlined source comments, which no reader sees
 */
import {readdirSync, existsSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

import {readFileSync as rfs} from "fs";
let ACRO = {assumed_known: [], debt: {}};
try { ACRO = JSON.parse(rfs(new URL("../_data/acronyms.json", import.meta.url), "utf-8")); } catch {}

/* WITHDRAWN PHRASINGS. A correction retires a phrasing, and the phrasing comes back:
   collaboration's "joint work" survived four rounds of rewrites of the sentences around
   it, and a Read-next line added on the correction branch itself reintroduced it
   (2026-09-28). Only a grep outside the repo caught that. The list is read unguarded: a
   missing or malformed file must fail the gate, not empty the list and pass. It catches a
   phrasing coming back, not one hidden on purpose: CSS generated content, form control
   values, shadow DOM, zero-width characters and text painted invisible by colour, clipping,
   masking, compounded opacity or position are out of reach, and every exemption is printed. */
const WITHDRAWN = JSON.parse(rfs(new URL("../_data/withdrawn.json", import.meta.url), "utf-8")).withdrawn;
for (const w of WITHDRAWN) new RegExp(w.pattern.replaceAll(" ", "\\s+"), "gi");  /* the form the page compiles */

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

/* Every run checks the whole list: an entry for a renamed or missing page would otherwise
   pass forever. A page is an artifact with an index.html; a full run must also have its
   bundle to inspect. */
const unknown = [...new Set(WITHDRAWN.flatMap(w => w.pages))]
  .filter(pg => !existsSync(`${pg}/index.html`) || (!names.length && !list.includes(pg)));
if (unknown.length) {
  console.log(`withdrawn.json names page(s) with no artifact or no bundle in dist/: ${unknown.join(", ")}`);
  process.exit(1);
}

const b = await chromium.launch();
let bad = 0, total = 0;
const exempt = [];
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(1600)  /* 900 raced chain's 785 JS-rendered cards: the acronym inventory flapped between runs. 2026-09-01 */;
  const all = await p.evaluate(({withdrawn, assumed, debtPages}) => {
    const BANNED = /\b(crucial|delve|matters)\b/i;
    const out = [];
    const pageText = [];
    const WRE = withdrawn.map(src => new RegExp(src.replaceAll(" ", "\\s+"), "gi"));
    const MONTH = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
    const NOTE = new RegExp(`\\bCorrect(?:ion|ed)\\b[\\s,·.:]*(?:\\d{1,2}\\s+${MONTH}|${MONTH}\\s+\\d{1,2}),?\\s+\\d{4}`);
    /* Where a phrase is looked for and where a note may exempt it are two questions with
       opposite safe answers, so they get two different boxes. A phrase is looked for in
       the widest run of text a reader could take as one passage: up to the nearest box
       that is not inline-level, walking through pills, controls, ruby, display:contents
       wrappers, table parts and flex or grid items, so no box can split "Joint <span
       class=pill>work</span>".
       A note exempts only a phrase that starts in the note's own box, the nearest ancestor
       that is not plain inline, so two cards in one row stay two. Merging too much can
       only fail a page; splitting too much could pass one. Round 13 of review found
       thirteen ways a list of elements left one or the other open. */
    const done = new Set(), owners = new Map(), ids = new Map();
    const disp = e => getComputedStyle(e).display;
    const host = e => { do e = e.parentElement; while (e && disp(e) === "contents"); return e; };
    /* flex, grid and the old -webkit-box all lay each child out as an item */
    const ITEMS = /(flex|grid|box)$/;
    const item = e => ITEMS.test(host(e) ? disp(host(e)) : "");
    const wide = e => /^(inline|contents|ruby|table-|-webkit-inline)/.test(disp(e)) || !!e.closest("select") || item(e);
    /* a block inside an inline-level box ("Jo<span style=display:inline-block><b
       style=display:block>int</b></span>") still sits in the line around that box */
    const atom = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement)
      if (/^(inline-|-webkit-inline)/.test(disp(a))) return a; return null; };
    const own = e => {
      if (!owners.has(e)) {
        let b = e;
        for (let x; ; b = x.parentElement) { while (b !== document.body && wide(b)) b = b.parentElement; if (b === document.body || !(x = atom(b))) break; }
        owners.set(e, b);
      }
      return owners.get(e);
    };
    const box = e => { while (e !== document.body && disp(e) === "inline" && !item(e)) e = e.parentElement; return e; };
    /* Text a reader cannot see below the given ancestor: hidden, not displayed, contents
       skipped, fully transparent by opacity or filter (neither of which a display:contents
       element, having no box, can apply), not visible, or under a pixel high once its font
       size is shrunk by every zoom and by the transforms above it, composed, since two can
       cancel. A plain inline box takes no transform and skips no contents. Visibility and
       font size are inherited and can be overridden, so they are read on the text's own
       element. What this misses keeps a phrase in the seen reading, where the all-text
       reading has it anyway; what it wrongly drops can only fail an exemption (see exempt). */
    const turn = a => {
      const m = new DOMMatrix();
      if (a.rotate !== "none") {
        const v = a.rotate.split(" "), deg = parseFloat(v.at(-1)) * ({rad: 180 / Math.PI, turn: 360, grad: 0.9}[v.at(-1).replace(/[-\d.e+]/g, "")] ?? 1);
        const ax = v.length === 4 ? v.slice(0, 3).map(Number) : ({x: [1, 0, 0], y: [0, 1, 0]}[v[0]] ?? [0, 0, 1]);
        m.rotateAxisAngleSelf(...ax, deg);
      }
      if (a.scale !== "none") { const [x, y = x] = a.scale.split(" ").map(Number); m.scaleSelf(x, y); }
      if (a.transform !== "none") m.multiplySelf(new DOMMatrix(a.transform));
      return m;
    };
    /* a box draws its children flattened into its own plane unless it keeps them in 3D,
       which any grouping property (opacity, filter, clip, mask, overflow, isolation, blend
       or paint containment) overrides */
    const flat = a => a.transformStyle !== "preserve-3d" || parseFloat(a.opacity) < 1 || a.filter !== "none"
      || a.clipPath !== "none" || a.maskImage !== "none" || !/^(visible|clip)$/.test(a.overflowX)
      || !/^(visible|clip)$/.test(a.overflowY) || a.isolation === "isolate" || a.mixBlendMode !== "normal"
      || /paint|strict|content/.test(a.contain);
    const gone = (e, top) => {
      const c = getComputedStyle(e);
      if (c.visibility !== "visible") return true;
      let px = parseFloat(c.fontSize), m = new DOMMatrix();
      for (; e && e !== top; e = e.parentElement) {
        const a = getComputedStyle(e), inl = /^(inline|contents)$/.test(a.display);
        if (e.hidden || a.display === "none" || (a.contentVisibility === "hidden" && !inl)) return true;
        const z = parseFloat(a.zoom);
        if (!isNaN(z)) px *= z;
        if (a.display === "contents") continue;
        if (a.opacity === "0" || /opacity\(0\)/.test(a.filter)) return true;
        /* composed in 3D only through a box that keeps its children in 3D: rotateX(90deg)
           inside rotateX(-90deg) stays edge-on under transform-style: flat, and cancels
           under preserve-3d */
        if (!inl) { if (flat(a)) m = new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]); m = turn(a).multiply(m); }
      }
      /* the smaller singular value of the composed transform's 2D part */
      const t = m.a ** 2 + m.b ** 2 + m.c ** 2 + m.d ** 2, d = m.a * m.d - m.b * m.c;
      return px * Math.sqrt(Math.max(0, (t - Math.sqrt(Math.max(0, t * t - 4 * d * d))) / 2)) < 1;
    };
    /* Whether a reader sees a break between two text nodes: one of them sits in a box that
       is not inline-level below the nearest element holding both, or that element lays its
       children out as flex, grid or box items, which a run of bare text joins as an
       anonymous item. An inline-level box ("Jo<span style=display:inline-block>int</span>")
       sits in its parent's line, and a display:contents element has no box. */
    const breaks = (a, b) => {
      let l = a.parentElement;
      while (!l.contains(b)) l = l.parentElement;
      /* the box nearest l decides: whatever sits inside an inline-level box (inline-block,
         inline-flex, -webkit-inline-box ...) breaks only within it, since the box itself
         sits in l's line */
      const boxed = n => { let br = false;
        for (let e = n.parentElement; e !== l; e = e.parentElement)
          if (/^(inline-|-webkit-inline)/.test(disp(e))) br = false;
          else if (!/^(inline|ruby|contents)/.test(disp(e)) || item(e)) br = true;
        return br; };
      return ITEMS.test(disp(l)) || boxed(a) || boxed(b);
    };
    /* the text `top` owns under `mine`, the text nodes `keep` admits, and where each
       starts; with `gap`, text `top` does not own leaves a GAP where it was; with `apart`,
       a space goes wherever a reader sees a break (see breaks) or where text `top` does not
       own was left out */
    const GAP = "\u0000";
    const read = (top, mine, keep, gap, apart) => {
      const r = {bt: "", at: [], nodes: []};
      let last = null, cut = false;
      const tw = document.createTreeWalker(top, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let u; (u = tw.nextNode());) {
        if (u.nodeType === 1 && u.tagName !== "BR") continue;
        const pe = u.nodeType === 1 ? u : u.parentElement;
        if (pe.closest("script,style,noscript") || !keep(pe)) continue;
        if (mine(u.parentElement) !== top) { if (gap && !r.bt.endsWith(GAP)) r.bt += GAP; cut = true; continue; }
        if (u.nodeType === 1) r.bt += "\n";
        else {
          if (apart) { if (cut || (last && breaks(last, u))) r.bt += " "; last = u; }
          r.at.push(r.bt.length); r.nodes.push(u); r.bt += u.textContent;
        }
        cut = false;
      }
      return r;
    };
    /* A dated correction note may quote what it corrects, and a phrase inside curly double
       quotes is a mention, not a use; both are exempt, judged on the visible text of the
       phrase's own line: the box it starts in, with any pill or control inside that box,
       up to any block inside it. Text left out cannot open a quotation or join a label to
       a date. A note's label counts only where that line carries it, not where prose quotes
       it ("the log's “Correction, 28 September 2026” entry"): a quotation is emptied, not
       deleted, so it cannot join a label to a date on either side of it. A quotation
       exempts only a phrase it closes around within the line. */
    /* The line is judged twice, on all its text and on the text a reader sees, and must
       exempt in both: hiding can then neither supply a note or quotation mark nor take one
       away, whichever way gone() errs. */
    const exempt = ({ri, node, k}) => {
      const f = box(node.parentElement);
      return [() => true, e => !gone(e, f)].every(keep => {
        const r = read(f, e => { while (e !== f && /^(inline|ruby)/.test(disp(e)) && !item(e)) e = e.parentElement; return e; },
          keep, true);
        const i = r.nodes.indexOf(node);
        if (i < 0) return false;
        const at = r.at[i] + k, from = r.bt.lastIndexOf(GAP, at) + 1, to = r.bt.indexOf(GAP, at);
        const line = r.bt.slice(from, to < 0 ? r.bt.length : to), p = at - from, before = line.slice(0, p);
        if (NOTE.test(before.replace(/“[^”]*”/g, "“”"))) return true;
        const re = new RegExp(WRE[ri].source, "iy");
        re.lastIndex = p;
        const m = re.exec(line);
        return !!m && before.split("“").length > before.split("”").length && line.includes("”", p + m[0].length);
      });
    };
    /* Two readings of a passage: all its text, which sees a collapsed <details> twin, and
       the text a reader sees, which drops anything hidden, so "Joint<span hidden>x</span>
       work" is still one phrase. Each is read twice: joined, so "Jo<b>int</b> work" is one
       phrase, and spaced where a reader sees a break, so "Current" and "Joint work" in two
       flex items do not read "CurrentJoint work", which no phrase bounded by \b matches
       (round 14). A phrase any reading finds is reported once, from the node it starts in. */
    const withdrawnIn = block => {
      const found = new Map(), all = () => true, seen = e => !gone(e, block);
      for (const r of [all, seen].flatMap(keep => [read(block, own, keep), read(block, own, keep, false, true)]))
        WRE.forEach((re, ri) => {
          for (const wm of r.bt.matchAll(re)) {
            let i = r.at.length - 1;
            while (i > 0 && r.at[i] > wm.index) i--;
            const node = r.nodes[i], k = wm.index - r.at[i];
            if (!node || k >= node.length) continue;
            if (!ids.has(node)) ids.set(node, ids.size);
            const key = `${ri}:${ids.get(node)}:${k}`;
            if (!found.has(key)) found.set(key, {ri, node, k, phrase: wm[0].replace(/\s+/g, " ").toLowerCase(),
              near: r.bt.slice(Math.max(0, wm.index - 30), wm.index + 40).replace(/\s+/g, " ").trim()});
          }
        });
      for (const h of found.values()) out.push([`${exempt(h) ? "exempt:" : ""}withdrawn:${h.phrase}`, h.near]);
    };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = w.nextNode())) {
      const el = t.parentElement;
      /* <noscript> content parses as RAW TEXT while scripting is on, so a walker sees
         its markup (class="..." and all) as prose. It is markup, and when scripting is
         off the browser parses it as markup. Skip it here; it is covered by whatever
         checks run against the no-script rendering. */
      if (!el || el.closest("script,style,noscript")) continue;
      const s = t.textContent;
      const ctx = s.replace(/\s+/g, " ").trim();
      if (!ctx) continue;
      /* VERBATIM SPANS ARE NOT PROSE. A reader is meant to COPY the contents of a
         <pre> or a .code: an endpoint, a field name, a JSON request body. The
         typographic rules below are about writing, and applying them here does not
         improve the page, it breaks the thing the page exists to hand over. JSON is
         the case that forced this: {"filters": ...} is only valid with straight
         double quotes, and a curly pair would ship a request body that cannot be
         pasted into anything. Scoped to elements whose whole purpose is verbatim
         content, so prose gains no exemption anywhere. Em-dashes and banned words
         are still checked, because neither is required by any syntax. */
      const verbatim = !!el.closest("pre,code,.code,.endpoint,.mono");
      /* a lone dash is the no-data placeholder, not prose */
      const bare = /^[—–-]$/.test(ctx);
      if (s.includes("—") && !bare) out.push(["em-dash", ctx.slice(0, 70)]);
      if (!verbatim && /(?<=\w)'(?=\w)|(?<=\s)'|'(?=\s)/.test(s))
        out.push(["straight-quote", ctx.slice(0, 70)]);
      if (!verbatim && /"/.test(s)) out.push(["straight-double", ctx.slice(0, 70)]);
      const m = s.match(BANNED);
      if (m) out.push([`banned:${m[1].toLowerCase()}`, ctx.slice(0, 70)]);
      /* Matched against the passage this node belongs to, so a phrase split by inline
         markup (<b>81%</b> led from here), a <br>, or wrapped source lines is still one
         phrase. A passage's text is only the text it owns: a nested block owns its own. */
      if (WRE.length) {
        const block = own(el);
        if (!done.has(block)) { done.add(block); withdrawnIn(block); }
      }
      /* NEGATIVES TAKE THE TRUE MINUS (U+2212), never the ASCII hyphen — the hyphen is
         a third the width of the digits beside it. Found 2026-08-31: four axis ticks
         and eleven table cells leaked JS's default stringification while every
         hand-written negative used the minus. Preceded by space/paren/start so ranges
         (2012-2023) and identifiers never match; verbatim spans exempt (a pasteable
         query needs ASCII). */
      if (!verbatim && /(^|[\s(])-\d/.test(s))
        out.push(["hyphen-negative", ctx.slice(0, 70)]);
      /* MULTIPLICATION IS ×, never the letter x: 1.2× not 1.2x. Same date, same class
         of drift — five pages used ×, one formatter wrote x. */
      if (!verbatim && /\d ?x(?=[\s.,)%])/.test(s))
        out.push(["x-for-times", ctx.slice(0, 70)]);
      /* collect text for the page-level first-reference check below; table cells are
         data, not prose, and the first-reference law is a prose law */
      if (!verbatim && !el.closest("table")) pageText.push(s);
    }
    /* FIRST REFERENCE (AP law, the machine-checkable slice). An all-caps token's first
       occurrence must sit in a sentence that glosses it: a parenthetical, or an
       expansion. Everything else about jargon needs a human reader; this bit does not.
       2026-09-01, after a cold reader met EDA, APEX and an unexpanded PIC with nothing. */
    const seen = new Set();
    const text = pageText.join(" ");
    for (const m of text.matchAll(/\b([A-Z][A-Z&\d]{1,5})\b/g)) {
      const t = m[1];
      if (seen.has(t)) continue;
      seen.add(t);
      if (assumed.includes(t) || debtPages.includes(t)) continue;
      if (/\d/.test(t)) continue;                       // FY2019, US000: codes, not acronyms
      if (/^[-–]\d/.test(text.slice(m.index + t.length, m.index + t.length + 3))) continue;  // PDM-5004, YYYY-01: an ID or format string, not an acronym
      if (/^[\u00AE\u2122]/.test(text.slice(m.index + t.length, m.index + t.length + 1))) continue;  // XR followed by the registered mark: a trademarked product name is its own gloss
      const after = text.slice(m.index + t.length, m.index + t.length + 2);
      const before = text.slice(Math.max(0, m.index - 1), m.index);
      if (/^-[A-Z]/.test(after) || /-$/.test(before)) continue;  // CLIENT-SIDE, NEO-SMART: a hyphenated all-caps compound is emphasis or a proper name, and its parts are not acronyms to expand
      if (new RegExp("\\b" + t.toLowerCase() + "\\b").test(text)) continue;  // CAPS-for-emphasis: the page itself uses the word in lowercase
      const sent = text.slice(Math.max(0, text.lastIndexOf(".", m.index) + 1),
                              text.indexOf(".", m.index) + 1 || text.length);
      const glossed = /\(/.test(sent) ||
        /short for|stands for|meaning the|that is,/.test(sent) ||
        new RegExp("(?:scale|code|file|series|level|survey|form|supplier|distributor|maker|contractor|firm|company),?\\s+" + t + "\\b").test(sent) ||
        new RegExp(t + "\\s+is\\s+the\\s+(?:federal\\s+|U\\.S\\.\\s+)?" + t[0] + "[a-z]+").test(sent) ||
        new RegExp("[A-Za-z][\\w'’-]*(?:\\s+[\\w'’&-]+){0,6}\\s*\\(" + t).test(text) ||  /* capital-led expansions count: "Archival FRED (ALFRED)" */
        /, (?:the|a|an) [a-z]/.test(sent.slice(sent.indexOf(t)));
      if (!glossed) out.push(["bare-first-reference:" + t, sent.replace(/\s+/g," ").trim().slice(0, 70)]);
    }
    return out;
  }, {withdrawn: WITHDRAWN.filter(w => w.pages.includes(n)).map(w => w.pattern),
      assumed: ACRO.assumed_known || [], debtPages: Object.entries(ACRO.debt || {}).filter(([,v]) => v.includes("*") || v.includes(n)).map(([k]) => k)});
  /* An exemption is a pass the gate chose not to count, so it is printed, not hidden. */
  for (const [kind, ctx] of all.filter(([k]) => k.startsWith("exempt:"))) exempt.push(`${n}: ${kind.slice(7)}: ${ctx}`);
  const hits = all.filter(([k]) => !k.startsWith("exempt:"));
  total += hits.length;
  if (hits.length) {
    bad++;
    console.log(`${n.padEnd(18)} FAIL  ${hits.length} violation(s)`);
    for (const [kind, ctx] of hits.slice(0, 6)) console.log(`    ${kind}: ${ctx}`);
    if (hits.length > 6) console.log(`    ...and ${hits.length - 6} more`);
  } else {
    console.log(`${n.padEnd(18)} PASS`);
  }
  await p.close();
}
await b.close();
if (exempt.length) {
  console.log(`\n${exempt.length} withdrawn phrasing(s) passed as a dated correction note or a quotation:`);
  for (const e of exempt) console.log(`    ${e}`);
}
console.log(bad ? `\n${total} style-law violation(s) on ${bad} page(s)`
                : `\nall ${list.length} pages clean: no em-dashes, no straight quotes, ` +
                  `no banned words, no withdrawn phrasings`);
process.exit(bad ? 1 : 0);
