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
import {mkdirSync, writeFileSync, readdirSync, existsSync, readFileSync, mkdtempSync, rmSync} from "node:fs";
import {resolve, join} from "node:path";
import {tmpdir} from "node:os";

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
if (opt.shard && !["pages", "selftest"].includes([...(opt.parts || [])].join()))
  fail("--shard splits the page gates or the self-tests; pass it with --part=pages or --part=selftest.");
const shardPages = opt.shard && opt.parts.has("pages");
const shardTests = opt.shard && opt.parts.has("selftest");
const shardFlag = shardTests ? [`--shard=${opt.shard.k}/${opt.shard.n}`] : [];
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
  ["launchers",   "node",   ["tools/launchers.mjs"],         "every browser tool launches through the one deterministic helper"],
  ["classes",     "node",   ["tools/classes.mjs"],           "every class a page uses resolves to a rule"],
  ["legends",     "node",   ["tools/legends.mjs"],           "the reader gets the key before the data"],
  ["measure",     "node",   ["tools/measure.mjs"],           "running prose holds the measure"],
  ["fontfocus",   "node",   ["tools/fontfocus.mjs"],         "chart focus survives a late web font, announced once"],
  ["access",      "node",   ["tools/access.mjs"],            "one Tab stop per chart, full twin tables, announced results, 404"],
  ["collide",     "node",   ["tools/collide.mjs", "--sweep"],  "overlap and out-of-frame, 14 widths", true],
  ["textsize",    "node",   ["tools/textsize.mjs", "--sweep"], "12px rendered floor, 14 widths", true],
  ["selftest",    "node",   ["tools/selftest.mjs"],            "103 known-defect fixtures across 19 gates", true],
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

const CROSS_PAGES = new Set(["index", "sources", "corrections"]);

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
    /* pages whose checks read other pages: the hub's cards are checked against each story's
       own status and claims, and sources and the corrections log census every page. An edit to
       one of them can break a check that runs on another page, so it counts as site-wide. */
    if (CROSS_PAGES.has(top)) { site.push(f); continue; }
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
  if (site.length) return {pages, files: hit, changed: files, label,
    why: `site-wide change: ${site.slice(0, 3).join(", ")}${site.length > 3 ? ` (+${site.length - 3} more)` : ""}`};
  return {pages: pages.filter(p => hit[p]), files: hit, changed: files, label, why: null, scoped: true,
          total: files.length};
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
if (shardPages) {
  pagesRun = pagesRun.filter((_, i) => i % opt.shard.n === opt.shard.k - 1);
  console.log(`SHARD ${opt.shard.k}/${opt.shard.n}: ${pagesRun.length ? pagesRun.join(", ") : "no pages"}`);
}
if (opt.changed || shardPages) console.log("");
/* a page gate runs on everything only when nothing narrowed the list */
const narrowed = scope.scoped || !!shardPages;

/* SELF-TESTS FOR WHAT A CHANGE CAN BREAK. With --changed, the self-test runs the fixtures
   of every gate whose code changed (its script and everything it imports, Python too) or
   whose code names a changed data file, plus every fixture whose page or injected file
   changed. A change to the self-test harness, the bundler, a shared tools/_ helper,
   _shared/, package files or the workflow runs every fixture, and so does any changed
   file this cannot attribute: when unsure, all. The full self-test still runs nightly. */
const ALL_FIXTURES = [/^tools\/(selftest|bundle)\.mjs$/, /^tools\/_/, /^_shared\//,
                      /^package(-lock)?\.json$/, /^\.github\//];
function selectFixtures(changed) {
  const r = spawnSync("node", ["tools/selftest.mjs", "--list"], {encoding: "utf8"});
  let cases = null;
  try { cases = JSON.parse(r.stdout); } catch { /* below */ }
  if (r.status !== 0 || !Array.isArray(cases)) return {all: true, why: "tools/selftest.mjs --list failed"};
  const all = why => ({all: true, why, total: cases.length});
  if (!changed) return all("the changed files could not be listed");
  /* a gate's code: its entry scripts and what they import, followed transitively */
  const read = f => { try { return readFileSync(f, "utf8"); } catch { return null; } };
  const deps = entries => {
    const seen = new Set(), todo = [...entries];
    while (todo.length) {
      const f = todo.pop();
      if (seen.has(f)) continue;
      const src = read(f);
      if (src === null) continue;
      seen.add(f);
      if (f.endsWith(".mjs"))
        for (const m of src.matchAll(/(?:from|import\()\s*["']\.\/([\w.-]+\.mjs)["']/g)) todo.push(`tools/${m[1]}`);
      if (f.endsWith(".py"))
        for (const m of src.matchAll(/^\s*(?:from|import)\s+(\w+)/gm)) todo.push(`_data/build/${m[1]}.py`);
    }
    return seen;
  };
  const gates = {};
  for (const c of cases) {
    const g = gates[c.gate] ||= {entries: new Set(), pages: new Set()};
    g.entries.add(c.command === "node" ? `tools/${c.gate}.mjs` : c.args[0]);
    if (c.prepare) g.entries.add(c.prepare[0]);
  }
  for (const g of Object.values(gates)) {
    g.code = deps([...g.entries]);
    g.text = [...g.code].map(read).join("\n");
  }
  /* the pages a fixture touches: its own, and the one whose file it injects */
  const casePages = c => [c.page, ...(c.file ? [c.file.match(/^dist\/(.+)\.html$/)?.[1] || c.file.split("/")[0]] : [])];
  const pickGates = new Set(), pickPages = new Set(), why = {};
  for (const f of changed) {
    if (ALL_FIXTURES.some(re => re.test(f))) return all(`${f} changed`);
    const top = f.split("/")[0];
    if (PAGES.includes(top)) { pickPages.add(top); continue; }
    const base = f.split("/").pop(), stem = base.replace(/\.py$/, "");
    const hit = Object.entries(gates).filter(([, g]) => g.code.has(f) || g.text.includes(base) ||
      (base.endsWith(".py") && new RegExp(`\\b${stem}\\b`).test(g.text))).map(([name]) => name);
    hit.forEach(n => { pickGates.add(n); (why[n] ||= f); });
    if (hit.length) continue;
    if (cases.some(c => c.file === f)) { pickPages.add(f); continue; }
    if (f.split("/").length === 1 && NEUTRAL_ROOT.has(f)) continue;
    /* tool code no fixture's gate runs, imports or names cannot change a fixture */
    if (/^tools\/[\w.-]+\.mjs$/.test(f)) continue;
    return all(`${f} changed and no single gate owns it`);
  }
  const chosen = cases.filter(c => pickGates.has(c.gate) || casePages(c).some(p => pickPages.has(p)) ||
                                   (c.file && pickPages.has(c.file)));
  const sel = [...new Set(chosen.map(c => pickGates.has(c.gate) ? c.gate : `${c.gate}/${c.page}`))];
  const reasons = [...[...pickGates].map(g => `${g} (${why[g]})`),
                   ...[...pickPages].map(p => `fixtures on ${p}`)];
  return {all: false, sel, n: cases.filter(c => sel.includes(c.gate) || sel.includes(`${c.gate}/${c.page}`)).length,
          total: cases.length, reasons};
}

/* ONE RENDER FOR BOTH SWEEPS. collide and textsize sweep the same 14 widths of the same
   pages, so tools/sweeps.mjs renders each page x width once and runs both probes on it.
   The first of the pair to come up runs it; each keeps its own row, log and exit code,
   and the second says its time was spent in the first. `node tools/collide.mjs --sweep`
   and `node tools/textsize.mjs --sweep` still run on their own, through the same code. */
const SHARED_SWEEP = new Set(["collide", "textsize"]);
let sweepRun = null;
function sweep(name, pages) {
  let note = "(rendered in the collide row) ";
  if (!sweepRun) {
    note = "";
    const dir = mkdtempSync(join(tmpdir(), "evidence-room-sweeps-"));
    const r = spawnSync("node", ["tools/sweeps.mjs", `--json=${join(dir, "sweeps.json")}`, ...pages], {encoding: "utf8"});
    let res = null;
    try { res = JSON.parse(readFileSync(join(dir, "sweeps.json"), "utf8")); } catch { /* reported below */ }
    rmSync(dir, {recursive: true, force: true});
    sweepRun = {r, res};
  }
  const {r, res} = sweepRun;
  /* no result file means the sweep itself broke: both gates fail with its output */
  if (!res || !res[name]) return {status: 1, stdout: r.stdout, stderr: `${r.stderr || ""}\nsweeps.mjs wrote no ${name} result`};
  const lines = [...res[name].lines];
  lines.push(note + lines.pop());                      // the verdict line all.mjs prints
  return {status: res[name].code, stdout: lines.join("\n") + "\n", stderr: ""};
}

/* how many fixtures this shard runs of a selection ([] is all of them), asked of the self-test */
function shardCount(sel) {
  const r = spawnSync("node", ["tools/selftest.mjs", "--list", ...shardFlag, ...sel], {encoding: "utf8"});
  const total = spawnSync("node", ["tools/selftest.mjs", "--list"], {encoding: "utf8"});
  try { shardCount.total = JSON.parse(total.stdout).length; return JSON.parse(r.stdout).length; }
  catch { fail("tools/selftest.mjs --list failed; cannot size the shard."); }
}
const rows = [];
const t0 = Date.now();
for (const [name, cmd, gateArgv, what, slow] of GATES) {
  const part = partOf(name);
  if (opt.parts && !opt.parts.has(part) && !PREREQ.has(name)) continue;
  const scopedSelftest = name === "selftest" && opt.changed;
  if (fast && slow && !scopedSelftest) { rows.push({name, what, skipped: true, reason: "fast"}); continue; }
  let argvRun = gateArgv, tag = "";
  if (scopedSelftest) {
    const pick = selectFixtures(scope.changed);
    if (pick.all) console.log(`SELF-TESTS: every fixture: ${pick.why}`);
    else console.log(`SELF-TESTS: ${pick.n} of ${pick.total} fixtures` +
                     `${pick.reasons.length ? `: ${pick.reasons.join(", ")}` : ", no gate code or fixture page changed"}`);
    if (!pick.all) {
      /* within a shard, the selection is cut again: count what this shard will run */
      const mine = shardTests ? shardCount(pick.sel) : pick.n;
      tag = `[${mine}/${pick.total} fixtures${shardTests ? `, shard ${opt.shard.k}/${opt.shard.n}` : ""}] `;
      if (!mine) {
        const last = pick.n ? "none of the selected fixtures fall in this shard" : "no fixture's gate, page or file changed";
        rows.push({name, what, skipped: true, reason: "scope", tag, last});
        if (!quiet) console.log(` skip  ${name.padEnd(12)} ${"".padStart(7)}  ${tag}${last}`);
        continue;
      }
      argvRun = [...gateArgv, ...shardFlag, ...pick.sel];
    }
  }
  if (shardTests && name === "selftest" && argvRun === gateArgv) {
    const mine = shardCount([]);
    tag = `[${mine}/${shardCount.total} fixtures, shard ${opt.shard.k}/${opt.shard.n}] `;
    argvRun = [...gateArgv, ...shardFlag];
  }
  if (part === "pages" && narrowed) {
    const spec = PAGE_GATES[name];
    const mine = pagesRun.filter(spec.keep || (() => true));
    const of = PAGES.filter(spec.keep || (() => true)).length;
    tag = `[${mine.length}/${of} pages] `;
    if (!mine.length) {
      rows.push({name, what, skipped: true, reason: "scope", tag,
                 last: shardPages && !scope.scoped ? "no pages in this shard" : "no changed page in scope"});
      if (!quiet) console.log(` skip  ${name.padEnd(12)} ${"".padStart(7)}  ${tag}${rows.at(-1).last}`);
      continue;
    }
    argvRun = [...gateArgv, ...(spec.extra || []), ...mine];
  }
  const t = Date.now();
  const r = SHARED_SWEEP.has(name) ? sweep(name, argvRun.slice(gateArgv.length))
                                   : spawnSync(cmd, argvRun, {encoding: "utf8"});
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
  console.log(`NOT RUN (--fast): ${fastSkipped.map(s => s.name).join(", ")} — width sweeps` +
              `${fastSkipped.some(s => s.name === "selftest") ? " and gate self-tests" : ""}.\n` +
              `These are the checks that found sub-12px text on 14 of 16 pages and ~50 collisions.\n` +
              `A --fast pass is not a clean bill.`);
if (narrowed)
  console.log(`SCOPED: page gates ran on ${pagesRun.length} of ${PAGES.length} pages` +
              `${pagesRun.length ? ` (${pagesRun.join(", ")})` : ""}` +
              `${scope.scoped ? `, the pages changed since ${opt.changed}` : ""}` +
              `${shardPages ? `, shard ${opt.shard.k}/${opt.shard.n}` : ""}.` +
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
