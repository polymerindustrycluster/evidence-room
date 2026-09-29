/* THE TEXT A BROWSER RENDERS, DUMPED FOR THE NOUN GATE.
 *
 *   node tools/pagetext.mjs [--dist=DIR] [names...]
 *
 * _data/build/verify_nouns.py binds a printed figure to the noun beside it, so it has to
 * read the page's prose exactly as a reader meets it. It used to read index.html with a
 * regex and a list of forms the regex refused, and seven review rounds on PR #25 each found
 * another tokenizer state it misread: text inside an SVG <script>, RCDATA and RAWTEXT
 * bodies (<textarea>, <title>, <xmp>, <iframe>...), an unclosed "<!--", a ">" inside a
 * quoted attribute. Every fix was a new approximation of the HTML parser, so this asks the
 * parser: Chromium loads each bundle in dist/ through the same Playwright launcher style.mjs
 * uses, and the text is read from the DOM it builds.
 *
 * SCRIPTING IS OFF. The gate binds the page's STATIC prose, as it always has. With scripts
 * running, the text also holds every chart label and table cell, and on 2026-09-29 five of
 * the seven bindings failed on those alone (a "17,725" in a data table has no noun beside
 * it and needs none). Whether the sentences a page's JavaScript writes should be bound too
 * is a separate decision; this gate does not make it silently. Off also means no settle
 * time and no flapping: the parse is deterministic.
 *
 * WHAT IS READ. Every text node under <body>, in document order, joined with a space
 * (a tag boundary is a word boundary, as it was for the regex), whitespace collapsed. A
 * TreeWalker, not innerText, for the reason style.mjs gives: innerText skips collapsed and
 * hidden content, and a <details> table twin is still on the page. Skipped: text that a
 * browser never renders as prose (script and style bodies, and the raw fallback text of
 * <iframe>, <noembed> and <noframes>). <noscript> is markup with scripting off, and read.
 * The <title> is in <head>, not on the page, so it is not read. Attributes, comments
 * and CSS generated content are not text nodes, so they never enter.
 *
 * FRESHNESS. Each entry records the sha256 of the bundle it was read from. verify_nouns.py
 * recomputes it and FAILS a page whose dump is missing or was read from a different
 * bundle; it never falls back to reading HTML itself. tools/all.mjs runs this after
 * bundle and before nouns.
 *
 * Output: DIR/.pagetext.json, {page: {"sha256": ..., "text": ...}}, beside
 * dist/.inputs.json. Naming pages updates only those entries.
 */
import {readdirSync, readFileSync, writeFileSync, existsSync} from "fs";
import {createHash} from "crypto";
import {resolve, join, dirname} from "path";
import {fileURLToPath, pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const distArg = args.find(a => a.startsWith("--dist="));
const DIST = distArg ? resolve(distArg.slice("--dist=".length)) : join(WEB, "dist");
const names = args.filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync(DIST).filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));
const OUT = join(DIST, ".pagetext.json");

const dump = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
for (const page of Object.keys(dump))
  if (!existsSync(join(DIST, `${page}.html`))) delete dump[page];

const b = await chromium.launch();
let failed = 0;
for (const n of list) {
  const file = join(DIST, `${n}.html`);
  if (!existsSync(file)) { console.log(`${n.padEnd(18)} FAIL  no ${file}`); failed++; delete dump[n]; continue; }
  const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
  const p = await b.newPage({viewport: {width: 1440, height: 1000}, javaScriptEnabled: false});
  await p.goto(pathToFileURL(file).href);
  const text = await p.evaluate(() => {
    const SKIP = "script,style,iframe,noembed,noframes";
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const out = [];
    let t;
    while ((t = w.nextNode())) {
      const el = t.parentElement;
      if (el && el.closest(SKIP)) continue;
      out.push(t.textContent);
    }
    return out.join(" ").replace(/[\s ]+/g, " ").trim();
  });
  await p.close();
  dump[n] = {sha256, text};
  console.log(`${n.padEnd(18)} ${String(text.length).padStart(7)} chars`);
}
await b.close();
writeFileSync(OUT, JSON.stringify(dump, null, 1) + "\n", "utf8");
console.log(failed ? `\n${failed} page(s) had no bundle; their text is not in ${OUT}`
                   : `\nrendered text for ${list.length} page(s) in ${OUT}`);
process.exit(failed ? 1 : 0);
