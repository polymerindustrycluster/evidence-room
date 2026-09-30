/* EVERY STRING A PAGE'S SCRIPTS CAN PRINT, read from source without running it.
 *
 * tools/style.mjs reads the rendered page in its default state, so text a script writes
 * only after a click never reached it: cost-scissors wrote "the winning seat" into the
 * seat-selector reading only after a tap, and reinserting it passed (2026-09-30). Driving
 * every control cannot promise to reach every state (hover, keys, combinations, a control
 * the sweep does not know); the source holds all of them at once. So this lexes each
 * script a page loads and returns its string and template literals, cooked (escapes
 * decoded), with comments and regular expressions left out.
 *
 * What it cannot see it counts rather than skips: each ${...} in a template is a HOLE,
 * text known only at run time (data values, formatted numbers), and the caller reports
 * the count. A script it cannot lex (unterminated string, comment or template) throws,
 * so a gate that relies on it fails instead of reading an empty list as clean.
 */
import {readFileSync, existsSync} from "fs";
import {join} from "path";

export const HOLE = "\u0000";

const KEYWORDS = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
  "throw", "case", "do", "else", "yield", "await"]);
const cook = s => s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r\n|[\s\S])/g, (_, e) => {
  if (e[0] === "u") return String.fromCodePoint(parseInt(e[1] === "{" ? e.slice(2, -1) : e.slice(1), 16));
  if (e[0] === "x") return String.fromCharCode(parseInt(e.slice(1), 16));
  return {n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0", "\n": "", "\r\n": ""}[e] ?? e;
});

/* the literals in `src`, each {text, line, holes, dev}; `name` labels a lex error. `dev` marks
   a literal inside the arguments of console.* or an Error constructor: a message for the
   developer, which a caller may hold to different rules than prose */
const DEV = /^console\.|(^|\.)\w*Error$/;
export function literals(src, name) {
  const out = [];
  let i = 0;
  const lineAt = k => src.slice(0, k).split("\n").length;
  const fail = (what, at) => { throw new Error(`${name}:${lineAt(at)}: unterminated ${what}`); };
  /* regex or division: a slash starts a regex after an operator, an opening bracket, a
     keyword, or nothing; after a name, a number or a closing bracket it divides */
  let prev = "", callee = "";
  const calls = [];
  const dev = () => calls.some(n => DEV.test(n));
  const code = inTemplate => {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) i = src.length; continue; }
      if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); if (e < 0) fail("comment", i); i = e + 2; continue; }
      if (c === "'" || c === '"') {
        const s = i;
        for (i++; src[i] !== c; i++) {
          if (i >= src.length || src[i] === "\n") fail("string", s);
          if (src[i] === "\\") i++;
        }
        out.push({text: cook(src.slice(s + 1, i)), line: lineAt(s), holes: 0, dev: dev()});
        i++; prev = "v"; continue;
      }
      if (c === "`") { template(); prev = "v"; continue; }
      if (c === "/" && (prev === "" || prev === "p" || KEYWORDS.has(prev))) {
        const s = i;
        for (let cls = false, j = i + 1; ; j++) {
          if (j >= src.length || src[j] === "\n") fail("regular expression", s);
          if (src[j] === "\\") { j++; continue; }
          if (src[j] === "[") cls = true; else if (src[j] === "]") cls = false;
          else if (src[j] === "/" && !cls) { i = j + 1; break; }
        }
        while (/[a-z]/i.test(src[i] || "")) i++;
        prev = "v"; continue;
      }
      const w = /^[A-Za-z_$\d.][\w$.]*/.exec(src.slice(i, i + 80));
      if (w) { i += w[0].length; prev = KEYWORDS.has(w[0]) ? w[0] : "v"; callee = w[0]; continue; }
      if (c === "(") calls.push(callee);
      if (c === ")") calls.pop();
      callee = "";
      if (c === "{") depth++;
      if (c === "}") { if (inTemplate && depth === 0) { i++; return; } depth--; }
      prev = c === ")" || c === "]" || c === "}" ? "v" : "p";
      i++;
    }
    if (inTemplate) fail("template substitution", i);
  };
  const template = () => {
    const s = i, d = dev();
    let raw = "", holes = 0;
    for (i++; src[i] !== "`"; i++) {
      if (i >= src.length) fail("template", s);
      if (src[i] === "\\") { raw += src[i] + src[i + 1]; i++; continue; }
      if (src[i] === "$" && src[i + 1] === "{") {
        i += 2; code(true); i--;
        raw += HOLE; holes++;
        continue;
      }
      raw += src[i];
    }
    i++;
    out.push({text: cook(raw), line: lineAt(s), holes, dev: d});
  };
  code(false);
  return out;
}

/* Every script a page loads, read from its source: each <script src> in index.html, and
   each inline <script>. Returns [{file, lits}]. A src that does not resolve throws. */
export function pageScripts(page) {
  const html = readFileSync(join(page, "index.html"), "utf-8");
  const found = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(m[1]);
    if (src) {
      const f = join(page, src[1]);
      if (!existsSync(f)) throw new Error(`${page}/index.html loads ${src[1]}, which does not exist`);
      found.push({file: f, lits: literals(readFileSync(f, "utf-8"), f)});
    } else if (m[2].trim()) {
      found.push({file: `${page}/index.html <script>`, lits: literals(m[2], `${page}/index.html`)});
    }
  }
  return found;
}

/* A literal as a reader would meet it once written into the page: tags gone, entities
   decoded. `apart` puts a space where a tag was; without it a tag joins what surrounds
   it, so "Jo<b>int</b> work" is one phrase in one reading and a block break in the other. */
const ENT = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘",
  ldquo: "“", rdquo: "”", mdash: "—", ndash: "–", minus: "−", times: "×", hellip: "…", middot: "·"};
export const asText = (s, apart) => s
  .replace(/^[^<>]*["']\s*>/, "").replace(/<[a-zA-Z/!][^>]*$/, "")   /* halves of a tag split across literals */
  .replace(/<[a-zA-Z/!][^>]*>/g, apart ? " " : "")
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === "#"
    ? String.fromCodePoint(parseInt(e[1] === "x" || e[1] === "X" ? e.slice(2) : e.slice(1), e[1] === "x" || e[1] === "X" ? 16 : 10))
    : ENT[e.toLowerCase()] ?? m);
