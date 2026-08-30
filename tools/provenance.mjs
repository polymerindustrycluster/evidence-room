/* DOES THE REGISTRY MATCH THE PAGE, or only the page match the registry?
 *
 *   node tools/provenance.mjs [names...]
 *
 * Every other check here runs one way: it confirms a page renders what _data/SOURCES.json
 * says. None asked the reverse, and on 2026-08-30 that let TWO phantom sources ship. The
 * revisions page credited the BLS employment census in its methodology box while being
 * built from three FRED price series; cost-scissors did the same. In both cases the box
 * was printing the registry faithfully and the registry was wrong, so a reader was told a
 * federal source stood behind a page that had never touched it. One entry made QCEW look
 * like it fed eleven pages when it fed nine, and made this site look better diversified
 * than it is. Both were found by outside reviewers reading the rendered page.
 *
 * The check: for every source a page CLAIMS in by_artifact, is there any trace of that
 * source in the page's own shipped data or claims? A source genuinely used leaves
 * fingerprints, its field names, its code vocabulary, its identifiers.
 *
 * FINGERPRINTS ARE GENEROUS ON PURPOSE. An ad-hoc version of this check, written in the
 * same hour, flagged three pages and two were its own false positives: occupations and
 * cluster-health genuinely use the Ohio projections and simply never write the string
 * "odjfs". A gate that cries wolf twice for every real catch will be switched off. So a
 * miss here is reported as SUSPECT and fails, but every fingerprint set below was checked
 * against a page known to use that source.
 */
import {readFileSync, readdirSync, existsSync} from "fs";

const REG = JSON.parse(readFileSync("_data/SOURCES.json", "utf8"));

/* What each source leaves behind. Verified against a page known to use it. */
const PRINTS = {
  qcew:            ["agglvl", "own_code", "annual_avg", "emplvl", "lq_", "naics"],
  qwi:             ["qwi", "hira", "earnbeg", "sep", "quarter"],
  lodes:           ["lodes", "jt00", "home", "work", "commut", "resident"],
  ipeds:           ["ipeds", "cip", "completion", "unitid", "degree"],
  bea_rpp:         ["rpp", "parit", "price_level", "adjusted"],
  fred:            ["fred", "alfred", "wpu", "pcu", "series", "vintage", "index"],
  oews:            ["oews", "soc", "occ", "wage", "metro"],
  oews_national:   ["oews", "soc", "occ", "national"],
  usaspending:     ["usaspend", "obligat", "award", "fain", "fy", "naics"],
  onet_education:  ["onet", "job_zone", "jobzone", "education", "schooling"],
  nem:             ["projection", "matrix", "326000", "occupation"],
  odjfs:           ["projection", "opening", "2032", "ohio", "odjfs"],
  public_record:   ["event", "milestone", "date", "lane"],
  heritage_register: ["heritage", "proven", "claimed", "discover", "era"],
};

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const pages = names.length ? names : Object.keys(REG.by_artifact || {});

let bad = 0, checked = 0, skipped = 0;
for (const page of pages.sort()) {
  const srcs = REG.by_artifact?.[page];
  if (!srcs) continue;
  let hay = "";
  const dir = `${page}/data`;
  if (existsSync(dir))
    for (const f of readdirSync(dir).filter(f => f.endsWith(".json")))
      hay += readFileSync(`${dir}/${f}`, "utf8");
  if (existsSync(`${page}/claims.json`)) hay += readFileSync(`${page}/claims.json`, "utf8");
  if (!hay) { skipped++; continue; }
  hay = hay.toLowerCase();

  const missing = [];
  for (const s of srcs) {
    const prints = PRINTS[s];
    if (!prints) { console.log(`${page.padEnd(18)} NOTE  no fingerprint set for ${s}`); continue; }
    checked++;
    if (!prints.some(p => hay.includes(p))) missing.push(s);
  }
  if (missing.length) {
    bad++;
    console.log(`${page.padEnd(18)} SUSPECT  claims ${missing.join(", ")} and carries no ` +
      `trace of it in its own data or claims`);
  } else {
    console.log(`${page.padEnd(18)} ok    ${srcs.length} source(s) leave fingerprints here`);
  }
}
console.log(`\n${checked} page-source pair(s) checked, ${skipped} page(s) had no shipped data`);
console.log(bad ? `${bad} page(s) credit a source that left no trace. Either the page stopped\n` +
                  `using it, or it never did, and a reader is being told otherwise.`
                : `every credited source leaves a trace on the page that credits it`);
process.exit(bad ? 1 : 0);
