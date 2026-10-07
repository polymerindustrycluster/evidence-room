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
import {launch} from "./_browser.mjs";
import {pageScripts, asText, HOLE} from "./_jsstrings.mjs";

import {readFileSync as rfs} from "fs";
let ACRO = {assumed_known: [], debt: {}};
try { ACRO = JSON.parse(rfs(new URL("../_data/acronyms.json", import.meta.url), "utf-8")); } catch {}

/* WITHDRAWN PHRASINGS. A correction retires a phrasing, and the phrasing comes back:
   collaboration's "joint work" survived four rounds of rewrites of the sentences around
   it, and a Read-next line added on the correction branch itself reintroduced it
   (2026-09-28). Only a grep outside the repo caught that. The list is read unguarded: a
   missing or malformed file must fail the gate, not empty the list and pass. It catches a
   phrasing coming back, not one hidden on purpose: CSS generated content, form control
   values, shadow DOM, zero-width characters and text painted invisible by colour or moved
   away by position are out of reach. Text under a transform, opacity, a filter, clipping,
   masking, an overflow that cuts it, containment or zoom is not emulated: an exemption that
   rests on it is refused (see DRAWN). Every exemption is printed. */
const WITHDRAWN = JSON.parse(rfs(new URL("../_data/withdrawn.json", import.meta.url), "utf-8")).withdrawn;
for (const w of WITHDRAWN) new RegExp(w.pattern.replaceAll(" ", "\\s+"), "gi");  /* the form the page compiles */

/* THE TWO FOOTPRINTS, READ FROM THE ONE DEFINITION. PIC-12 and NEO-14 share ten counties;
   each also has counties the other lacks. Six pages said NEO-14 "adds" its four and
   stopped, so a reader adding four to twelve got sixteen under a label that says fourteen
   (corrected 2026-10-04). A sentence that names every county one set has and the other
   lacks must, in that sentence or the next, also name every county the other has and it
   lacks. A mention inside a run of shared counties ("Ashtabula, Cuyahoga, ...") is a list
   of the twelve, not the relationship, and does not count. Read unguarded: a definition
   this cannot parse fails the gate rather than emptying the sets and passing. */
const FPPY = rfs(new URL("../_data/build/footprints.py", import.meta.url), "utf-8");
const fpSet = name => {
  const m = FPPY.match(new RegExp(`^${name} = \\{([\\s\\S]*?)\\}`, "m"));
  return new Set(m ? [...m[1].matchAll(/"\d{5}":\s*"([^"]+)"/g)].map(x => x[1]) : []);
};
const P12 = fpSet("PIC12"), N14 = fpSet("NEO14");
const FOOT = {adds: [...N14].filter(c => !P12.has(c)), drops: [...P12].filter(c => !N14.has(c)),
              shared: [...P12].filter(c => N14.has(c))};
if (P12.size !== 12 || N14.size !== 14 || !FOOT.adds.length || !FOOT.drops.length) {
  console.log(`footprints.py could not be read: PIC12 ${P12.size} counties, NEO14 ${N14.size}`);
  process.exit(1);
}

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

/* TEXT A SCRIPT WRITES ONLY AFTER A CLICK. The walk below reads each page in its default
   state, so a reading the seat selector writes on a tap never reached it: cost-scissors
   printed "the winning seat" there after its correction, and reinserting it passed
   (2026-09-30). Every string and template literal in every script the page loads is
   checked too (tools/_jsstrings.mjs), whether or not any state shows it: withdrawn
   phrasings with the same exemptions, and the typographic rules on literals that read as
   prose outside console and Error messages. What a script fills in at run time (each ${...}) is counted and printed as not
   inspected, and a script that cannot be read fails the page. The acronym rule is a
   first-occurrence rule over the page and is not applied to scripts. */
const MONTH = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
const NOTE = new RegExp(`\\bCorrect(?:ion|ed)\\b[\\s,·.:]*(?:\\d{1,2}\\s+${MONTH}|${MONTH}\\s+\\d{1,2}),?\\s+\\d{4}`);
let holes = 0, read = 0, devs = 0;
const scripted = (page, patterns) => {
  const out = [];
  let scripts;
  try { scripts = pageScripts(page); }
  catch (e) { return [["script-unreadable", e.message]]; }
  const WRE = patterns.map(src => new RegExp(src.replaceAll(" ", "\\s+"), "gi"));
  const seen = new Set();
  for (const {file, lits} of scripts) for (const lit of lits) {
    read++; holes += lit.holes;
    const at = `${file}:${lit.line}`;
    /* links a script writes, including ones only a click shows: a literal brace in the
       href is a template; a relative or file href to a .md file is raw repository source.
       A value filled in at run time (\u0000 here) is inspected only as rendered. */
    for (const m of lit.text.matchAll(/href\s*=\s*["']([^"']*)["']/g)) {
      const h = m[1];
      if (/[{}]/.test(h)) out.push(["href-template", `${at} (script): ${h.slice(0, 90)}`]);
      if (/\.md(?:[?#]|$)/i.test(h) && !/^[a-z]+:/i.test(h)) out.push(["href-raw-markdown", `${at} (script): ${h.slice(0, 90)}`]);
    }
    for (const t of [asText(lit.text, false), asText(lit.text, true)]) WRE.forEach(re => {
      for (const m of t.matchAll(re)) {
        const phrase = m[0].replace(/\s+/g, " ").toLowerCase(), key = `${at}:${phrase}:${m.index}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const before = t.slice(t.lastIndexOf(HOLE, m.index) + 1, m.index), rest = t.slice(m.index + m[0].length);
        const ok = NOTE.test(before.replace(/“[^”]*”/g, "“”"))
          || (before.split("“").length > before.split("”").length && rest.split(HOLE)[0].includes("”"));
        const near = t.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, " ").replaceAll(HOLE, "…").trim();
        out.push([`${ok ? "exempt:" : ""}withdrawn:${phrase}`, `${at} (script): ${near}`]);
      }
    });
    /* the typographic rules, on literals that read as prose: two words in a row and no
       code punctuation, so selectors, attribute values and format strings are not prose */
    const t = asText(lit.text, true), ctx = `${at} (script): ${t.replace(/\s+/g, " ").replaceAll(HOLE, "…").trim().slice(0, 70)}`;
    if (!/[A-Za-z]{2,}[ \u00a0\n]+[A-Za-z]{2,}/.test(t) || /[{};=<>]|=>/.test(t)) continue;
    /* a console or Error message is for the developer; withdrawn phrasings are still checked
       in it above, since funding-map prints a load error on the page */
    if (lit.dev) { devs++; continue; }
    if (t.includes("—")) out.push(["em-dash", ctx]);
    if (/(?<=\w)'(?=\w)|(?<=\s)'|'(?=\s)/.test(t)) out.push(["straight-quote", ctx]);
    if (/"/.test(t)) out.push(["straight-double", ctx]);
    const bw = t.match(/\b(crucial|delve|matters)\b/i);
    if (bw) out.push([`banned:${bw[1].toLowerCase()}`, ctx]);
    if (/(^|[\s(])-\d/.test(t)) out.push(["hyphen-negative", ctx]);
    if (/\d ?x(?=[\s.,)%])/.test(t)) out.push(["x-for-times", ctx]);
  }
  return out;
};

/* Deep-link states read as well as the default page (see the loop). One recipient on the
   standard evidence and the one whose execution is not verified. */
const STATES = {"funding-map": ["#recipient/bioverde", "#recipient/huntsman"]};

const b = await launch();
let bad = 0, total = 0, links = 0;
const exempt = [], debts = [], records = [];
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
  const READ = ({withdrawn, assumed, debtOwn, debtWild, foot}) => {
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
    let verbatimNodes = 0;
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
    /* Whether text is drawn in a way this gate would have to emulate to know what a reader
       sees: moved, turned or scaled (transform, rotate, scale, translate, perspective, 3D,
       motion path), composited (opacity, filter, backdrop-filter, blend, will-change),
       cut (clip, clip-path, masks, an overflow its content exceeds), contained or skipped
       (contain, content-visibility, whatever the display), or zoomed. Eighteen rounds of review found
       a new way each time an emulation of these missed what the browser draws, so they are
       not emulated: an exemption that depends on text under any of them is refused (see
       exempt), and the seen reading drops such text, which can only find more phrases. */
    const DRAWN = [["transform", "none"], ["rotate", "none"], ["scale", "none"], ["translate", "none"],
      ["perspective", "none"], ["transform-style", "flat"], ["offset-path", "none"], ["will-change", "auto"],
      ["filter", "none"], ["backdrop-filter", "none"], ["mix-blend-mode", "normal"], ["clip", "auto"],
      ["clip-path", "none"], ["mask-image", "none"], ["-webkit-mask-image", "none"], ["mask-border-source", "none"],
      ["-webkit-mask-box-image", "none"], ["contain", "none"], ["zoom", "1"], ["content-visibility", "visible"]];
    /* overflow hidden or clip cuts text only where the box's content overflows it, which
       layout reports (a scroll size past the client size); a box whose content fits cuts
       nothing, and the hero sections that carry two live notes are such boxes */
    const drawn = e => { const a = getComputedStyle(e);
      return parseFloat(a.opacity) < 1 || DRAWN.some(([k, v]) => { const x = a.getPropertyValue(k); return x !== "" && x !== v; })
        || (/hidden|clip/.test(a.overflowX + a.overflowY) && (e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight)); };
    const under = new Map();
    const emulated = e => {
      if (!e) return false;
      if (!under.has(e)) under.set(e, drawn(e) || emulated(e.parentElement));
      return under.get(e);
    };
    /* Text a reader may not see below the given ancestor: hidden, not displayed, under
       anything drawn (above, which takes content-visibility too), not visible, or set in a
       font size under a pixel. Visibility and font size are inherited and can be
       overridden, so they are read on the text's own element. What this misses keeps a
       phrase in the seen reading, where the all-text reading has it anyway; what it wrongly
       drops can only fail an exemption (see exempt). */
    const gone = (e, top) => {
      const c = getComputedStyle(e);
      if (c.visibility !== "visible" || parseFloat(c.fontSize) < 1) return true;
      for (; e && e !== top; e = e.parentElement) {
        if (e.hidden || getComputedStyle(e).display === "none" || drawn(e)) return true;
      }
      return false;
    };
    /* Whether a reader sees a break between two text nodes: one of them sits in a box that
       is not inline-level below the nearest element holding both, or that element lays its
       children out as flex, grid or box items, which a run of bare text joins as an
       anonymous item. An inline-level box ("Jo<span style=display:inline-block>int</span>")
       sits in its parent's line, and a display:contents element has no box. Whether that
       line wraps before or after the box depends on widths, so `loose` reads a break at its
       edges too: "Current<span style=display:inline-block;width:100%>Joint work</span>"
       sits on two lines (round 18). Whether a block inside an inline-level box sits in
       the line outside it depends on which of the box's lines that is, so `sticky` keeps
       the block's break where the default lets the box undo it: "Current<span
       style=display:inline-block><b style=display:block>Joint work</b><b
       style=display:block>rose.</b></span>" puts "Current" beside "rose." (2026-09-30). */
    const breaks = (a, b, mode) => {
      let l = a.parentElement;
      while (!l.contains(b)) l = l.parentElement;
      /* the box nearest l decides: whatever sits inside an inline-level box (inline-block,
         inline-flex, -webkit-inline-box ...) breaks only within it, since the box itself
         may sit in l's line */
      const boxed = n => { let br = false;
        for (let e = n.parentElement; e !== l; e = e.parentElement)
          if (/^(inline-|-webkit-inline)/.test(disp(e))) br = mode === "loose" || (mode === "sticky" && br);
          else if (!/^(inline|ruby|contents)/.test(disp(e)) || item(e)) br = true;
        return br; };
      return ITEMS.test(disp(l)) || boxed(a) || boxed(b);
    };
    /* the text `top` owns under `mine`, the text nodes `keep` admits, and where each
       starts; with `gap`, text `top` does not own leaves a GAP where it was; with `apart`,
       a space goes wherever a reader sees a break (see breaks, whose mode it is: "sticky"
       also where a block inside an inline-level box broke, "loose" also at the edges of any
       inline-level box) or where text `top` does not own was left out */
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
          if (apart) { if (cut || (last && breaks(last, u, apart))) r.bt += " "; last = u; }
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
       away, whichever way gone() errs. A line whose text, or any ancestor of it, is drawn
       in a way this gate does not emulate (see drawn) cannot show that its note or
       quotation is seen, so it exempts nothing and says why ("drawn"). */
    const exempt = ({ri, node, k}) => {
      const f = box(node.parentElement);
      let why = false;
      return [() => true, e => !gone(e, f)].every((keep, pass) => {
        const r = read(f, e => { while (e !== f && /^(inline|ruby)/.test(disp(e)) && !item(e)) e = e.parentElement; return e; },
          keep, true);
        const i = r.nodes.indexOf(node);
        if (i < 0) return false;
        const at = r.at[i] + k, from = r.bt.lastIndexOf(GAP, at) + 1, to = r.bt.indexOf(GAP, at);
        const line = r.bt.slice(from, to < 0 ? r.bt.length : to), p = at - from, before = line.slice(0, p);
        const re = new RegExp(WRE[ri].source, "iy");
        re.lastIndex = p;
        const m = re.exec(line);
        /* either way the phrase must match again within the line, so a phrase running on
           into the next flex item, grid item or table cell is not the note's to exempt */
        const ok = !!m && (NOTE.test(before.replace(/“[^”]*”/g, "“”"))
          || (before.split("“").length > before.split("”").length && line.includes("”", p + m[0].length)));
        if (ok && pass === 0 && r.nodes.some((u, j) => r.at[j] >= from && r.at[j] <= from + line.length && emulated(u.parentElement)))
          return (why = "drawn", false);
        return ok;
      }) || why;
    };
    /* Two readings of a passage: all its text, which sees a collapsed <details> twin, and
       the text a reader sees, which drops anything hidden, so "Joint<span hidden>x</span>
       work" is still one phrase. Each is read four times: joined, so "Jo<b>int</b> work" is
       one phrase, and spaced where a reader sees a break, in each of the three modes of
       breaks, so "Current" and "Joint work" in two flex items do not read
       "CurrentJoint work", which no phrase bounded by \b matches (round 14). A phrase any
       reading finds is reported once, from the node it starts in. */
    const withdrawnIn = block => {
      const found = new Map(), all = () => true, seen = e => !gone(e, block);
      for (const r of [all, seen].flatMap(keep => [read(block, own, keep),
        ...["tight", "sticky", "loose"].map(mode => read(block, own, keep, false, mode))]))
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
      for (const h of found.values()) {
        const x = exempt(h);
        out.push([`${x === true ? "exempt:" : ""}withdrawn:${h.phrase}`,
          x === "drawn" ? `cannot confirm the note is seen, drawn by styles the gate does not emulate: ${h.near}` : h.near]);
      }
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
      /* A QUOTED RECORD IS NOT PAGE PROSE. The corrections page reproduces CORRECTIONS.md as
         written (DECISIONS.md D3), and its older entries predate rules this gate holds, or
         quote the withdrawn phrasing they corrected. Changing a character would alter a record
         whose value is that it is never altered, so text under [data-verbatim] is counted and
         reported, never read as prose. Only derive_corrections.py output carries the
         attribute; verify_consistency.py holds that output to the file. */
      if (el.closest("[data-verbatim]")) { verbatimNodes++; continue; }
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
      /* A CASE CHANGE THAT BROKE A NAME. funding-map lowercased the first letter of a data
         string to fit it mid-sentence and printed "uSAspending" (PR #43 review,
         2026-10-04). One lowercase letter, then capitals, then lowercase again, is no
         English word or acronym; "mRNA" and "iPhone" do not match. */
      const cm = s.match(/\b[a-z][A-Z]{2,}[a-z]/);
      if (cm) out.push([`case-mangled:${cm[0]}`, ctx.slice(0, 70)]);
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
    /* DEBT IS PRINTED, AND IT EXPIRES. A debt entry exempted a first reference silently and
       outlived the bareness it excused: laborshed's byline printed "LEHD LODES" unexpanded
       under two debt entries, and the review that found it (F§15, 4 October 2026) had to
       read the page to learn the gate had looked away. So every first reference a debt entry
       lets through is now printed, and an entry this page no longer needs, because the
       first reference is glossed or not an acronym at all, fails as stale: the ratchet only
       turns if a paid debt comes off the list. An entry for an acronym the page does not
       print is reported, not failed, since script-rendered text can arrive late. */
    const seen = new Set();
    const text = pageText.join(" ");
    for (const m of text.matchAll(/\b([A-Z][A-Z&\d]{1,5})\b/g)) {
      const t = m[1];
      if (seen.has(t)) continue;
      seen.add(t);
      if (assumed.includes(t)) {
        if (debtOwn.includes(t)) out.push(["stale-debt:" + t, "listed as assumed knowledge too, so the debt excuses nothing"]);
        continue;
      }
      const sent = text.slice(Math.max(0, text.lastIndexOf(".", m.index) + 1),
                              text.indexOf(".", m.index) + 1 || text.length);
      const debt = debtOwn.includes(t) || debtWild.includes(t);
      const bare = (() => {
      if (/\d/.test(t)) return false;                       // FY2019, US000: codes, not acronyms
      if (/^[-–]\d/.test(text.slice(m.index + t.length, m.index + t.length + 3))) return false;  // PDM-5004, YYYY-01: an ID or format string, not an acronym
      if (/^[\u00AE\u2122]/.test(text.slice(m.index + t.length, m.index + t.length + 1))) return false;  // XR followed by the registered mark: a trademarked product name is its own gloss
      const after = text.slice(m.index + t.length, m.index + t.length + 2);
      const before = text.slice(Math.max(0, m.index - 1), m.index);
      if (/^-[A-Z]/.test(after) || /-$/.test(before)) return false;  // CLIENT-SIDE, NEO-SMART: a hyphenated all-caps compound is emphasis or a proper name, and its parts are not acronyms to expand
      if (new RegExp("\\b" + t.toLowerCase() + "\\b").test(text)) return false;  // CAPS-for-emphasis: the page itself uses the word in lowercase
      const glossed = /\(/.test(sent) ||
        /short for|stands for|meaning the|that is,/.test(sent) ||
        new RegExp("(?:scale|code|file|series|level|survey|form|supplier|distributor|maker|contractor|firm|company),?\\s+" + t + "\\b").test(sent) ||
        new RegExp(t + "\\s+is\\s+the\\s+(?:federal\\s+|U\\.S\\.\\s+)?" + t[0] + "[a-z]+").test(sent) ||
        new RegExp("[A-Za-z][\\w'’-]*(?:\\s+[\\w'’&-]+){0,6}\\s*\\(" + t).test(text) ||  /* capital-led expansions count: "Archival FRED (ALFRED)" */
        /, (?:the|a|an) [a-z]/.test(sent.slice(sent.indexOf(t)));
      return !glossed;
      })();
      const at = sent.replace(/\s+/g," ").trim().slice(0, 70);
      if (debt && bare) out.push(["debt:" + t, at]);
      else if (debtOwn.includes(t)) out.push(["stale-debt:" + t, `first reference no longer bare: ${at}`]);
      else if (bare) out.push(["bare-first-reference:" + t, at]);
    }
    for (const t of debtOwn) if (!seen.has(t)) out.push(["debt-unseen:" + t, "this page prints no such token"]);
    /* A WITHDRAWN CITATION IS AN ADDRESS, NOT TEXT. peers cited a 2024 anniversary blog post
       for Michelin's headquarters, replaced by the company's own page (U P1, 4 October 2026);
       the walk above reads text nodes and never an href, so a withdrawn pattern is also
       matched against every link's address. */
    for (const a of document.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      WRE.forEach(re => { re.lastIndex = 0;
        if (re.test(href)) out.push(["withdrawn-link:" + re.source, href.slice(0, 90)]); });
    }
    /* THE FOOTPRINT RELATIONSHIP (see FOOT above). The passage is the smallest element
       holding the whole list, widened to its nearest box that is not inline, read with
       textContent so a folded methodology is read too. */
    const has = (s, c) => new RegExp(`\\b${c}\\b`).test(s);
    const alone = (s, c) => [...s.matchAll(new RegExp(`\\b${c}\\b`, "g"))].some(m =>
      !foot.shared.some(x => has(s.slice(Math.max(0, m.index - 40), m.index + c.length + 40), x)));
    const passages = new Set();
    for (const set of [foot.adds, foot.drops]) {
      const holders = [...document.body.querySelectorAll("*")].filter(e =>
        !e.closest("script,style,noscript,[data-verbatim]") && !e.querySelector("[data-verbatim]") &&
        set.every(c => has(e.textContent, c)));
      for (const e of holders.filter(e => !holders.some(x => x !== e && e.contains(x)))) {
        let b = e;
        while (b !== document.body && /^inline/.test(getComputedStyle(b).display)) b = b.parentElement;
        passages.add(b);
      }
    }
    for (const b of passages) {
      const sents = b.textContent.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z“])/);
      sents.forEach((s, i) => {
        const win = s + " " + (sents[i + 1] || "");
        const named = set => set.every(c => alone(s, c));
        /* the four NEO-14 adds are never a list of the twelve; Ashtabula and Trumbull are
           read as the relationship only beside the other footprint's name */
        const trig = named(foot.adds) ? foot.drops
          : named(foot.drops) && /NEO-14|fourteen/i.test(s) ? foot.adds : null;
        if (trig && !trig.every(c => alone(win, c)))
          out.push(["footprint-relationship", `names one side of the PIC-12 / NEO-14 difference ` +
            `without ${trig.join(" and ")}: ${s.trim().slice(0, 90)}`]);
      });
    }
    /* LINKS A READER CANNOT FOLLOW. An href still carrying a template ("{year}") is an
       API pattern, not a page, and returns an error; an href to a Markdown file in this
       repository serves the raw source. Every link in the rendered page is read. */
    const hrefs = [...document.body.querySelectorAll("a[href], area[href]")];
    for (const a of hrefs) {
      const h = a.getAttribute("href");
      let u = null;
      try { u = new URL(h, location.href); } catch { out.push(["href-unparseable", h.slice(0, 90)]); continue; }
      if (/[{}]|%7B|%7D/i.test(h)) out.push(["href-template", h.slice(0, 90)]);
      if (/\.md$/i.test(u.pathname) && (u.protocol === "file:" || /github\.io$/.test(u.hostname)))
        out.push(["href-raw-markdown", h.slice(0, 90)]);
    }
    out.push(["count:hrefs", String(hrefs.length)]);
    /* THE SCOPE CHIP'S HOUSE FORM (W4, 7 October 2026): four parts, industry · place ·
       period · source, each non-empty, spaced middots, a year in it, and short enough to sit
       on one line of a figure card. "NAICS 326 · Ohio · 2024 annual avg · BLS QCEW". A chip
       whose claim lost its scope renders empty and fails here as well as in disclosure. */
    for (const e of document.querySelectorAll(".pv-scope")) {
      const t = e.textContent.replace(/\s+/g, " ").trim();
      if (!/^[^\u00b7\s][^\u00b7]*?( \u00b7 [^\u00b7\s][^\u00b7]*?){3}$/.test(t) || !/\b(19|20)\d\d\b/.test(t) || t.length > 60)
        out.push(["scope-chip-form", t.slice(0, 70) || "(an empty chip)"]);
    }
    if (verbatimNodes) out.push(["record:CORRECTIONS.md", `${verbatimNodes} text nodes quoted as written, not read as page prose`]);
    /* DATED NOTES SIT BELOW THE HEADLINE (DECISIONS.md, 2026-10-04, D3). Four pages opened on
       "Correction, <date>" paragraphs set between the byline and the headline figure, so a
       reader met the history of a finding before the finding. A dated note belongs beside
       what it corrects, and the page's first section heading is the line it may not cross.
       A note is a block whose text opens with the dated form NOTE matches. A page with no
       h2 has no line to check against, and fails rather than passing unread. */
    const firstH2 = [...document.querySelectorAll("h2")].find(h => !h.closest("[data-verbatim],header.mast,footer"));
    const OPENS = new RegExp(NOTE.source, "i");
    if (!firstH2) out.push(["correction-placement-uninspectable", "no h2, so no headline boundary for dated notes"]);
    else for (const el of document.body.querySelectorAll("p,li,dd,figcaption,blockquote,aside,div")) {
      if (el.closest("[data-verbatim],script,style,noscript")) continue;
      if (el.querySelector("p,li,dd,figcaption,blockquote,aside,div")) continue;
      const t = el.textContent.replace(/\s+/g, " ").trim(), m = t.match(OPENS);
      if (!m || m.index > 24) continue;
      if (el.compareDocumentPosition(firstH2) & Node.DOCUMENT_POSITION_FOLLOWING)
        out.push(["correction-above-headline", `before the first h2 ("${firstH2.textContent.trim().slice(0, 40)}"): ${t.slice(0, 70)}`]);
    }
    return out;
  };
  const ARGS = {withdrawn: WITHDRAWN.filter(w => w.pages.includes(n)).map(w => w.pattern), foot: FOOT,
      assumed: ACRO.assumed_known || [],
      debtOwn: Object.entries(ACRO.debt || {}).filter(([,v]) => v.includes(n)).map(([k]) => k),
      debtWild: Object.entries(ACRO.debt || {}).filter(([,v]) => v.includes("*")).map(([k]) => k)};
  const url = pathToFileURL(process.cwd() + "/dist/" + n + ".html").href;
  await p.goto(url);
  await p.waitForTimeout(1600)  /* 900 raced chain's 785 JS-rendered cards: the acronym inventory flapped between runs. 2026-09-01 */;
  const all = await p.evaluate(READ, ARGS);
  /* STATES THE DEFAULT READ NEVER SHOWS. A panel a deep link opens is prose a reader
     quotes, and its sentences are assembled from data at run time, so the script scan
     below sees only holes there. Each listed state is loaded and read like the page;
     a finding already made in the default state is not counted twice. */
  const seenKinds = new Set(all.map(([k, c]) => k + "\u0000" + c));
  for (const h of STATES[n] || []) {
    const q = await b.newPage({viewport: {width: 1440, height: 1000}});
    await q.goto(url + h);
    await q.waitForTimeout(1600);
    for (const [k, c] of await q.evaluate(READ, ARGS))
      if (!seenKinds.has(k + "\u0000" + c) && !/^(debt|debt-unseen|stale-debt|count):/.test(k)) {
        seenKinds.add(k + "\u0000" + c); all.push([k, `${h}: ${c}`]); }
    await q.close();
  }
  all.push(...scripted(n, WITHDRAWN.filter(w => w.pages.includes(n)).map(w => w.pattern)));
  /* An exemption is a pass the gate chose not to count, so it is printed, not hidden. */
  for (const [kind, ctx] of all.filter(([k]) => k.startsWith("exempt:"))) exempt.push(`${n}: ${kind.slice(7)}: ${ctx}`);
  for (const [kind, ctx] of all.filter(([k]) => /^debt(-unseen)?:/.test(k))) debts.push(`${n}: ${kind}: ${ctx}`);
  for (const [, c] of all.filter(([k]) => k === "count:hrefs")) links += +c;
  for (const [kind, ctx] of all.filter(([k]) => k.startsWith("record:"))) records.push(`${n}: ${kind.slice(7)}: ${ctx}`);
  const hits = all.filter(([k]) => !k.startsWith("exempt:") && !k.startsWith("count:") && !k.startsWith("record:") && !/^debt(-unseen)?:/.test(k));
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
if (records.length) {
  console.log(`\n${records.length} page(s) quote a record verbatim; its text is not read as page prose:`);
  for (const r of records) console.log(`    ${r}`);
}
if (exempt.length) {
  console.log(`\n${exempt.length} withdrawn phrasing(s) passed as a dated correction note or a quotation:`);
  for (const e of exempt) console.log(`    ${e}`);
}
if (debts.length) {
  console.log(`\n${debts.length} first reference(s) passed as acronym debt (_data/acronyms.json), not as glossed:`);
  for (const d of debts) console.log(`    ${d}`);
}
console.log(`\nscripts: ${read} string and template literals read from source; ${holes} value(s) ` +
            `a script fills in at run time (\${...}) were not inspected there, only as rendered; ` +
            `${devs} console or Error message(s) held to withdrawn phrasings only`);
console.log(`links: ${links} rendered href(s) read for templates and raw Markdown, plus every ` +
            `href written in a script literal; an href a script fills in at run time and shows ` +
            `only after a click is not inspected`);
console.log(bad ? `\n${total} style-law violation(s) on ${bad} page(s)`
                : `\nall ${list.length} pages clean: no em-dashes, no straight quotes, ` +
                  `no banned words, no withdrawn phrasings`);
process.exit(bad ? 1 : 0);
