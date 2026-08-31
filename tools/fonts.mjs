/* IS EVERY FONT THIS SITE NAMES ACTUALLY SHIPPED WITH IT?
 *
 *   node tools/fonts.mjs
 *
 * On 2026-08-31 the shared stylesheet declared
 *   --sans:Lato,"Segoe UI",-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif
 * and contained zero @font-face rules and no font-host link. The site NAMED Lato and
 * shipped nothing. Readers with Lato installed saw the design; readers without it fell
 * through to system fonts with different metrics and no true 900 weight, so headings read
 * as insufficiently bold and text set to the wrong measure. cost-scissors/app.js:617
 * spaces chart labels at "9.6 user units per uppercase Lato character", so the charts were
 * calibrated to a font the reader might not have.
 *
 * Sixteen gates passed throughout, and could not have failed: every one of them measures
 * geometry inside a browser that has whatever fonts the RUNNER has, and the authoring
 * machines had Lato. This is the silent-pass shape the house rule warns about — a board
 * that is green because the check cannot see the defect, not because the defect is absent.
 *
 * WHAT THIS DOES: parses every font-family declaration in the shipped CSS, takes each
 * NAMED family (quoted or bare, ignoring generics and the -apple-system/BlinkMacSystemFont
 * system keywords), and asserts that family is either
 *   1. declared in an @font-face in the same stylesheet whose src resolves to a file that
 *      EXISTS on disk, or
 *   2. a documented system font appearing in FALLBACK position, never first.
 * The first named family is load-bearing: it is what the design was set in. A fallback
 * that is never reached is a fallback; a FIRST family nobody ships is a bug.
 *
 * WHAT THIS DOES NOT DO: it cannot tell you the font is the RIGHT one, that the weights
 * you ship are the weights you use, or that a woff2 is not corrupt. It checks the promise,
 * not the typography. It also does not read fonts referenced only from JS at runtime.
 */
import {readFileSync, existsSync, readdirSync} from "fs";
import {execFileSync} from "child_process";
import {resolve, dirname, join} from "path";
import {fileURLToPath} from "url";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GENERIC = new Set(["sans-serif","serif","monospace","cursive","fantasy","system-ui",
  "ui-sans-serif","ui-serif","ui-monospace","ui-rounded","inherit","initial","unset","revert"]);
/* System keywords resolve to whatever the OS provides. Legitimate in FALLBACK position. */
const SYSTEM = new Set(["-apple-system","blinkmacsystemfont","segoe ui","helvetica","arial",
  "helvetica neue","roboto","noto sans","liberation sans","dejavu sans","consolas",
  "menlo","monaco","courier new","cambria","georgia","times new roman"]);

/* A font file that exists locally but is gitignored passes every local check and 404s in
   production. Caught by hand on 2026-08-31: .gitignore carried a wildcard fonts-directory
   rule (star, slash, "fonts", slash — not written literally here, because that sequence
   closes a block comment and broke this file once already) as a licensing
   firewall for Aptos, so the newly self-hosted Lato would have shipped as six broken
   requests — strictly worse than naming a font and shipping nothing. On-disk is not the
   question; will-it-ship is. */
const isIgnored = p => {
  try { execFileSync("git", ["check-ignore", "-q", p], {cwd: WEB, stdio: "ignore"}); return true; }
  catch { return false; }
};

const sheets = readdirSync(join(WEB, "_shared")).filter(f => f.endsWith(".css"))
  .map(f => ({name: `_shared/${f}`, path: join(WEB, "_shared", f)}));

let fail = 0, warn = 0, checked = 0;
for (const sheet of sheets) {
  const css = readFileSync(sheet.path, "utf-8");

  /* families this stylesheet SHIPS: @font-face whose src file exists on disk */
  const shipped = new Map();
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1];
    const fam = /font-family:\s*(['"]?)([^;'"]+)\1/.exec(body);
    const src = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(body);
    if (!fam) continue;
    const key = fam[2].trim().toLowerCase();
    const rec = shipped.get(key) || {ok: 0, missing: []};
    if (src) {
      const p = src[1].startsWith("http") ? null : join(dirname(sheet.path), src[1]);
      if (p === null) rec.missing.push(`${src[1]} (REMOTE — not shipped with the site)`);
      else if (!existsSync(p)) rec.missing.push(src[1]);
      else if (isIgnored(p)) rec.missing.push(`${src[1]} (on disk but GITIGNORED — it would not ship)`);
      else rec.ok++;
    }
    shipped.set(key, rec);
  }

  /* every family NAMED in a font-family or a custom property */
  const stacks = [];
  for (const m of css.matchAll(/(?:font-family|--[\w-]*(?:sans|serif|mono|font)[\w-]*)\s*:\s*([^;}]+)/g)) {
    if (/@font-face/.test(css.slice(Math.max(0, m.index - 400), m.index))) {
      const seg = css.slice(Math.max(0, m.index - 400), m.index);
      if (seg.lastIndexOf("@font-face") > seg.lastIndexOf("}")) continue;  // inside a face
    }
    stacks.push({raw: m[1].trim(), index: m.index});
  }

  for (const st of stacks) {
    if (st.raw.startsWith("var(")) continue;
    const fams = st.raw.split(",").map(s => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
    if (!fams.length) continue;
    checked++;
    fams.forEach((fam, i) => {
      const key = fam.toLowerCase();
      if (GENERIC.has(key) || key.startsWith("var(")) return;
      const rec = shipped.get(key);
      const line = css.slice(0, st.index).split("\n").length;
      if (rec && rec.ok && !rec.missing.length) return;                       // shipped, files present
      if (rec && rec.missing.length) {
        console.log(`  \x1b[31mBROKEN-FACE\x1b[0m ${sheet.name}:${line}  "${fam}" is declared @font-face but its file is absent: ${rec.missing.join(", ")}`);
        fail++; return;
      }
      if (SYSTEM.has(key)) {
        if (i === 0) {
          console.log(`  \x1b[31mSYSTEM-FIRST\x1b[0m ${sheet.name}:${line}  "${fam}" is a system font in FIRST position — the design depends on the reader's OS having it`);
          fail++;
        }
        return;                                                              // fallback position: fine
      }
      if (i === 0) {
        console.log(`  \x1b[31mNOT-SHIPPED\x1b[0m ${sheet.name}:${line}  "${fam}" is the first family in its stack and this site does not ship it (no @font-face). Readers without it get another font.`);
        fail++;
      } else {
        console.log(`  \x1b[33mUNSHIPPED-FALLBACK\x1b[0m ${sheet.name}:${line}  "${fam}" is named at position ${i + 1} and is neither shipped nor a known system font`);
        warn++;
      }
    });
  }
}

console.log();
if (fail) {
  console.log(`\x1b[31mfonts: ${fail} unshipped or broken family reference(s)\x1b[0m across ${checked} stack(s).`);
  console.log("Ship the font (@font-face + the file), or make the stack honest about what readers will actually get.");
  process.exit(1);
}
console.log(`\x1b[32mfonts: clean\x1b[0m  (${checked} stacks${warn ? `, ${warn} fallback warning(s)` : ""})`);
