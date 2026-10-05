/* The corrections log, rendered (DECISIONS.md, 2026-10-04, D3).
 *
 * NOTHING HERE IS WRITTEN BY THIS FILE. Every entry's heading and body is HTML that
 * _data/build/derive_corrections.py rendered from CORRECTIONS.md, character for character;
 * this script places it, builds the page filter from the pages each entry names, and
 * counts what it placed. The entries are never restyled into page prose: each heading and
 * body carries data-verbatim, which tools/style.mjs reads as a quoted record (an entry
 * written before a house rule existed keeps its punctuation, because changing it would
 * alter the record). The filter, the counts and the "Names" lines are this page's own
 * prose and are checked like any other.
 *
 * THE COUNT CHECKS ITSELF. If the page places a different number of entries than the
 * file holds, it logs an error, and tools/verify.mjs fails any page with a console error.
 * verify_consistency.py holds the file side: the JSON must be what the derive script
 * would write from CORRECTIONS.md now.
 */
(async () => {
const D = await PV.data("corrections.json");
/* each page's own count, the same file its byline link reads */
const BY = await PV.data("corrections_by_page.json").catch(() => null);
const entries = D.entries;
const record = document.getElementById("corr-record");
const list = document.getElementById("corr-entries");
document.getElementById("corr-preamble").innerHTML = D.preamble_html;

const tag = (name, cls, html) => {
  const e = document.createElement(name);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
for (const it of entries) {
  const art = tag("article", "corr-entry");
  art.id = it.id;
  art.dataset.pages = it.pages.join(" ");
  const head = art.appendChild(tag("h3", "corr-head",
    `<span class="corr-date">${it.date}${it.label ? `, ${it.label}` : ""}</span>` +
    `<span class="corr-title">${it.title_html}</span>`));
  art.appendChild(tag("p", "corr-pages", it.pages.length ? "Names " + it.pages.map(p =>
    `<a href="?page=${p}" data-page="${p}">${p}</a>`).join(", ")
    : "About the site as a whole; it names no single page."));
  const body = art.appendChild(tag("div", "corr-body", it.html));
  head.dataset.verbatim = body.dataset.verbatim = "CORRECTIONS.md";
  list.appendChild(art);
  if (it.after_html) list.appendChild(tag("div", "corr-between", it.after_html)).dataset.verbatim = "CORRECTIONS.md";
}

const placed = record.querySelectorAll("article.corr-entry").length;
if (placed !== entries.length || placed !== D.meta.n_entries)
  console.error(`corrections: placed ${placed} entries; the file holds ${D.meta.n_entries}`);

/* THE FILTER. Pages are the ones the entries name, so a page with no entry has no option,
   and an option can never come up empty. ?page=<slug> is the address every page's summary
   line links to. */
const pages = [...new Set(entries.flatMap(e => e.pages))].sort();
const sel = document.getElementById("corr-page");
for (const p of pages) {
  const o = document.createElement("option");
  o.value = p;
  o.textContent = p;
  sel.appendChild(o);
}
const count = document.getElementById("corr-count");
const show = page => {
  let n = 0;
  for (const art of record.querySelectorAll("article.corr-entry")) {
    const on = !page || art.dataset.pages.split(" ").includes(page);
    art.hidden = !on;
    n += on;
  }
  for (const between of record.querySelectorAll(".corr-between")) between.hidden = !!page;
  record.querySelector(".corr-preamble").hidden = !!page;
  const list = BY && BY.pages && BY.pages[page];
  count.textContent = page
    ? `${n} of the ${entries.length} entries name ${page}.` +
      (list ? ` On that page: ${PV.correctionsSentence(list, (BY.headlines || {})[page])}` : "")
    : `All ${entries.length} entries.`;
};
const asked = new URLSearchParams(location.search).get("page");
const start = pages.includes(asked) ? asked : "";
sel.value = start;
show(start);
sel.addEventListener("change", () => {
  const u = new URL(location.href);
  if (sel.value) u.searchParams.set("page", sel.value);
  else u.searchParams.delete("page");
  history.replaceState(null, "", u);
  show(sel.value);
});
record.addEventListener("click", ev => {
  const a = ev.target.closest("a[data-page]");
  if (!a) return;
  ev.preventDefault();
  sel.value = a.dataset.page;
  sel.dispatchEvent(new Event("change"));
  sel.focus();
});

await PV.methodology({
  page: "corrections",
  meta: D.meta,
  noClaimsNote: "This page makes no claim of its own. It reproduces the corrections file " +
    "as written, and each figure an entry gives is checked on the page it corrects.",
});
})();
