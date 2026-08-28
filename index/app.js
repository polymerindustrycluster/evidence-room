/* The gallery. Cards are grouped by what each piece is FOR, not by data source — a reader
   arrives with a question, not with a preference for QCEW. Claim counts come from
   counts.json, not from this file, and claims.json checks them against the harness — so
   this page cannot drift away from it without the harness saying so.

   Every card's finding sentence restates a number the linked page publishes. Each of those
   restatements is guarded in this page's own claims.json against THAT PAGE'S data file, so
   a correction on a page fails the hub's gate instead of leaving a stale card behind. */
(async () => {
"use strict";
/* Counts come from _data/build/derive_index.py, which reads every claims.json. They
   were hand-typed once and immediately drifted — the page said 61 claims and "sixteen
   pieces" while the harness said 62 and 17. */
const C = await PV.data("counts.json");
const cnt = s => C.pages[s] || {claims: 0, manual: 0};

/* geo = the geography a page's figures are BUILT ON, which is what the county picker
   answers. "pic12" holds all twelve counties; "metros4" is the four metropolitan areas
   the occupations file publishes wages for; "akron" is the single regional metro the
   cost-of-living page prices; national and register pages contain no county reading. */
const ALL = [
 {s:"cluster-health", g:"position", geo:"pic12", t:"How the cluster is doing",
  q:"Five measures, and whether each one actually moved.",
  f:"Scale, concentration, pay, the degree pipeline and federal money, each read against a stated baseline and against how much these federal series normally move after publication, so a change inside the noise is reported as one.",
  foot:"PIC-12"},
 {s:"peers", g:"position", geo:"pic12", t:"First in the country",
  q:"Where does the region actually rank?",
  f:"Ohio holds 54,846 plastics and rubber jobs, 10,248 more than second-place Texas, with all 51 state geographies disclosed. Akron is 6th among the 155 metros that disclose; 227 metros are withheld and are simply unknown.",
  foot:"PIC-12", lead:true},
 {s:"location-quotient", g:"position", geo:"pic12", t:"A number we own",
  q:"Which polymer industry is this region most concentrated in?",
  f:"Paint and coatings run 5.96 times the national share and have led all six polymer industries every year since 2015. Rubber products, the industry Akron is named for, run 2.44 times.",
  foot:"PIC-12"},
 {s:"laborshed", g:"workforce", geo:"pic12", t:"No county is a labor market",
  q:"Is a single county a workforce unit?",
  f:"Summit County’s own residents hold 48.4 percent of its 265,460 jobs. No county in the twelve reaches 69 percent, so county-level workforce policy is aimed at a population that mostly lives somewhere else.",
  foot:"PIC-12", lead:true},
 {s:"wages", g:"workforce", geo:"pic12", t:"Does the cluster pay better?",
  q:"Are these actually good jobs?",
  f:"The typical polymer job pays 1.2 times what the average job in its county pays, and beats it in 40 of the 51 industry-county pairings the bureau can disclose. All eleven that miss make plastics or rubber products.",
  foot:"PIC-12", lead:true},
 {s:"churn", g:"workforce", geo:"pic12", t:"The churn engine",
  q:"Is this workforce stable, or only flat?",
  f:"111,529 hire events and 111,361 separations produced 168 net jobs across fourteen years. The average quarter moves 10.8 percent of the workforce in or out.",
  foot:"PIC-12"},
 {s:"occupations", g:"workforce", geo:"metros4", t:"What the industry is made of",
  q:"Which jobs is the industry made of, and what do they pay here?",
  f:"One job in nine is a molding-machine setter, and 51 percent of the country’s setters work in this one industry. All four Northeast Ohio metros pay the degree occupations under the national rate.",
  foot:"four metros"},
 {s:"realwage", g:"conditions", geo:"akron", t:"What the paycheck buys",
  q:"Are the wages good after cost of living?",
  f:"Among the 56 metros with a real polymer workforce, Akron is 33rd on weekly wages and 19th on what those wages buy. The climb crosses the median and is smaller than the pitch PIC usually makes.",
  foot:"Akron metro"},
 {s:"cost-scissors", g:"conditions", geo:"national", t:"Nothing came back down",
  q:"Where in the chain did the price spike stick?",
  f:"Natural gas gave back its whole 2022 spike, crude about half, resin about a third, and finished polymer products none of it. Retracement falls with every step away from the wellhead.",
  foot:"national"},
 {s:"federal-money", g:"money", geo:"pic12", t:"The other federal money",
  q:"Is the Tech Hub award big?",
  f:"Ordinary federal contracting in chemicals and plastics across the twelve counties has run at $34.9 million a year since 2019. The $51.0 million Tech Hub award is about a year and a half of it, and fiscal 2019 alone cleared the award line.",
  foot:"PIC-12", lead:true},
 {s:"funding-map", g:"money", geo:"register", t:"PIC funding map",
  q:"Where did the public money go?",
  f:"$106.3 million through three public awards and twenty-one named recipients, drawn to scale, with the disclosures attached. Predates the shared house style.",
  foot:"awards", legacy:true},
 {s:"revisions", g:"method", geo:"national", t:"Every number moves",
  q:"How much do these figures change after publication?",
  f:"259 of 273 published months in three producer-price series were changed later, by a typical 0.15 percent. That the change is small is the finding, and the scope is those three series only.",
  foot:"national"},
 {s:"timeline", g:"method", geo:"register", t:"Why here, then the record",
  q:"Why is the cluster here, and what has it done?",
  f:"32 proven events from 1898 explain why the designation landed in Akron. The public record holds 4 events in the 34 months before October 2023 and 68 in the 34 months since. Predates the shared house style.",
  foot:"public record", legacy:true},

 /* 10 further pieces exist and are not published — see the README.
    Their entries are removed here rather than filtered at render time, so the
    text is absent from what is served, not merely unrendered. */
];
/* THE HUB LINKS WHAT EXISTS, NOTHING ELSE. counts.json is generated by derive_index.py
   from the artifact folders actually present in the tree it runs in, so this one filter
   does two jobs: internally every card shows, and in the public tree — where only the
   pages John marked `publish` in _data/ARTIFACT-REVIEW.md were ever copied — the held
   pages disappear on their own. A second hand-maintained publish list would be a second
   thing to forget, and forgetting THIS one publishes a dead link straight to a page that
   was withheld on purpose. */
const A = ALL.filter(x => C.pages[x.s]);
const GRP = {position:"National position", workforce:"Workforce", programs:"PIC programs",
  capability:"Regional capability", money:"Money", conditions:"Operating conditions",
  method:"Method & governance"};

/* HERO STATS ARE FINDINGS, NOT MACHINERY. The row used to read 12 pieces / 69 claims /
   8 sources / 0 private dependencies: four descriptions of the apparatus, on the first
   screen a funder ever sees. Three findings and one trust signature now, which is the
   house ratio. Each of the three is guarded in claims.json against the data file of the
   page it came from. None of them repeats the H1: the rank is the headline, so the cards
   answer the two questions the standfirst raises and then sign the work. */
PV.figures([
  ["key", "1.2×", "the polymer wage premium over the county average", "It beats the local average in 40 of the 51 disclosed pairings"],
  ["", "48.4%", "of Summit County’s jobs held by its own residents", "No county in the twelve reaches 69 percent"],
  ["", "$34.9M", "a year in routine federal contracts", "The Tech Hub award is about 1.5 years of it"],
  ["", C.total_claims, "checked claims across twelve pages", C.total_manual + " rest on a document a person read"]
]);

const card = x => `<a class="card" href="../${x.s}/" data-geo="${x.geo}">
  <div class="grp">${GRP[x.g]}</div>
  <h3>${x.t}</h3>
  <p class="q">${x.q}</p>
  <p class="f">${x.f}</p>
  <div class="meta">
    <span class="pill${x.foot === "NEO-14" ? " n14" : ""}">${x.foot}</span>
    ${cnt(x.s).claims ? `<span class="pill">${cnt(x.s).claims} claims</span>` : ""}
    ${cnt(x.s).manual ? `<span class="pill man">${cnt(x.s).manual} manual</span>` : ""}
    ${x.legacy ? `<span class="pill">legacy</span>` : ""}
    <span class="pill hit-flag">covers this county</span>
  </div></a>`;
document.getElementById("lead").innerHTML = A.filter(x => x.lead).map(card).join("");
const order = ["position", "workforce", "capability", "programs", "money", "conditions",
  "method"];
document.getElementById("all").innerHTML =
  order.flatMap(g => A.filter(x => x.g === g && !x.lead)).map(card).join("");
PV.padGrid(".cards", "card");

/* ------------------------------------------------------------------ county picker

   The one interaction on this page, and it does the lookup job the site's own footprint
   law implies: a member in a named county wants to know which of these pages is built on
   a geography that contains theirs. The DEFAULT state is the whole gallery with nothing
   marked and nothing hidden, so the page still reads as a printed list; the claims file
   guards the default sentence and each ingredient, not the twelve variants.

   The county list below is checked, not trusted: claims.json asserts it is exactly the
   footprint federal-money's shipped data was built from, so a change to PIC-12 fails this
   page's gate rather than leaving a stale dropdown behind. */
const COUNTIES = ["Ashtabula", "Cuyahoga", "Geauga", "Lake", "Lorain", "Mahoning",
  "Medina", "Portage", "Stark", "Summit", "Trumbull", "Wayne"];
/* Which of the four metropolitan areas in the occupations wage file contains each county.
   OMB delineations, the same ones BLS uses for the metro wage files; carried as a manual
   claim because no shipped dataset states the county-to-metro mapping. Ashtabula and
   Wayne are in none of the four, which is the finding the picker exists to surface. */
const METRO = {Summit:"Akron", Portage:"Akron", Cuyahoga:"Cleveland", Geauga:"Cleveland",
  Lake:"Cleveland", Lorain:"Cleveland", Medina:"Cleveland", Stark:"Canton-Massillon",
  Mahoning:"Youngstown-Warren", Trumbull:"Youngstown-Warren"};
const N_PIC12 = A.filter(x => x.geo === "pic12").length;
/* Counts are computed, so they are spelled out here rather than typed into prose. A
   numeral mid-sentence beside "twelve-county" reads as a different register. */
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve"];
const word = n => WORDS[n] || String(n);

const sel = document.getElementById("county");
const verdict = document.getElementById("verdict");
sel.insertAdjacentHTML("beforeend",
  COUNTIES.map(c => `<option value="${c}">${c} County</option>`).join(""));

const covers = (geo, county) => geo === "pic12" ||
  (geo === "metros4" && METRO[county] !== undefined) ||
  (geo === "akron" && METRO[county] === "Akron");

const DEFAULT_VERDICT = `All twelve counties in view. Pick one to see which of these pages
  is built on a geography that contains it.`;

function paint() {
  const c = sel.value;
  document.querySelectorAll(".card").forEach(el => {
    el.classList.toggle("hit", Boolean(c) && covers(el.dataset.geo, c));
  });
  document.body.classList.toggle("picked", Boolean(c));
  if (!c) { verdict.innerHTML = DEFAULT_VERDICT; return; }
  const n = A.filter(x => covers(x.geo, c)).length;
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
    ${word(N_PIC12)} of these pages are built on. ${metroLine}
    <b>${word(n)} of the twelve</b> are built on a geography that contains it.`;
}
sel.addEventListener("change", paint);
paint();

document.getElementById("footnote").innerHTML =
  `<b>${C.total_manual} of the ${C.total_claims} claims cannot be machine-checked.</b> They are
   quoted from project narratives, press releases and internal registers rather than from
   datasets, so they carry a source and a falsification condition but no runnable
   assertion. They are where a wrong reading is most likely to survive. Attack them first.`;

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({
  /* Points at _data/SOURCES.json, not at _data/PIPELINES.md. PIPELINES.md is an internal
     working document and is not published, so naming it here sent every public reader to a
     path that does not exist — on the one page that exists to tell them where to look. */
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
})();
