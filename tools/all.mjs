/* THE WHOLE GATE SUITE, ONE COMMAND, ONE EXIT CODE.
 *
 *   node tools/all.mjs [--fast] [--quiet]
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
 */
import {spawnSync} from "child_process";

const args = process.argv.slice(2);
const fast = args.includes("--fast");
const quiet = args.includes("--quiet");

const GATES = [
  ["bundle",      "node",   ["tools/bundle.mjs"],            "regenerates dist/ so every gate reads the same build"],
  ["verify",      "node",   ["tools/verify.mjs"],            "structure, titles, page-level overflow"],
  ["columns",     "node",   ["tools/columns.mjs"],           "one text rail"],
  ["centres",     "node",   ["tools/centres.mjs", "."],      "block centring across widths"],
  ["disclosure",  "node",   ["tools/disclosure.mjs"],        "every page says an AI wrote it, in one wording"],
  ["style",       "node",   ["tools/style.mjs"],             "house style law in rendered prose"],
  ["coldopen",    "node",   ["tools/coldopen.mjs"],          "evidence in the first screen, ratcheted"],
  ["figures",     "node",   ["tools/figures.mjs"],           "cross-page figure registry"],
  ["provenance",  "node",   ["tools/provenance.mjs"],        "the registry matches the page, not only the reverse"],
  ["alttext",     "node",   ["tools/alttext.mjs"],           "every chart carries a description"],
  ["furniture",   "node",   ["tools/furniture.mjs"],        "every number on a chart is said somewhere else on its page"],
  ["caveat",      "node",   ["tools/caveat.mjs"],           "apparatus ink under a chart, ratcheted"],
  ["fonts",       "node",   ["tools/fonts.mjs"],             "every font this site names, this site ships"],
  ["classes",     "node",   ["tools/classes.mjs"],           "every class a page uses resolves to a rule"],
  ["legends",     "node",   ["tools/legends.mjs"],           "the reader gets the key before the data"],
  ["measure",     "node",   ["tools/measure.mjs"],           "running prose holds the measure"],
  ["claims",      "python3", ["_data/build/verify_claims.py"],      "every numeric sentence against its own data"],
  ["series",      "python3", ["_data/build/verify_series.py"],      "the DATA against the world, not against its own prose"],
  ["consistency", "python3", ["_data/build/verify_consistency.py"], "builders, catalog, prose invariants"],
  ["collide",     "node",   ["tools/collide.mjs", "--sweep"],  "overlap and out-of-frame, 14 widths", true],
  ["textsize",    "node",   ["tools/textsize.mjs", "--sweep"], "12px rendered floor, 14 widths", true],
  ["selftest",    "node",   ["tools/selftest.mjs"],            "each gate still fails its own known defect", true],
];

const rows = [];
const t0 = Date.now();
for (const [name, cmd, argv, what, slow] of GATES) {
  if (fast && slow) { rows.push({name, what, skipped: true}); continue; }
  const t = Date.now();
  const r = spawnSync(cmd, argv, {encoding: "utf8"});
  const out = ((r.stdout || "") + (r.stderr || "")).trim().split("\n");
  const last = out.filter(Boolean).pop() || "(no output)";
  rows.push({name, what, code: r.status ?? 1, last: last.replace(/\[\d+m/g, ""),
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
console.log("");
if (skipped.length)
  console.log(`NOT RUN (--fast): ${skipped.map(s => s.name).join(", ")} — the two width sweeps.\n` +
              `These are the checks that found sub-12px text on 14 of 16 pages and ~50 collisions.\n` +
              `A --fast pass is not a clean bill.`);
console.log(bad.length
  ? `SUITE FAILED: ${bad.length} of ${ran.length} gates — ${bad.map(b => b.name).join(", ")}`
  : `SUITE PASSED: ${ran.length} gates in ${((Date.now() - t0) / 1000).toFixed(0)}s` +
    (skipped.length ? ` (${skipped.length} skipped)` : ""));
process.exit(bad.length ? 1 : 0);
