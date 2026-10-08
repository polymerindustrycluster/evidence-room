/* One ready page, separate read-only probes and named results. State-changing probes
 * do not belong here. Each probe gets its own reporter; a crash cannot erase the
 * others' results or be confused with a legitimate finding.
 */
import {readdirSync, realpathSync} from "node:fs";
import {pathToFileURL, fileURLToPath} from "node:url";
import {launch} from "./_browser.mjs";
import {gotoReady} from "./_ready.mjs";

export const isMain = url => {
  try { return realpathSync(fileURLToPath(url)) === realpathSync(process.argv[1]); }
  catch { return false; }
};
export const pageList = names => names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

export async function runChecks(factories, list, {full = false} = {}) {
  if (!list.length) throw new Error("no page bundles to inspect");
  const results = {}, gates = {};
  for (const [name, factory] of Object.entries(factories)) {
    const r = results[name] = {code: 0, lines: [], inspected: 0};
    try { gates[name] = factory(list, {full, log: line => r.lines.push(line)}); }
    catch (e) { r.code = 1; r.lines.push(`UNINSPECTABLE ${name}: ${e.message}`); }
  }
  const b = await launch();
  try {
    for (const n of list) {
      const p = await b.newPage({viewport: {width: 1440, height: 1000}});
      try {
        await gotoReady(p, pathToFileURL(`${process.cwd()}/dist/${n}.html`).href);
        for (const [name, gate] of Object.entries(gates)) {
          try {
            // Detect an accidentally state-changing probe before another probe can
            // inherit its DOM. A new page/context is used for the next page regardless.
            const before = await p.evaluate(() => document.documentElement.outerHTML);
            await gate.check(n, p, b);
            const after = await p.evaluate(() => document.documentElement.outerHTML);
            if (before !== after) throw new Error("read-only probe changed the page DOM");
            results[name].inspected++;
          } catch (e) {
            results[name].code = 1;
            results[name].lines.push(`UNINSPECTABLE ${name}/${n}: ${e.message}`);
            // Do not let a failed/mutating probe contaminate the following probes.
            await gotoReady(p, pathToFileURL(`${process.cwd()}/dist/${n}.html`).href);
          }
        }
      } catch (e) {
        for (const r of Object.values(results)) { r.code = 1; r.lines.push(`UNINSPECTABLE ${n}: ${e.message}`); }
      } finally { await p.close(); }
    }
  } finally { await b.close(); }
  for (const [name, gate] of Object.entries(gates)) {
    const r = results[name];
    try { r.code ||= gate.finish(); }
    catch (e) { r.code = 1; r.lines.push(`UNINSPECTABLE ${name}: ${e.message}`); }
    if (r.inspected !== list.length) {
      r.code = 1;
      r.lines.push(`UNINSPECTABLE ${name}: inspected ${r.inspected}/${list.length} pages`);
    }
  }
  return results;
}

export async function standalone(name, factory) {
  const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const result = (await runChecks({[name]: factory}, pageList(names), {full: !names.length}))[name];
  result.lines.forEach(line => console.log(line));
  return result.code;
}
