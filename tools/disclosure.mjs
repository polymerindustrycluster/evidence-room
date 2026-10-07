/* AI DISCLOSURE — asserted, because discipline did not hold it.
 *
 * A byline-tidying regex run earlier stripped "by Claude (Anthropic), directed and
 * reviewed by" as one unit and left "Analysis and graphics J. Swanson" behind, so
 * three pages credited a person for work Claude did. Two more were BUILT that way.
 * Eight of sixteen pages ended up with no AI disclosure in the line a reader actually
 * reads, on a site whose entire premise is showing what AI makes of public data.
 * Every other gate passed the whole time: none of them was looking.
 *
 *   node tools/disclosure.mjs [names...]
 *
 * Checks the RENDERED page, with scripting on, so a JS-emitted byline is covered too.
 * One wording, everywhere: the same fact must not appear in five phrasings.
 *
 * It also asserts the OTHER thing a reader is owed about authorship, added 2026-09-01:
 * what the site's own checks can and cannot establish. See the note above SCOPE below.
 */
import {readdirSync, readFileSync, existsSync} from "fs";
import {spawnSync} from "child_process";
import {pathToFileURL} from "url";
import {launch} from "./_browser.mjs";

const CANON = "Analysis and graphics by Claude (Anthropic)";
/* WHAT THE CHECKS ACTUALLY DO, asserted here for the reason the byline is.
 *
 * Until 2026-09-01 the methodology box promised that every numbered sentence carried "a
 * written condition that would prove it wrong". The conditions run against the SHIPPED
 * data: they establish that a sentence still matches its own file, and nothing about the
 * world. A cross-family review called presenting that suite as verification the largest
 * overclaim on the site, and the incident behind it is in CORRECTIONS.md — a transposed
 * classification code moved a series by half while its assertion kept passing, because the
 * assertion was true of the wrong number and of the right one.
 *
 * The sentence is prose authored ONCE in _shared/picviz.js and rendered into every page,
 * which is the surface no page-level author ever reviews: it regressed onto 23 pages at
 * once and can re-inflate the same way. Two assertions. A page that prints its check count
 * must also print what the check cannot do, and no page may carry the old promise. */
const SCOPE = "consistency check, not a check against the world";
const OVERCLAIM = /condition that would prove it wrong|test that can fail/i;
/* and the human who answers for it must be named in the same line */
const OWNER = "John Swanson";
/* Names that must never be the sole credit for analysis or graphics. */
const MISCREDIT = /\b(?:analysis and graphics|analysis)\b[^·.]{0,40}\b(?:J\.? ?Swanson|John Swanson|the Evidence Room)\b/i;

/* STATUS, ONE WORD IN FOUR PLACES (DECISIONS.md, 2026-10-04). Each page declares PUBLISHED,
 * PROTOTYPE or INTERNAL as meta.status in its own masthead data. Asserted here, rendered:
 * the page's banner state equals that declaration; a PROTOTYPE or INTERNAL page carries the
 * banner in its masthead AND in its footer, in these exact words; its masthead flag, if it
 * has one, is the same word; its hub card carries the same word (no label means
 * PUBLISHED), and a page with no card must be INTERNAL; and on the sources page every link
 * to an INTERNAL page carries the Internal tag. The declarations are read from the data
 * files masthead.py names, not from the rendered page, so a renderer that invents a status
 * cannot pass itself. A page whose declaration or card cannot be read FAILS as
 * uninspectable rather than passing quietly. */
const BANNER = {
  PROTOTYPE: "Prototype: a public draft. Figures may change; check with PIC before citing.",
  INTERNAL: "Internal working view: deliberately unlisted and not for citation.",
};
const DECLARED = (() => {
  const py = spawnSync("python3", ["-c", `
import json, os, sys
sys.path.insert(0, "_data/build")
import masthead
out = {"index": json.load(open("index/data/counts.json", encoding="utf-8")).get("status")}
for a in masthead.MASTHEAD_FILE:
    st = {json.load(open(f, encoding="utf-8"))["meta"].get("status") for f in masthead.masthead_files(a)}
    out[a] = st.pop() if len(st) == 1 else None
out["_uncarded"] = masthead.UNCARDED
print(json.dumps(out))`], {encoding: "utf8"});
  if (py.status !== 0) { console.log("cannot read declared statuses:\n" + py.stderr); return {}; }
  return JSON.parse(py.stdout);
})();
/* The hub's cards are static markup, so they are read from the shipped bundle as text. */
const CARDS = (() => {
  if (!existsSync("dist/index.html")) return null;
  const html = readFileSync("dist/index.html", "utf8"), out = {};
  for (const m of html.matchAll(/<a class="card"[^>]*data-slug="([^"]+)"[\s\S]*?<\/a>/g)) {
    const pill = m[0].match(/<span class="pill proto">([^<]*)<\/span>/);
    out[m[1]] = pill ? pill[1].trim().toUpperCase() : "PUBLISHED";
  }
  return out;
})();

/* HOW THIS WAS MADE AND CHECKED, AND CITE AS (DECISIONS.md, 5 October 2026). Every page
 * carries, under its byline, a toggle that opens a short box ending in a "Cite as" line,
 * and the byline says "Revised <D Mon YYYY>". Asserted rendered: the box exists beside the
 * byline; the byline date, the cite version and the cite year all equal the page's
 * revision date in _data/cite.json, which tools/bundle.mjs regenerated from git in this
 * same run (_data/build/stamp_cite.py), so nothing here depends on a contributor having
 * re-stamped by hand; the cite URL is the page's canonical URL, built here from
 * CITATION.cff rather than from the record the renderer read; and the box credits exactly
 * the models the byline credits. A page with no record FAILS as uninspectable. */
const CITE = (() => {
  try { return JSON.parse(readFileSync("_data/cite.json", "utf8")).pages; }
  catch (e) { console.log(`cannot read _data/cite.json: ${e.message}`); return {}; }
})();
/* A model credit is a capitalised name followed by its maker in parentheses, and its ROLE
 * is the words before it in the same byline clause (clauses are split on the middot), back
 * to the previous credit. Compared as role-and-model pairs, so a byline crediting Codex
 * only for "Federal context updated by" fails a box that credits Codex with the analysis. */
const MODEL = /\b[A-Z][A-Za-z]+ \((?:Anthropic|OpenAI|Google|xAI|MiniMax|Meta|Mistral)\)/g;
const models = t => (t || "").split(/[\u00b7;]/).flatMap(clause => {
  const out = []; let from = 0, prev = "";
  for (const m of clause.matchAll(MODEL)) {
    let role = clause.slice(from, m.index).replace(/^[\s,.]+|[\s,]+$/g, "").toLowerCase();
    if (role === "" || role === "and") role = prev;      // "by X and Y": Y shares X's role
    out.push(`${role} ${m[0]}`); from = m.index + m[0].length; prev = role;
  }
  return out;
}).sort().join(" | ");
const SITE = (readFileSync("CITATION.cff", "utf8").match(/^url:\s*"([^"]+)"/m) || [])[1];
const canonical = n => SITE && (SITE.replace(/\/$/, "") + "/" + (n === "index" ? "" : n + "/"));
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
                "September", "October", "November", "December"];
const longDate = iso => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

/* THE W4 READER FURNITURE (DECISIONS.md, 7 October 2026), asserted rendered. Each piece is
 * opt-in per page, declared in data; once declared, a missing or differing piece FAILS.
 *   scope chip   every claim carrying `scope` renders a chip inside a hero figure reading
 *                exactly "industry · place · period · source"; a chip naming a claim with
 *                no scope fails.
 *   quote this   claims.json `quote` renders, word for word, in the how-we-checked box
 *                directly above the cite line; a rendered quote nobody declared fails.
 *   words block  claims.json `glossary` renders one closed "Words on this page" block whose
 *                items are exactly the declared terms, in order, each reading the shared
 *                definition plus the page's note (_data/glossary.json); a declared term the
 *                page never prints outside the block fails as a word not on this page.
 *   differs link a story whose _data/jobcounts.json row is marked linked carries one link
 *                to ../index/#<anchor>, inside the figure that prints its total or directly
 *                after the passage that prints it; a link on a page with no linked row
 *                fails. The hub's table must equal the file.
 *   plant box    claims.json `plant` renders one "If you run a plant here" box directly
 *                after the closer, its items word for word and naming the same claims; a
 *                box nobody declared fails.
 * Whether the data agree with each other (a quote's numbers, a kicker's words, a row's
 * claim) is verify_consistency.py's [scope]/[quote]/[kicker]/[glossary]/[jobcounts]. */
const GLOSS = JSON.parse(readFileSync("_data/glossary.json", "utf8"));
const JOBS = JSON.parse(readFileSync("_data/jobcounts.json", "utf8"));
const specOf = n => { try { return JSON.parse(readFileSync(`${n}/claims.json`, "utf8")); } catch { return null; } };
const scopeLine = sc => [sc.industry, sc.place, sc.period, sc.source].join(" \u00b7 ");
const wordsItem = (g, term) => { const t = GLOSS.terms.find(x => x.term === term);
  return t ? [t.short, t.long, (g.notes || {})[term]].filter(Boolean).join(" ") : null; };

const REG = JSON.parse(readFileSync("_data/SOURCES.json", "utf8"));
const CORR = JSON.parse(readFileSync("_data/corrections_by_page.json", "utf8"));

const b = await launch();
let bad = 0;
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const el = document.querySelector(".byline");
    const norm = s => s.replace(/\s+/g, " ").trim();
    return {byline: el ? norm(el.textContent) : null,
            text: norm(document.body.innerText),
            links: [...document.querySelectorAll("a")].map(a => a.href),
            method: norm(document.querySelector(".pv-method")?.textContent || ""),
            status: document.body.dataset.status || null,
            head: [...document.querySelectorAll("header.mast .pv-status")]
              .map(e => [e.dataset.status, norm(e.textContent)]),
            foot: [...document.querySelectorAll("footer .pv-status")]
              .map(e => [e.dataset.status, norm(e.textContent)]),
            flag: document.querySelector(".mast .proto")?.textContent.trim() || null,
            made: (() => {
              const by = document.querySelector(".byline"), box = document.querySelector(".pv-made");
              if (!box) return null;
              const t = by?.querySelector(".pv-made-toggle"), rev = by?.querySelector(".pv-revised time");
              const cite = box.querySelector(".pv-cite"), u = cite?.querySelector("a.pv-cite-url");
              const rest = by ? [...by.childNodes].filter(c => !(c.classList &&
                (c.classList.contains("pv-revised") || c.classList.contains("pv-made-toggle")))) : [];
              return {beside: by?.nextElementSibling === box,
                      byLine: norm(rest.map(c => c.textContent).join("")),
                      boxCredit: norm(box.querySelector(".pv-made-credit")?.textContent || ""),
                      toggle: !!t && t.getAttribute("aria-controls") === box.id,
                      revised: rev ? [rev.getAttribute("datetime"), norm(rev.textContent)] : null,
                      checks: !!box.querySelector("a[href$='#sec-checks']"),
                      cite: cite ? norm(cite.textContent) : null,
                      version: (() => { const v = cite?.querySelector("time");
                        return v ? [v.getAttribute("datetime"), norm(v.textContent)] : null; })(),
                      title: norm(cite?.querySelector("cite")?.textContent || ""),
                      url: u ? [u.getAttribute("href"), norm(u.textContent)] : null,
                      doc: document.title,
                      corr: (() => { const c = box.querySelector(".pv-corr-sum");
                        return c ? [norm(c.textContent), c.querySelector("a")?.getAttribute("href") || null] : null; })(),
                      corrInByline: !!by?.querySelector(".pv-corr-sum")};
            })(),
            w4: (() => {
              const t = e => norm(e?.textContent || "");
              const q = document.querySelector(".pv-quote");
              const words = [...document.querySelectorAll(".pv-words")];
              const rest = document.body.cloneNode(true);
              rest.querySelectorAll("script,style,.pv-words").forEach(e => e.remove());
              return {
                scopes: [...document.querySelectorAll(".pv-scope")].map(e =>
                  [e.dataset.claim || null, t(e), !!e.closest(".figv,[data-hero-figure]")]),
                plant: [...document.querySelectorAll(".pv-plant")].map(b => ({
                  head: t(b.querySelector("h2")),
                  afterCloser: (() => { const band = b.closest(".pv-plant-band");
                    const prev = band?.previousElementSibling;
                    return !document.querySelector(".closer") || !!prev?.classList.contains("closer"); })(),
                  items: [...b.querySelectorAll("li")].map(li => [li.dataset.claims || "", t(li)])})),
                quote: q ? {text: t(q.querySelector(".pv-quote-text")),
                            inBox: !!q.closest(".pv-made"),
                            aboveCite: !!q.nextElementSibling?.classList.contains("pv-cite")} : null,
                words: words.map(d => ({open: d.open, summary: t(d.querySelector("summary")),
                  items: [...d.querySelectorAll("li")].map(li => [li.dataset.term, t(li)])})),
                rest: norm(rest.textContent).toLowerCase(),
                differs: [...document.querySelectorAll(".pv-differs a")].map(a => [a.getAttribute("href"),
                  t(a), a.closest(".figv") ? t(a.closest(".figv").querySelector(".n"))
                    : t(a.closest(".pv-differs").previousElementSibling)]),
                jobs: (() => { const m = document.querySelector("table.pv-jobcounts")?.parentElement;
                  return m ? {id: m.id, rows: [...m.querySelectorAll("tbody tr")].map(tr =>
                    [...tr.cells].map(c => t(c)).concat(tr.querySelector("a")?.getAttribute("href") || ""))} : null; })(),
              };
            })(),
            pageLinks: [...document.querySelectorAll("a[href^='../']")].map(a => [
              (a.getAttribute("href").match(/^\.\.\/([a-z-]+)\/?$/) || [])[1] || null,
              a.nextElementSibling?.classList.contains("status-tag")
                ? a.nextElementSibling.textContent.trim() : null])};
  });
  const probs = [];
  /* THE CORRECTIONS LINE (DECISIONS.md D3; John, 2026-10-06): in the how-we-checked box,
     never in the byline row, counting the page's corrections since publication from
     _data/corrections_by_page.json and linking to its view of the log. A page with none
     prints none. */
  if (r.made) {
    const want = (CORR.pages?.[n] || []).filter(e => !e.before_publication).length;
    if (r.made.corrInByline) probs.push("the corrections count sits in the byline row, not the how-we-checked box");
    if (want && !r.made.corr) probs.push(`no corrections line in the how-we-checked box; the log has ${want}`);
    else if (want) {
      if (!r.made.corr[0].startsWith(`${want} correction${want === 1 ? "" : "s"} since publication. Headline `))
        probs.push(`corrections line reads "${r.made.corr[0].slice(0, 60)}", the log has ${want}`);
      if (r.made.corr[1] !== `../corrections/?page=${n}`)
        probs.push(`corrections line links ${r.made.corr[1]}, not ../corrections/?page=${n}`);
    } else if (r.made.corr) probs.push("a corrections line on a page the log names in no entry");
  }
  if (r.byline === null) probs.push("no .byline element");
  else {
    if (!r.byline.includes(CANON)) probs.push("byline lacks the AI credit");
    if (!r.byline.includes(OWNER)) probs.push("byline names no responsible person");
    /* John is the byline and answers for the page; what he must never be credited with
       is producing the analysis and graphics, which is the regression this catches. */
    const m = r.byline.match(MISCREDIT);
    if (m) probs.push(`credits a person for the analysis: "${m[0]}"`);
  }
  if (r.method && !r.method.includes("Claude (Anthropic)"))
    probs.push("methodology box drops the disclosure");
  if (/carry a written condition/.test(r.method) && !r.method.includes(SCOPE))
    probs.push("methodology box prints its check count without saying what the checks cannot do");
  const over = r.text.match(OVERCLAIM);
  if (over) probs.push(`claims a check would prove a sentence wrong: "${over[0]}"`);

  /* LICENCE ATTRIBUTION, WHICH IS AN OBLIGATION RATHER THAN A COURTESY. A hostile review
     on 2026-08-29 found IPEDS arriving through the Urban Institute's portal under ODC-By
     1.0, which requires attribution, with none printed on any page that used it; and the
     O*NET credit rendered without the registered-trademark symbol and with no link to
     CC BY 4.0, both of which that licence explicitly requires. The compliant strings were
     already in the registry and nothing rendered them, which is how an obligation becomes
     an omission.

     OBLIGATION FOLLOWS USE, NOT MENTION. Keyed on the registry's by_artifact list rather
     than on the dataset's name appearing in the text: the hub glosses what IPEDS is
     without printing a figure derived from it, and owes nothing for that. */
  for (const [key, src] of Object.entries(REG.sources || {})) {
    if (!src.attribution) continue;
    if (!(REG.by_artifact?.[n] || []).includes(key)) continue;
    const mark = src.attribution.match(/[A-Z][A-Za-z*®]+® is a trademark/);
    if (mark && !r.text.includes(mark[0]))
      probs.push(`${key}: licence requires the trademark symbol, and it is not rendered`);
    if (src.licence_url && !r.links.some(h => h.startsWith(src.licence_url.slice(0, 40))))
      probs.push(`${key}: uses ${src.licence} data with no link to the licence`);
  }
  /* made-and-checked box and cite line: see the note above CITE */
  {
    const rec = CITE[n], mk = r.made, want = canonical(n);
    if (mk) { mk.byModels = models(mk.byLine); mk.boxModels = models(mk.boxCredit); }
    if (!rec) probs.push("cannot inspect the cite line: no record in _data/cite.json (run node tools/bundle.mjs)");
    if (!mk) probs.push("no How this was made and checked box");
    else if (rec) {
      if (!mk.beside || !mk.toggle) probs.push("the made-and-checked box is not the byline's own toggle and panel");
      if (!mk.checks) probs.push("the made-and-checked box does not link to what the checks catch and miss");
      const short = longDate(rec.revised).replace(/ ([A-Z][a-z]{2})[a-z]* /, " $1 ");
      for (const [what, got, date] of [["byline Revised", mk.revised, [rec.revised, short]],
                                       ["cite version", mk.version, [rec.revised, longDate(rec.revised)]]])
        if (!got || got[0] !== date[0] || got[1] !== date[1])
          probs.push(`${what} reads ${got ? got.join(" / ") : "nothing"}, the recorded revision date is ${date.join(" / ")}`);
      const head = `Swanson, J., Polymer Industry Cluster (${rec.revised.slice(0, 4)}). ${rec.title}.`;
      if (!mk.cite || !mk.cite.startsWith(`Cite as: ${head}`)) probs.push(`cite line does not open "${head}"`);
      if (!mk.boxModels) probs.push("the made-and-checked box credits no model");
      else if (mk.boxModels !== mk.byModels)
        probs.push(`the box credits ${mk.boxModels}; the byline credits ${mk.byModels || "none"}`);
      if (!mk.doc.startsWith(rec.title)) probs.push(`cite title "${rec.title}" is not the page's own title "${mk.doc}"`);
      if (!want) probs.push("cannot inspect the cite URL: CITATION.cff carries no url");
      else if (!mk.url || mk.url[0] !== want || mk.url[1] !== want)
        probs.push(`cite URL is ${mk.url ? mk.url[0] : "missing"}, the canonical URL is ${want}`);
    }
  }
  /* W4 reader furniture: see the note above GLOSS */
  {
    const spec = specOf(n), w = r.w4, claims = (spec && spec.claims) || [];
    const scoped = Object.fromEntries(claims.filter(c => c.scope).map(c => [c.id, c.scope]));
    for (const [id, sc] of Object.entries(scoped)) {
      const got = w.scopes.filter(x => x[0] === id);
      if (!got.length) probs.push(`claim ${id} carries a scope and no scope chip renders it`);
      for (const [, text, inFig] of got) {
        if (text !== scopeLine(sc)) probs.push(`scope chip reads "${text}", claim ${id} says "${scopeLine(sc)}"`);
        if (!inFig) probs.push(`scope chip for ${id} sits outside a headline figure`);
      }
    }
    for (const [id] of w.scopes) if (!scoped[id]) probs.push(`a scope chip names ${id}, which carries no scope`);
    const q = spec && spec.quote;
    if (q && !w.quote) probs.push("claims.json declares a quote and the how-we-checked box shows none");
    else if (q) {
      if (w.quote.text !== q.text.replace(/\s+/g, " ").trim()) probs.push(`quote reads "${w.quote.text.slice(0, 60)}", claims.json says "${q.text.slice(0, 60)}"`);
      if (!w.quote.inBox || !w.quote.aboveCite) probs.push("the quote is not in the how-we-checked box directly above the cite line");
    } else if (w.quote) probs.push("a quote renders that claims.json does not declare");
    const g = spec && spec.glossary;
    if (g && w.words.length !== 1) probs.push(`claims.json declares a glossary and ${w.words.length} Words on this page blocks render`);
    else if (g) {
      const box = w.words[0];
      if (box.open) probs.push("the Words on this page block opens expanded; it is closed by default");
      if (box.summary !== "Words on this page") probs.push(`the words block is headed "${box.summary}"`);
      const terms = g.terms || [];
      if (box.items.map(i => i[0]).join("|") !== terms.join("|"))
        probs.push(`the words block lists ${box.items.map(i => i[0]).join(", ")}; the page declares ${terms.join(", ")}`);
      for (const [term, text] of box.items) {
        const want = wordsItem(g, term);
        if (want === null) probs.push(`the words block shows "${term}", which _data/glossary.json does not define`);
        else if (text !== want.replace(/\s+/g, " ").trim()) probs.push(`"${term}" reads "${text.slice(0, 50)}", not its definition`);
      }
      for (const term of terms)
        if (!new RegExp(`\\b${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(w.rest))
          probs.push(`the words block defines "${term}", a word not on this page outside the block`);
    } else if (w.words.length) probs.push("a Words on this page block renders that claims.json does not declare");
    const rows = JOBS.rows.filter(x => x.story === n && x.linked);
    const href = `../index/#${JOBS.anchor}`;
    if (rows.length && !w.differs.length) probs.push(`its total ${rows[0].total} is in the job-count table and the page has no link to it`);
    for (const [h, text, fig] of w.differs) {
      if (!rows.length) probs.push("a job-count link on a page with no linked row in _data/jobcounts.json");
      else {
        if (h !== href || text !== "Why this total differs from others on the site")
          probs.push(`job-count link reads "${text}" to ${h}, not the shared link to ${href}`);
        if (!rows.some(x => fig.includes(x.total))) probs.push(`job-count link sits under "${(fig || "no figure").slice(0, 60)}", not the total ${rows.map(x => x.total).join(", ")}`);
      }
    }
    const pl = spec && spec.plant;
    if (pl && w.plant.length !== 1) probs.push(`claims.json declares If you run a plant here and ${w.plant.length} such boxes render`);
    else if (pl) {
      const box = w.plant[0];
      if (box.head !== "If you run a plant here") probs.push(`the plant box is headed "${box.head}"`);
      if (!box.afterCloser) probs.push("the If you run a plant here box does not sit directly after the closer");
      const want = pl.map(i => [(i.claims || []).join(" "), i.text.replace(/\s+/g, " ").trim()]);
      if (JSON.stringify(box.items) !== JSON.stringify(want))
        probs.push(`the plant box reads "${(box.items.map(i => i[1]).join(" | ")).slice(0, 80)}", not claims.json plant`);
    } else if (w.plant.length) probs.push("an If you run a plant here box renders that claims.json does not declare");
    if (n === "index") {
      if (!w.jobs || w.jobs.id !== JOBS.anchor) probs.push(`no job-count table at #${JOBS.anchor}`);
      else {
        const want = JOBS.rows.map(x => [x.total, x.industry, x.year, x.source, x.label, `../${x.story}/`].join(" | "));
        const got = w.jobs.rows.map(c => c.join(" | "));
        if (got.join("\n") !== want.join("\n"))
          probs.push(`job-count table differs from _data/jobcounts.json: ${got.find((g, i) => g !== want[i]) || "row count " + got.length}`);
      }
    }
  }
  /* status: see the note above BANNER */
  const want = DECLARED[n];
  if (!want) probs.push("cannot inspect status: no single meta.status declared in its masthead data");
  else {
    if (r.status !== want) probs.push(`page renders status ${r.status}, its data declares ${want}`);
    if (want === "PUBLISHED") {
      if (r.head.length || r.foot.length) probs.push("a PUBLISHED page carries a status banner");
      if (r.flag) probs.push(`a PUBLISHED page carries the masthead flag "${r.flag}"`);
    } else {
      for (const [where, got] of [["masthead", r.head], ["footer", r.foot]]) {
        if (got.length !== 1) probs.push(`${want} page has ${got.length} ${where} status banners, not one`);
        else if (got[0][0] !== want || got[0][1] !== BANNER[want])
          probs.push(`${where} banner reads "${got[0][1]}" (${got[0][0]}), not the ${want} wording`);
      }
      if (r.flag && r.flag.toUpperCase() !== want) probs.push(`masthead flag "${r.flag}" is not ${want}`);
    }
    if (n !== "index") {
      if (!CARDS) probs.push("cannot inspect the hub card: dist/index.html missing");
      else if (CARDS[n] === undefined) {
        /* masthead.UNCARDED: published apparatus (the corrections log) that the hub links
           in prose and does not card. Named there with its reason, so it is not silent. */
        if (DECLARED._uncarded?.[n]) {
          if (want !== "PUBLISHED") probs.push(`uncarded apparatus must be PUBLISHED; it declares ${want}`);
        } else if (want !== "INTERNAL") probs.push(`no hub card, so the page must be INTERNAL; it declares ${want}`);
      } else if (CARDS[n] !== want) probs.push(`hub card says ${CARDS[n]}, the page declares ${want}`);
    }
    if (n === "sources") for (const [slug, tag] of r.pageLinks) {
      if (slug && DECLARED[slug] === "INTERNAL" && tag !== "Internal")
        probs.push(`link to INTERNAL page ${slug} carries no Internal tag`);
    }
  }

  if (probs.length) bad++;
  console.log(`${n.padEnd(18)} ${probs.length ? "FAIL  " + probs.join("; ")
                                              : "PASS  disclosure present"}`);
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} page(s) do not disclose who wrote them, or overstate their own checks`
                : `\nall ${list.length} pages carry the same disclosure and the same scope on their checks`);
process.exit(bad ? 1 : 0);
