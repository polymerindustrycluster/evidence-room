/* THE WHOLE GATE SUITE, ONE COMMAND, ONE EXIT CODE.
 *
 *   node tools/all.mjs [--fast] [--quiet] [--log-dir=PATH]
 *
 * Written on 2026-08-29 after a session in which the suite was hand-chained with && on
 * every run. Two things went wrong repeatedly and both are addressed here.
 *
 * AGENTS REPORTED GATES THEY HAD NOT SEEN FINISH. A twelve-command chain takes long
 * enough that a worker would quote the last output it happened to catch, or a partial
 * result from a killed run, and call the suite green. One command with one exit code and
 * one printed verdict removes the opportunity: there is nothing to quote but the verdict.
 *
 * A CHAIN STOPS AT THE FIRST FAILURE, which is exactly wrong for a review. Knowing that
 * verify failed tells you nothing about whether the other ten also would; you fix, re-run,
 * wait, and discover the next one. This runs everything and reports every failure, so one
 * pass gives the whole picture.
 *
 * Order is deliberate: cheap and broad first so an obvious break surfaces in seconds, the
 * two width sweeps last because they are minutes rather than seconds. --fast skips them
 * and says so in the verdict, because a suite that silently ran less than it claims is the
 * defect this project spent a week removing.
 *
 * --changed REF scopes the page gates to the pages a branch touched (CI runs pull requests
 * this way against their base). A page is touched when a file in its folder changed;
 * anything shared (_shared/, tools/, _data/ beyond one page's raw data or builder,
 * .github/, package files, CORRECTIONS.md, any other root file but the prose docs) puts
 * every page back in scope. Site gates always run in full. The run prints which pages and
 * why, and every scoped gate says "[N/M pages]" in its own line, so a subset can never be
 * read as the whole site.
 *
 * --part and --shard cut the suite into the slices CI runs as parallel jobs. A slice's
 * verdict is the slice's only; the workflow's aggregate job is the suite's.
 */
import {spawnSync} from "child_process";
import {mkdirSync, writeFileSync, readdirSync, existsSync} from "node:fs";
import {resolve, join} from "node:path";

const USAGE = "Usage: node tools/all.mjs [--fast] [--quiet] [--log-dir=PATH] [--changed[=]REF]\n" +
  "       [--part=site,pages,selftest] [--shard=K/N]";
const argv = process.argv.slice(2);
const opt = {fast: false, quiet: false, logDir: null, changed: null, parts: null, shard: null};
const fail = msg => { console.error(`${msg}\n${USAGE}`); process.exit(2); };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--fast") opt.fast = true;
  else if (a === "--quiet") opt.quiet = true;
  else if (/^--log-dir=\S/.test(a) && !opt.logDir) opt.logDir = resolve(a.slice("--log-dir=".length));
  else if (a === "--changed" && argv[i + 1] && !argv[i + 1].startsWith("--")) opt.changed = argv[++i];
  else if (/^--changed=\S/.test(a)) opt.changed = a.slice("--changed=".length);
  else if (/^--part=[a-z,]+$/.test(a)) {
    opt.parts = new Set(a.slice("--part=".length).split(","));
    if ([...opt.parts].some(p => !["site", "pages", "selftest"].includes(p))) fail(`Unknown part in ${a}.`);
  }
  else if (/^--shard=\d+\/\d+$/.test(a)) {
    const [k, n] = a.slice("--shard=".length).split("/").map(Number);
    if (!(k >= 1 && k <= n)) fail(`${a}: K must be between 1 and N.`);
    opt.shard = {k, n};
  }
  else fail(`Unrecognised argument ${a}.`);
}
if (opt.shard && (!opt.parts || [...opt.parts].join() !== "pages"))
  fail("--shard splits the page gates only; pass it with --part=pages.");
const {fast, quiet, logDir} = opt;
if (logDir) mkdirSync(logDir, {recursive: true});

const GATES = [
  ["bundle",      "node",   ["tools/bundle.mjs"],            "regenerates dist/ so every gate reads the same build"],
  ["pagetext",    "node",   ["tools/pagetext.mjs"],          "Chromium's parse of each bundle's prose, for nouns"],
  ["source-inputs", "python3", ["-m", "unittest", "discover", "-s", "_data/build", "-p", "test_*.py"], "source completeness, geography and inventory regressions"],
  ["workplaces",  "python3", ["-m", "unittest", "discover", "-s", "cluster-health", "-p", "test_*.py"], "complete annual inputs, valid denominators and scoped rebuilds"],
  ["claims",      "python3", ["_data/build/verify_claims.py"],      "recorded assertions against their page data"],
  ["nouns",       "python3", ["_data/build/verify_nouns.py"],       "opted-in figures bound to the noun printed beside them"],
  ["series",      "python3", ["_data/build/verify_series.py"],      "series contracts, ranges and dated source controls"],
  ["consistency", "python3", ["_data/build/verify_consistency.py"], "builders, catalog, prose invariants"],
  ["provenance",  "node",   ["tools/provenance.mjs"],        "the registry matches the page, not only the reverse"],
  ["verify",      "node",   ["tools/verify.mjs"],            "structure, titles, page-level overflow, hero text contrast"],
  ["columns",     "node",   ["tools/columns.mjs"],           "one text rail"],
  ["centres",     "node",   ["tools/centres.mjs", "."],      "block centring across widths"],
  ["disclosure",  "node",   ["tools/disclosure.mjs"],        "every page says an AI wrote it, in one wording"],
  ["breaksif",    "node",   ["tools/breaksif.mjs"],          "every listed story says what would prove its headline wrong"],
  ["style",       "node",   ["tools/style.mjs"],             "house style law in rendered prose"],
  ["coldopen",    "node",   ["tools/coldopen.mjs"],          "evidence in the first screen, ratcheted"],
  ["figures",     "node",   ["tools/figures.mjs"],           "cross-page figure registry"],
  ["alttext",     "node",   ["tools/alttext.mjs"],           "every chart carries a description"],
  ["furniture",   "node",   ["tools/furniture.mjs"],        "every number on a chart is said somewhere else on its page"],
  ["caveat",      "node",   ["tools/caveat.mjs"],           "apparatus ink under a chart, ratcheted"],
  ["fonts",       "node",   ["tools/fonts.mjs"],             "every font this site names, this site ships"],
  ["classes",     "node",   ["tools/classes.mjs"],           "every class a page uses resolves to a rule"],
  ["legends",     "node",   ["tools/legends.mjs"],           "the reader gets the key before the data"],
  ["measure",     "node",   ["tools/measure.mjs"],           "running prose holds the measure"],
  ["fontfocus",   "node",   ["tools/fontfocus.mjs"],         "chart focus survives a late web font, announced once"],
  ["access",      "node",   ["tools/access.mjs"],            "one Tab stop per chart, full twin tables, announced results, 404"],
  ["collide",     "node",   ["tools/collide.mjs", "--sweep"],  "overlap and out-of-frame, 14 widths", true],
  ["textsize",    "node",   ["tools/textsize.mjs", "--sweep"], "12px rendered floor, 14 widths", true],
  ["selftest",    "node",   ["tools/selftest.mjs"],            "99 known-defect fixtures across 17 gates", true],
];

/* PAGE GATES take page names and check only those; every other gate reads the whole site
   (registries, builders, cross-page figures, the source tests) and always runs in full.
   `keep` drops pages a gate does not check on a full run either, so a scoped run never
   asks a gate about a page it would have skipped; `extra` rides along with any page list. */
const PAGE_GATES = {
  verify: {}, disclosure: {}, breaksif: {}, style: {}, coldopen: {}, alttext: {},
  furniture: {}, caveat: {}, classes: {}, legends: {},
  measure: {keep: p => p !== "index"},     // the hub is a card grid, not running prose
  access: {extra: ["404"]},                // its 404 check is cheap and page-independent
  collide: {}, textsize: {},
};
const PREREQ = new Set(["bundle"]);        // every slice needs dist/ built
const partOf = name => name === "selftest" ? "selftest" : PAGE_GATES[name] ? "pages" : "site";

/* WHICH PAGES A CHANGE CAN REACH. A page bundles its own folder, _shared/ and three
   _data files (dist/.inputs.json records exactly that), so a change outside one folder is
   treated as site-wide. The only _data paths credited to a single page are its own raw
   folder and a derive_/fetch_ builder named for it; anything else under _data, and any
   root file but the prose docs below, puts every page back in scope. When unsure, all. */
const NEUTRAL_ROOT = new Set(["README.md", "CONTRIBUTING.md", "DECISIONS.md", "LICENSE", "LICENSE-CC-BY-4.0"]);
const NOT_PAGES = new Set(["dist", "tools", "node_modules", "shots"]);
const allPages = () => readdirSync(".", {withFileTypes: true})
  .filter(d => d.isDirectory() && !/^[_.]/.test(d.name) && !NOT_PAGES.has(d.name) &&
               existsSync(join(d.name, "index.html")))
  .map(d => d.name).sort();

const git = (...a) => {
  const r = spawnSync("git", a, {encoding: "utf8"});
  return r.status === 0 ? r.stdout : null;
};

function scopePages(ref, pages) {
  const all = {pages, why: null, files: {}};
  const base = git("merge-base", ref, "HEAD");
  if (!base) return {...all, why: `cannot resolve ${ref} against HEAD, so nothing can be scoped`};
  const mb = base.trim();
  /* committed since the merge base, plus the working tree, plus untracked files git would
     add: a local run must not scope away the edit that is sitting unstaged */
  const diff = git("diff", "--name-only", "--no-renames", mb);
  const untracked = git("ls-files", "--others", "--exclude-standard");
  if (diff === null || untracked === null) return {...all, why: "git could not list the changed files"};
  /* node_modules is a symlink in local worktrees, which a `node_modules/` ignore rule
     (directories only) does not cover; it is never site content */
  const files = [...new Set((diff + untracked).split("\n").filter(f => f && f !== "node_modules"))].sort();
  const label = `${ref} (merge base ${mb.slice(0, 7)})`;
  const site = [], hit = {};
  const credit = (p, f) => (hit[p] ||= []).push(f);
  const pageKey = p => p.replace(/-/g, "_");
  for (const f of files) {
    const parts = f.split("/");
    if (parts.length === 1) { if (!NEUTRAL_ROOT.has(f)) site.push(f); continue; }
    const top = parts[0];
    if (pages.includes(top)) { credit(top, f); continue; }
    if (top === "_data" && parts[1] === "raw" && parts.length > 3 && pages.includes(parts[2])) {
      credit(parts[2], f); continue;
    }
    const builder = top === "_data" && parts[1] === "build" && parts.length === 3 &&
      (parts[2].match(/^(?:derive|fetch)_(\w+)\.py$/) || [])[1];
    const owner = builder && pages.find(p => builder === pageKey(p) || builder.startsWith(pageKey(p) + "_"));
    if (owner) { credit(owner, f); continue; }
    /* a top-level folder that is no page now (a page removed, or a new withheld one):
       the hub, the registry and every cross-link may have moved with it */
    site.push(f);
  }
  if (site.length) return {pages, files, label,
    why: `site-wide change: ${site.slice(0, 3).join(", ")}${site.length > 3 ? ` (+${site.length - 3} more)` : ""}`};
  return {pages: pages.filter(p => hit[p]), files: hit, label, why: null, scoped: true, total: files.length};
}

const PAGES = allPages();
let scope = {pages: PAGES, scoped: false};
if (opt.changed) {
  scope = scopePages(opt.changed, PAGES);
  console.log(`CHANGED-PAGES MODE against ${scope.label || opt.changed}`);
  if (!scope.scoped) console.log(`  every page (${PAGES.length}): ${scope.why}`);
  else if (!scope.pages.length) console.log(`  no page folder changed (${scope.total} file(s) changed, none page-specific): page gates run on 0 pages`);
  else scope.pages.forEach(p => console.log(`  ${p.padEnd(18)} ${scope.files[p].slice(0, 2).join(", ")}` +
                                            `${scope.files[p].length > 2 ? ` (+${scope.files[p].length - 2} more)` : ""}`));
}
let pagesRun = scope.pages;
if (opt.shard) {
  pagesRun = pagesRun.filter((_, i) => i % opt.shard.n === opt.shard.k - 1);
  console.log(`SHARD ${opt.shard.k}/${opt.shard.n}: ${pagesRun.length ? pagesRun.join(", ") : "no pages"}`);
}
if (opt.changed || opt.shard) console.log("");
/* a page gate runs on everything only when nothing narrowed the list */
const narrowed = scope.scoped || !!opt.shard;

const rows = [];
const t0 = Date.now();
for (const [name, cmd, gateArgv, what, slow] of GATES) {
  const part = partOf(name);
  if (opt.parts && !opt.parts.has(part) && !PREREQ.has(name)) continue;
  if (fast && slow) { rows.push({name, what, skipped: true, reason: "fast"}); continue; }
  let argvRun = gateArgv, tag = "";
  if (part === "pages" && narrowed) {
    const spec = PAGE_GATES[name];
    const mine = pagesRun.filter(spec.keep || (() => true));
    const of = PAGES.filter(spec.keep || (() => true)).length;
    tag = `[${mine.length}/${of} pages] `;
    if (!mine.length) {
      rows.push({name, what, skipped: true, reason: "scope", tag,
                 last: opt.shard && !scope.scoped ? "no pages in this shard" : "no changed page in scope"});
      if (!quiet) console.log(` skip  ${name.padEnd(12)} ${"".padStart(7)}  ${tag}${rows.at(-1).last}`);
      continue;
    }
    argvRun = [...gateArgv, ...(spec.extra || []), ...mine];
  }
  const t = Date.now();
  const r = spawnSync(cmd, argvRun, {encoding: "utf8"});
  if (logDir) writeFileSync(join(logDir, `${name}.log`),
    `${tag ? `SCOPE ${tag}${argvRun.slice(gateArgv.length).join(" ")}\n` : ""}` +
    `${r.stdout || ""}${r.stderr || ""}\nEXIT_CODE=${r.status ?? 1}\n`, "utf8");
  const out = ((r.stdout || "") + (r.stderr || "")).trim().split("\n");
  const last = out.filter(Boolean).pop() || "(no output)";
  rows.push({name, what, code: r.status ?? 1, tag, last: tag + last.replace(/\[\d+m/g, ""),
             secs: ((Date.now() - t) / 1000).toFixed(1),
             detail: out.filter(l => /FAIL|ERROR|clipped|past the|UNMEASURED/.test(l)).slice(0, 4)});
  if (!quiet) {
    const s = rows.at(-1);
    console.log(`${s.code === 0 ? "  ok  " : "FAIL  "}${name.padEnd(12)} ${s.secs.padStart(6)}s  ${s.last.slice(0, 78)}`);
    if (s.code !== 0) s.detail.forEach(d => console.log(`        ${d.trim().slice(0, 96)}`));
  }
}

const ran = rows.filter(r => !r.skipped);
const bad = ran.filter(r => r.code !== 0);
const skipped = rows.filter(r => r.skipped);
const fastSkipped = skipped.filter(r => r.reason === "fast");
const scopeSkipped = skipped.filter(r => r.reason === "scope");
if (logDir) writeFileSync(join(logDir, "results.json"), JSON.stringify(
  {changed: opt.changed, scoped: scope.scoped, pages: pagesRun, parts: opt.parts ? [...opt.parts] : null,
   shard: opt.shard, rows}, null, 2) + "\n");
console.log("");
if (fastSkipped.length)
  console.log(`NOT RUN (--fast): ${fastSkipped.map(s => s.name).join(", ")} — width sweeps and gate self-tests.\n` +
              `These are the checks that found sub-12px text on 14 of 16 pages and ~50 collisions.\n` +
              `A --fast pass is not a clean bill.`);
if (narrowed)
  console.log(`SCOPED: page gates ran on ${pagesRun.length} of ${PAGES.length} pages` +
              `${pagesRun.length ? ` (${pagesRun.join(", ")})` : ""}` +
              `${scope.scoped ? `, the pages changed since ${opt.changed}` : ""}` +
              `${opt.shard ? `, shard ${opt.shard.k}/${opt.shard.n}` : ""}.` +
              `${scopeSkipped.length ? ` Not run for want of a page: ${scopeSkipped.map(s => s.name).join(", ")}.` : ""}` +
              `\nThe other pages were not checked by this run.`);
if (opt.parts)
  console.log(`PARTIAL: only the ${[...opt.parts].join(", ")} slice of the suite ran; ` +
              `the verdict below covers that slice, not the suite.`);
console.log(bad.length
  ? `SUITE FAILED: ${bad.length} of ${ran.length} gates — ${bad.map(b => b.name).join(", ")}`
  : `SUITE PASSED: ${ran.length} gates in ${((Date.now() - t0) / 1000).toFixed(0)}s` +
    (skipped.length ? ` (${skipped.length} skipped)` : ""));
process.exit(bad.length ? 1 : 0);
