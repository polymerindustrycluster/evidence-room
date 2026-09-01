/* One resolver for Playwright's chromium, shared by every tool.
 *
 * Nine tools each carried their own copy of
 *   createRequire(import.meta.url)(process.env.NODE_PATH.split(";")[0] + "/playwright")
 * which works on exactly one machine: it assumes NODE_PATH is set, is Windows-`;`-
 * separated, and points at a global install. On a Linux CI runner NODE_PATH is unset and
 * that line throws before any gate runs — found 2026-08-17 while wiring the public
 * Pages deploy, where it would have failed the very first push.
 *
 * Order: an ordinary local dependency first (what CI installs via `npm ci`), then the
 * global-install fallback the Windows machine relies on. Same result on both.
 */
import {createRequire} from "node:module";

const req = createRequire(import.meta.url);

function loadPlaywright() {
  try {
    return req("playwright");
  } catch (local) {
    const np = process.env.NODE_PATH;
    if (np) {
      for (const dir of np.split(/[;:]/).filter(Boolean)) {
        try { return req(`${dir}/playwright`); } catch { /* try the next entry */ }
      }
    }
    throw new Error(
      "playwright not found. Run `npm ci` here (it is a devDependency), or install it " +
      "globally and set NODE_PATH. Original error: " + local.message
    );
  }
}

export const {chromium} = loadPlaywright();
