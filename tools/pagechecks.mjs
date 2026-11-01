/* Default-state checks sharing one render, with unchanged standalone gate CLIs.
 * node tools/pagechecks.mjs [--json=PATH] [names...]
 */
import {writeFileSync} from "node:fs";
import {runChecks, pageList} from "./_page-runner.mjs";
import {createGate as disclosure} from "./disclosure.mjs";
import {createGate as style} from "./style.mjs";
import {createGate as alttext} from "./alttext.mjs";

const args = process.argv.slice(2);
const names = args.filter(a => !a.startsWith("--"));
const out = await runChecks({disclosure, style, alttext}, pageList(names), {full: !names.length});
for (const [name, result] of Object.entries(out)) {
  console.log(`== ${name}`);
  result.lines.forEach(line => console.log(line));
}
const jsonArg = args.find(a => a.startsWith("--json="));
if (jsonArg) writeFileSync(jsonArg.slice("--json=".length), JSON.stringify(out, null, 2) + "\n");
process.exit(Object.values(out).some(r => r.code !== 0) ? 1 : 0);
