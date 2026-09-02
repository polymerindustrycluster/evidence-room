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
   declared unlisted: the gate fails until someone decides which.

   AND IT IS NOW SAID ON THE PAGE. Excluding them from the totals was correct and being
   silent about them was not: a reader who reached one of those two pages by direct URL
   could not tell from the hub whether it was withheld or forgotten. The difference between
   the tree and the published set is printed in #withheld, from this same computation, and
   the paragraph removes itself in a cut of the tree where the unlisted pages were never
   copied — where the difference really is nothing, saying "two" would be the new lie. */
const CARDS = [...document.querySelectorAll(".card[data-slug]")];
/* THE TABLE HAS TO REACH THE NUMBERS THE PAGE ACTUALLY PRINTS. It stopped at "fourteen"
   while the hub counts 20 live pages, so `word(20)` fell through to String(20) and the
   front page rendered "The 20 pages here carry 474 checked claims" — a bare digit beside
   a spelled-out "21 of them", in the site's first sentence. index-inventory passed
   throughout because it reads counts.json and never the printed word. Extended past every
   count this page can reach: 23 artifacts today, and the tens are here so a site twice
   this size still spells its own totals. */
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two",
  "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven",
  "twenty-eight", "twenty-nine", "thirty", "thirty-one", "thirty-two", "thirty-three",
  "thirty-four", "thirty-five", "thirty-six", "thirty-seven", "thirty-eight",
  "thirty-nine", "forty"];
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
    const meta = el.querySelector(".meta");
    /* Two cards legitimately carry no county flag (sources is method-scoped, patents is
       state-scoped), and inserting before a null flag threw — inside the catch, so the
       hub 'stood' while silently dropping every claims pill after the throw. A card
       without a flag appends its pills to the meta row instead. */
    const add = (cls, text) => {
      const s = document.createElement("span");
      s.className = "pill " + cls;
      s.textContent = text;
      if (flag) flag.before(s); else meta.appendChild(s);
    };
    if (p.claims) add("apx", `${p.claims} claims`);
    if (p.manual) add("apx man", `${p.manual} manual`);
  }

  const claims = live.reduce((n, el) => n + C.pages[el.dataset.slug].claims, 0);
  const manual = live.reduce((n, el) => n + C.pages[el.dataset.slug].manual, 0);
  put("pagesword", word(live.length));
  put("claims", claims);
  put("manual", manual);

  /* The tree minus the gallery. counts.json holds one row per artifact that renders, so
     this is the number of built pages no card leads to, and it is derived rather than
     typed for the same reason the two counts above are. Nothing here reads why a page is
     withheld — that lives in each page's own .unlisted file and in index-inventory. */
  const withheld = C.n_pieces - live.length;
  put("withheldword", Word(withheld));
  if (!withheld) document.getElementById("withheld")?.remove();

  return live.length;
}

/* ------------------------------------------------------------------ the one chart

   THE HUB HAD NO GRAPHIC. Not an axis, a bar, a line or a map, on a page whose masthead
   says "Interactive evidence" and whose argument is that numbers should be inspectable. A
   naive reader finished it able to describe the METHOD and unable to state a single
   finding's direction: nothing on the page showed whether anything was bigger, smaller,
   rising or falling. This draws the H1's own claim, and only that.

   THE ARGUMENT IS THE TWO SHADED BANDS, not the bars. Ohio's lead over Texas (10,248) is
   drawn beside the whole spread from second place down to eighth (8,865), so "wider than"
   is something the reader sees rather than something the heading asserts. Both numbers are
   printed, and both are the difference of two bar labels standing next to them.

   Values are read from data/states.json, a cut of the peers page's own shipped file;
   nothing here is typed. index-chart-states asserts the copy still matches it. */
const FMT = n => n.toLocaleString("en-US");

function statesChart(D) {
  const S = D.states;
  if (!document.getElementById("states")) return;
  /* Below 760px pic-viz.css pins every chart to a 860px minimum and pans it sideways. A
     ten-row ranked bar does not need that: it re-lays out honestly at phone width with the
     name above each bar. `.chart.reflow` in styles.css releases the pan for this one. */
  const MOB = innerWidth < 760;
  const XMAX = 56000;

  const OHIO = S[0], TEX = S[1], EIGHTH = S[7];
  const lead = OHIO.emp - TEX.emp;               // 10,248
  const spread = TEX.emp - EIGHTH.emp;           // 8,865

  const C = MOB
    /* Measured, with a fallback: an unlaid-out container measures 0, which silently
       kept the authored 360 on the first attempt at this. */
    ? PV.chart("states", {W: Math.max(300, Math.round(
        document.getElementById("states").parentElement.getBoundingClientRect().width)
        || Math.min(980, innerWidth - 40)),
        m: {t: 56, r: 12, b: 40, l: 12}, rows: S.length, rowH: 50})
    : PV.chart("states", {W: 1000, m: {t: 56, r: 96, b: 42, l: 136}, rows: S.length,
                          rowH: 40});
  const {svg, m, w} = C;
  const x = v => m.l + (v / XMAX) * w;
  const rowTop = i => m.t + i * (MOB ? 50 : 40);
  const plotBot = rowTop(S.length);

  /* Bands first, so every mark and every label draws over them. */
  if (!MOB) {
    PV.el("rect", {x: x(EIGHTH.emp), y: m.t, width: x(TEX.emp) - x(EIGHTH.emp),
      height: plotBot - m.t, fill: "rgba(140,132,120,.13)"}, svg);
    PV.el("rect", {x: x(TEX.emp), y: m.t, width: x(OHIO.emp) - x(TEX.emp),
      height: plotBot - m.t, fill: "rgba(12,100,115,.13)"}, svg);
  }

  /* The second-place line. Labelled by what crossing it MEANS, not by what it equals:
     exactly one bar reaches past it, which is the whole finding. */
  const ref = [EIGHTH.emp, TEX.emp, OHIO.emp];
  (MOB ? [TEX.emp] : ref).forEach(v => {
    PV.el("line", {x1: x(v), y1: m.t, x2: x(v), y2: plotBot,
      stroke: "var(--pv-axis)", "stroke-width": 1}, svg);
  });

  const barH = MOB ? 20 : 22;
  S.forEach((d, i) => {
    const lead0 = i === 0;
    const by = MOB ? rowTop(i) + 22 : rowTop(i) + (40 - barH) / 2;
    if (MOB) {
      PV.txt(svg, d.name, {x: m.l, y: rowTop(i) + 15, "text-anchor": "start",
        "font-size": 14, "font-weight": lead0 ? 800 : 600, fill: "#26333A"});
      PV.txt(svg, FMT(d.emp), {x: m.l + w, y: rowTop(i) + 15, "text-anchor": "end",
        "font-size": 14, "font-weight": lead0 ? 800 : 400, fill: "#26333A"});
    } else {
      PV.txt(svg, d.name, {x: m.l - 12, y: by + barH - 6, "text-anchor": "end",
        "font-size": 15, "font-weight": lead0 ? 800 : 400, fill: "#26333A"});
      PV.txt(svg, FMT(d.emp), {x: x(d.emp) + 9, y: by + barH - 6, "text-anchor": "start",
        "font-size": 15, "font-weight": lead0 ? 800 : 400, fill: "#26333A"});
    }
    const bar = PV.el("rect", {x: m.l, y: by, width: x(d.emp) - m.l, height: barH,
      fill: lead0 ? PV.INK : PV.GRAY}, svg);
    PV.hoverable(bar, `<b>${d.name}</b><br>${FMT(d.emp)} plastics and rubber jobs, 2024<br>
      ${d.lq}&times; the national share of local jobs`,
      `${d.name}, ${FMT(d.emp)} jobs`);
  });

  /* The two spans, named. On a phone there is no room for two labelled bands, so the lead
     is stated once on Ohio's own row and the eighth-place comparison stays in the heading
     and the table below. No value is dropped either way. */
  if (MOB) {
    /* BOTH LABELS LIVE IN THE TOP MARGIN. Drawn in the gap under Ohio's bar, the lead
       annotation sat five pixels into the bar itself and printed teal on teal; there is no
       clear gap on a stacked row layout, so the top margin is the only honest home for it. */
    PV.txt(svg, `Ohio leads ${TEX.name} by ${FMT(lead)}`, {x: m.l, y: 18,
      "text-anchor": "start", "font-size": 14, "font-weight": 800, fill: PV.INK});
    PV.txt(svg, "second place", {x: x(TEX.emp), y: 42, "text-anchor": "middle",
      "font-size": 13, fill: "var(--pv-muted)"});
  } else {
    const cap = (x0, x1, big, small, ink) => {
      const mid = (x(x0) + x(x1)) / 2;
      PV.txt(svg, big, {x: mid, y: m.t - 24, "text-anchor": "middle", "font-size": 17,
        "font-weight": 800, fill: ink});
      PV.txt(svg, small, {x: mid, y: m.t - 9, "text-anchor": "middle", "font-size": 13,
        fill: "var(--pv-muted)"});
    };
    cap(EIGHTH.emp, TEX.emp, FMT(spread), "second to eighth", "#5E574C");
    cap(TEX.emp, OHIO.emp, FMT(lead), "Ohio’s lead", PV.INK);
  }

  PV.el("line", {x1: m.l, y1: m.t, x2: m.l, y2: plotBot, stroke: "var(--pv-axis)",
    "stroke-width": 1}, svg);
  PV.txt(svg, MOB ? "Jobs, 2024. Bars start at zero"
                  : "Jobs in plastics and rubber products, 2024. Bars start at zero",
    {x: m.l, y: plotBot + 28, "text-anchor": "start", class: "pv-axlab"});

  /* The container is hidden until this line; see the `.chart.jsdrawn` note in styles.css
     for why the hide can never sit on the svg. */
  svg.closest(".chart").classList.add("drawn");

  const mount = document.getElementById("statestable");
  if (mount) mount.innerHTML = PV.tableView("states",
    "The ten states with the most plastics and rubber jobs, 2024",
    ["State", "Jobs", "Share of local jobs against the national share"],
    S.map(d => [d.name, FMT(d.emp), d.lq + "×"]));
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

/* Contained like the rest. The heading above the chart states the finding in text, so a
   failure here costs the picture and not the claim; styles.css hides an undrawn svg rather
   than leaving a labelled hole. */
try {
  statesChart(await PV.data("states.json"));
} catch (e) {
  console.error("hub: state ranking chart unavailable —", e.message);
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
    /* Every term here used to arrive as itself: PIC, PIC-12, NEO-14, three bare NAICS
       numbers and "a withheld cell is never a zero", none of them in plain words. Each now
       leads with the reading and keeps the house term after it. */
    definitions: `<b>PIC</b> is the Polymer Industry Cluster, the industry group that
      publishes this site. <b>PIC-12</b> is the twelve-county footprint every federal-data
      page here is built on, and matches the cluster-health dashboard. <b>NEO-14</b> is the
      wider fourteen-county area company records are tagged to in the vault. They share ten
      counties, they never reconcile, and no figure from one belongs in a sentence with a
      figure from the other. PIC measures itself on three NAICS codes: 3252 for resins,
      3255 for paints and coatings, and 326 for plastics and rubber products. NAICS 325, the
      wider chemicals family, is context rather than cluster. A withheld cell is never a zero: where a count
      is too small to publish without identifying an employer, the figure is unknown, not
      none. The footprints are defined canonically in the pic-geo package and all three
      rules are in <span class="mono">_data/METHODS-SOP.md</span>.`});
} catch (e) {
  console.error("hub: methodology block unavailable —", e.message);
}
})();
