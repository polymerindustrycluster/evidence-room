/* BOTH 14-WIDTH SWEEPS, ONE RENDER EACH.
 *
 *   node tools/sweeps.mjs [--json=PATH] [names...]
 *
 * Runs exactly what `node tools/collide.mjs --sweep` and `node tools/textsize.mjs --sweep`
 * run, with the same probes, widths and per-page lines, but renders each page x width
 * once and hands it to both (tools/_sweep.mjs). The two gates keep their own names and
 * verdicts: the output is collide's report, then textsize's, then one line per gate, and
 * the exit code fails if either does. --json writes {collide, textsize} as
 * {code, lines} so tools/all.mjs can file each under its own row and log.
 */
import {readdirSync, writeFileSync} from "fs";
import {render} from "./_sweep.mjs";
import * as collide from "./collide.mjs";
import * as textsize from "./textsize.mjs";

const args = process.argv.slice(2);
const jsonArg = args.find(a => a.startsWith("--json="));
const names = args.filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));
if (collide.SWEEP.join() !== textsize.SWEEP.join()) {
  console.log("collide and textsize no longer sweep the same widths; run them separately");
  process.exit(2);
}

const gates = {collide: {mod: collide, bad: 0, lines: []}, textsize: {mod: textsize, bad: 0, lines: []}};
await render(list, collide.SWEEP, {collide: collide.probe, textsize: textsize.probe}, (n, per) => {
  for (const [k, g] of Object.entries(gates)) {
    const v = g.mod.report(n, per[k], true);          // true: collide's --sweep format
    if (v.bad) g.bad++;
    g.lines.push(...v.lines);
  }
});

const out = {};
for (const [k, g] of Object.entries(gates)) {
  g.lines.push(...g.mod.verdict(g.bad).split("\n"));
  out[k] = {code: g.bad ? 1 : 0, lines: g.lines};
  console.log(`== ${k} --sweep`);
  g.lines.forEach(l => console.log(l));
  console.log("");
}
for (const [k, g] of Object.entries(gates))
  console.log(`${k.padEnd(9)} ${g.bad ? "FAIL" : "ok  "}  ${g.lines.at(-1)}`);
if (jsonArg) writeFileSync(jsonArg.slice("--json=".length), JSON.stringify(out, null, 2) + "\n");
process.exit(Object.values(gates).some(g => g.bad) ? 1 : 0);
