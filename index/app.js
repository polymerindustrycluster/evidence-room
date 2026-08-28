/* The hub's script DECORATES the page; it does not build it.

   Until 2026-08-28 this file created every card. #lead, #all, #figs, #verdict and
   #footnote were empty in index.html and everything was innerHTML inside one uncaught
   async IIFE that opened on `await PV.data("counts.json")`. With scripting off, or with
   one failed fetch, the front door to thirteen pages contained no link to any of them: a
   masthead, a headline and five empty divs. The links are markup now. What is left here
   is decoration a static file cannot carry — the per-page claim counts, the county
   picker, and the one derived inventory the page states about itself — and every piece of
   it is wrapped so a failure leaves the static page standing instead of blanking it. */
(async () => {
"use strict";

/* Counts come from _data/build/derive_index.py, which reads every claims.json. They were
   hand-typed once and immediately drifted, so nothing here is typed. */

/* ------------------------------------------------------------------ one inventory

   THE PAGE PUBLISHED FOUR COUNTS OF ITSELF: a hero reading "309 checked claims across 14
   pages", a grid of thirteen cards, a picker verdict hard-coded to "the twelve", and a
   closer saying "two of the twelve". Every statement of this page's own inventory now
   comes from ONE value computed here, and the literals sitting in index.html for readers
   without scripting are the current value of that computation, pinned by the
   index-inventory claim so a drift fails the gate rather than shipping.

   WHAT IT COUNTS: the pages this hub links, which is the cards in index.html. WHAT IT
   EXCLUDES: artifacts that exist in the tree and are deliberately unlisted. Two ship a
   `.unlisted` file at their directory root saying why — scorecard/ is an internal board
   view of PIC's own performance, accountability/ is an unreviewed draft. That file is the
   convention, but a bundled page makes no external requests and so cannot read it at
   render time; the enforcement is index-inventory in claims.json, which asserts that every
   page in counts.json is either carded here or one of the two unlisted artifacts. A new
   artifact therefore cannot appear in the tree without either getting a card or being
   declared unlisted: the gate fails until someone decides which. */
const CARDS = [...document.querySelectorAll(".card[data-slug]")];
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen"];
const word = n => WORDS[n] || String(n);
/* Sentence-start form. `word()` alone rendered "…says nothing about Cuyahoga. eight of
   the twelve…" in the picker verdict — a lowercase word opening a sentence. */
const Word = n => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };

const put = (k, v) => document.querySelectorAll(`[data-inv="${k}"]`)
  .forEach(e => { e.textContent = v; });

/* Cards live in this DOM until proven live in the tree. counts.json is generated from the
   artifact folders actually present where derive_index.py ran, so in the public tree —
   where only the pages marked `publish` in _data/ARTIFACT-REVIEW.md were ever copied — a
   card for a withheld page removes itself rather than shipping a dead link. */
async function decorate() {
  const C = await PV.data("counts.json");
  for (const el of CARDS) if (!C.pages[el.dataset.slug]) el.remove();
  const live = CARDS.filter(el => el.isConnected);

  for (const el of live) {
    const p = C.pages[el.dataset.slug];
    const flag = el.querySelector(".hit-flag");
    const add = (cls, text) => {
      const s = document.createElement("span");
      s.className = "pill " + cls;
      s.textContent = text;
      flag.before(s);
    };
    if (p.claims) add("apx", `${p.claims} claims`);
    if (p.manual) add("apx man", `${p.manual} manual`);
  }

  const claims = live.reduce((n, el) => n + C.pages[el.dataset.slug].claims, 0);
  const manual = live.reduce((n, el) => n + C.pages[el.dataset.slug].manual, 0);
  put("pagesword", word(live.length));
  put("claims", claims);
  put("manual", manual);
  return live.length;
}

/* ------------------------------------------------------------------ county picker

   The one interaction on this page, and it does the lookup job the site's own footprint
   law implies: a member in a named county wants to know which of these pages is built on
   a geography that contains theirs. The DEFAULT state is the whole gallery with nothing
   marked and nothing hidden, so the page still reads as a printed list; the claims file
   guards the default sentence and each ingredient, not the thirteen variants.

   The control is hidden until the `js` class is set, because a select that changes nothing
   is worse than no select. The gallery it filters is complete either way.

   The county list below is checked, not trusted: claims.json asserts it is exactly the
   footprint federal-money's shipped data was built from, so a change to PIC-12 fails this
   page's gate rather than leaving a stale dropdown behind. */
const COUNTIES = ["Ashtabula", "Cuyahoga", "Geauga", "Lake", "Lorain", "Mahoning",
  "Medina", "Portage", "Stark", "Summit", "Trumbull", "Wayne"];
/* Which of the four metropolitan areas in the occupations wage file contains each county.
   OMB delineations, the same ones BLS uses for the metro wage files; carried as a manual
   claim because no shipped dataset states the county-to-metro mapping. Ashtabula and
   Wayne are in none of the four, which is the finding the picker exists to surface. */
const METRO = {Summit: "Akron", Portage: "Akron", Cuyahoga: "Cleveland", Geauga: "Cleveland",
  Lake: "Cleveland", Lorain: "Cleveland", Medina: "Cleveland", Stark: "Canton-Massillon",
  Mahoning: "Youngstown-Warren", Trumbull: "Youngstown-Warren"};

const covers = (geo, county) => geo === "pic12" ||
  (geo === "metros4" && METRO[county] !== undefined) ||
  (geo === "akron" && METRO[county] === "Akron");

function picker(total) {
  const sel = document.getElementById("county");
  const verdict = document.getElementById("verdict");
  if (!sel || !verdict) return;
  const live = CARDS.filter(el => el.isConnected);
  const nPic12 = live.filter(el => el.dataset.geo === "pic12").length;
  sel.insertAdjacentHTML("beforeend",
    COUNTIES.map(c => `<option value="${c}">${c} County</option>`).join(""));

  const paint = () => {
    const c = sel.value;
    live.forEach(el => {
      el.classList.toggle("hit", Boolean(c) && covers(el.dataset.geo, c));
    });
    document.body.classList.toggle("picked", Boolean(c));
    if (!c) {
      verdict.textContent = `All twelve counties in view. Pick one to see which of these
        pages is built on a geography that contains it.`;
      return;
    }
    const n = live.filter(el => covers(el.dataset.geo, c)).length;
    const m = METRO[c];
    const metroLine = !m
      ? `It is outside all four metro areas in the occupations file and outside the Akron
         metro the cost-of-living page prices, so neither of those says anything about it.`
      : m === "Akron"
        ? `It is in metro Akron, which the occupations page prices, and Akron is the one
           regional metro the cost-of-living page prices.`
        : `It is in metro ${m}, which the occupations page prices. The cost-of-living page
           prices Akron only, so it says nothing about ${c}.`;
    verdict.innerHTML = `<b>${c} County</b> is inside the twelve-county footprint that
      ${word(nPic12)} of these pages are built on. ${metroLine}
      <b>${Word(n)} of the ${word(total)}</b> are built on a geography that contains it.`;
  };
  sel.addEventListener("change", paint);
  paint();
}

/* ------------------------------------------------------------------ run

   Three independent steps, each contained. A failure in one of them used to take the whole
   page with it: the counts fetch opened the module, so a 404 there left every slot empty
   and the hub linked nothing. Now the worst case is a page that renders every link, every
   question and every finding, and misses a pill. */
let total = CARDS.length;
try {
  total = await decorate();
} catch (e) {
  console.error("hub: claim counts unavailable, static page stands —", e.message);
}
try {
  PV.padGrid(".cards", "card");
  picker(total);
} catch (e) {
  console.error("hub: county picker unavailable —", e.message);
}

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
try {
  await PV.methodology({
    /* Points at _data/SOURCES.json, not at _data/PIPELINES.md. PIPELINES.md is an internal
       working document and is not published, so naming it here sent every public reader to
       a path that does not exist — on the one page that exists to tell them where to look. */
    meta: {source: "Every dataset behind these pages is registered in _data/SOURCES.json " +
                   "with its endpoint, its exact filter values, and the script that fetched " +
                   "it. The methods and the known limits are in _data/METHODS-SOP.md.",
           scope: "The hero figures and the finding on every card restate a number the " +
                  "linked page publishes; each restatement is re-run here against that " +
                  "page’s own data file, so a correction there fails this page’s gate. " +
                  "Nothing on this page is computed independently of the pages it links to."},
    sourcesNote: "Named on each page this one links to; the register is _data/SOURCES.json.",
    definitions: `<b>PIC-12</b> is the federal-data footprint and matches the cluster-health
      dashboard. <b>NEO-14</b> is how company records are tagged in the vault. They share ten
      counties, they never reconcile, and no figure from one belongs in a sentence with a
      figure from the other. PIC’s measurement register is NAICS 3252, 3255 and 326; NAICS
      325 is context, not cluster. A withheld cell is never a zero. The footprints are
      defined canonically in the pic-geo package and all three rules are in
      <span class="mono">_data/METHODS-SOP.md</span>.`});
} catch (e) {
  console.error("hub: methodology block unavailable —", e.message);
}
})();
