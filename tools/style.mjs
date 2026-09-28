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
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

import {readFileSync as rfs} from "fs";
let ACRO = {assumed_known: [], debt: {}};
try { ACRO = JSON.parse(rfs(new URL("../_data/acronyms.json", import.meta.url), "utf-8")); } catch {}

/* WITHDRAWN PHRASINGS. A correction retires a phrasing, and the phrasing comes back:
   collaboration's "joint work" survived four rounds of rewrites of the sentences around
   it, and a Read-next line added on the correction branch itself reintroduced it
   (2026-09-28). Only a grep outside the repo caught that. The list is read unguarded: a
   missing or malformed file must fail the gate, not empty the list and pass. */
const WITHDRAWN = JSON.parse(rfs(new URL("../_data/withdrawn.json", import.meta.url), "utf-8")).withdrawn;
for (const w of WITHDRAWN) new RegExp(w.pattern, "i");

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

/* A full run must be able to inspect every page the list names; an entry for a renamed
   or missing page would otherwise pass forever. */
const unknown = names.length ? [] : [...new Set(WITHDRAWN.flatMap(w => w.pages))].filter(pg => !list.includes(pg));
if (unknown.length) {
  console.log(`withdrawn.json names page(s) with no bundle in dist/: ${unknown.join(", ")}`);
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
    const blockText = new Map();
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
      /* Matched against the nearest text block, not this node, so a phrase split by
         inline markup (<b>81%</b> led from here) or wrapped across source lines is
         still one phrase; each match is reported once, from the node it starts in. A
         dated correction note may quote what it corrects, and a phrase inside curly
         double quotes is a mention, not a use; both are exempt, and both read the same
         block, never a wrapper div, so a note cannot exempt the page. */
      if (withdrawn.length) {
        const block = el.closest("p,li,td,th,h1,h2,h3,h4,h5,h6,figcaption,caption,dd,dt,summary,blockquote") || el;
        if (!blockText.has(block)) {
          const offs = new Map(), bw = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
          let at = 0, u;
          while ((u = bw.nextNode())) { offs.set(u, at); at += u.textContent.length; }
          blockText.set(block, [block.textContent, offs]);
        }
        const [bt, offs] = blockText.get(block), at = offs.get(t);
        for (const src of withdrawn) {
          for (const wm of bt.matchAll(new RegExp(src.replaceAll(" ", "\\s+"), "gi"))) {
            if (wm.index < at || wm.index >= at + s.length) continue;
            const before = bt.slice(0, wm.index);
            const inNote = /\bCorrect(?:ion|ed)\b[\s,·.:]*(?:\d{1,2}\s+[A-Z][a-z]+|[A-Z][a-z]+\s+\d{1,2}),?\s+\d{4}/.test(before);
            const quoted = (before.split("“").length - before.split("”").length) > 0;
            const near = bt.slice(Math.max(0, wm.index - 30), wm.index + 40).replace(/\s+/g, " ").trim();
            out.push([`${inNote || quoted ? "exempt:" : ""}withdrawn:${wm[0].replace(/\s+/g, " ").toLowerCase()}`, near]);
          }
        }
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
