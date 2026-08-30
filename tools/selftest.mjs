/* DOES EACH GATE ACTUALLY CATCH THE DEFECT IT EXISTS FOR?
 *
 *   node tools/selftest.mjs [gate...]
 *
 * A green board is worth exactly as much as the gates behind it, and during the
 * 2026-08 rebuild six of this project's own checks turned out to be unable to fail on
 * the thing they were written for:
 *
 *   textsize   printed "svg-min —" and PASSED a page whose chart had collapsed to zero
 *              width. 231 labels unmeasured, by the one check whose job was chart text.
 *   collide    tested a single width; every collision found by hand was invisible to it.
 *              Its out-of-frame check was vertical-only while its header claimed both.
 *              It printed three findings per width on a page that had twelve.
 *   disclosure did not exist, and half the site had lost its AI credit to a stray regex.
 *   coldopen   did not exist, and 15 of 16 first charts sat below the fold.
 *   figures    did not exist, and one page stated a disbursement its sibling called
 *              unknowable.
 *
 * Each was found by hand, by injecting the defect and watching the gate stay quiet. This
 * makes that ritual permanent: every injection below reproduces a defect that ACTUALLY
 * SHIPPED here, and a gate that cannot fail its own fixture is reported as untrustworthy
 * whatever the board says.
 *
 * Injections are applied to a COPY of a dist artifact and reverted in a finally block. A
 * crash mid-run leaves .selftest-backup files; delete them and re-bundle.
 */
import {readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync} from "fs";
import {spawnSync} from "child_process";

const CASES = [
  {gate: "textsize", page: "laborshed", args: ["--sweep", "laborshed"],
   defect: "a chart collapsed to zero width, so its text cannot be measured at all",
   inject: s => s.replace("</head>", "<style>.chart svg{width:0 !important}</style></head>")},

  {gate: "collide", page: "peers", args: ["peers"],
   defect: "bar rows drawn down through their own axis (the height-arithmetic bug)",
   inject: s => s.replace("</head>", "<style>.chart svg rect{transform:translateY(30px)}</style></head>")},

  {gate: "collide", page: "scorecard", args: ["--sweep", "scorecard"],
   defect: "a row label clipped off the left edge of a panning chart, unreachable",
   /* Shifts the chart left INSIDE its scroll box so its leftmost ink falls outside the
      container. The first version removed a `.chart` bleed instead, and went stale twice
      over: that bleed was reverted for breaking the text rail, and the overhang it
      compensated for was later fixed at the chart's own margin. The harness reported it
      BROKEN rather than letting a dead fixture vouch for a live gate. */
   inject: s => s.replace("</head>", "<style>@media(min-width:761px) and (max-width:1099px)" +
     "{.chart svg{margin-left:-30px !important}}</style></head>")},

  {gate: "disclosure", page: "churn", args: ["churn"],
   defect: "a byline crediting a person for analysis a model produced",
   inject: s => s.replace(/Analysis and graphics by Claude \(Anthropic\)/,
     "Analysis and graphics J. Swanson")},

  {gate: "disclosure", page: "occupations", args: ["occupations"],
   defect: "licensed data used without the trademark symbol or a link to the licence",
   inject: s => s.replace("creativecommons.org/licenses/by/4.0/", "example.invalid/none")
                 .replace(/O\*NET(\u00ae|®) is a trademark/, "O*NET is a trademark")},

  {gate: "coldopen", page: "churn", args: ["churn"],
   defect: "a page whose first chart sinks below its recorded budget",
   inject: s => s.replace("</head>", "<style>.hero .wrap{padding-bottom:400px}</style></head>")},

  {gate: "style", page: "revisions", args: ["revisions"],
   defect: "an em-dash in published prose, which the house style law forbids",
   inject: s => s.replace("<body>", '<body><p>A banned em-dash \u2014 here.</p>')},

  {gate: "figures", page: "cluster-health", args: ["cluster-health"],
   defect: "a page stating an amount for a quantity the public record cannot show",
   /* Anchored on <body> rather than a page-specific class: the first draft keyed on
      `<p class="stand">` and the fixture went stale the moment that page was restructured,
      which the harness caught and reported as stale rather than as a passing gate. */
   inject: s => s.replace("<body>", '<body><p>The award is signed, none of it spent.</p>')},
];

const only = process.argv.slice(2).filter(a => !a.startsWith("--"));
const run = (gate, args) => spawnSync("node", [`tools/${gate}.mjs`, ...args],
  {encoding: "utf8"}).status ?? 1;

let trusted = 0, broken = [];
for (const c of CASES) {
  if (only.length && !only.includes(c.gate)) continue;
  const f = `dist/${c.page}.html`, bak = `${f}.selftest-backup`;
  if (!existsSync(f)) { console.log(`SKIP  ${c.gate} — ${f} missing, run bundle first`); continue; }
  copyFileSync(f, bak);
  let before, after;
  try {
    before = run(c.gate, c.args);                       // must be clean to start
    const src = readFileSync(bak, "utf8");
    const hurt = c.inject(src);
    if (hurt === src) throw new Error("injection changed nothing — the fixture is stale");
    writeFileSync(f, hurt);
    after = run(c.gate, c.args);                        // must now fail
  } finally {
    copyFileSync(bak, f);
    unlinkSync(bak);
  }
  const ok = before === 0 && after !== 0;
  if (ok) trusted++; else broken.push(c);
  console.log(`${ok ? "  ok  " : "BROKEN"} ${c.gate.padEnd(11)} ${c.page.padEnd(15)} ` +
    `clean=${before === 0 ? "pass" : "FAIL"} injected=${after !== 0 ? "FAIL" : "pass"}  ${c.defect}`);
}

console.log("");
if (broken.length) {
  console.log(`${broken.length} gate fixture(s) did not behave. A gate that cannot fail on its`);
  console.log(`own defect is not evidence, and every green board it signs is worth less:`);
  broken.forEach(b => console.log(`  ${b.gate} / ${b.page}: ${b.defect}`));
} else {
  console.log(`${trusted} gate fixture(s) verified: each stays quiet on a clean page and fails`);
  console.log(`on the exact defect that motivated it.`);
}
process.exit(broken.length ? 1 : 0);
