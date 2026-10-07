/* One resolver and ONE LAUNCHER for Playwright's chromium, shared by every tool.
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

const {chromium} = loadPlaywright();

/* SAME PIXELS ON EVERY PLATFORM (ER-021, 2026-10-06).
 *
 * The geometry gates measured macOS 20 to 60px shorter than the Linux CI runner above the
 * first chart (coldopen read churn 1701 on macOS and 1756 on Linux), so a local run could
 * not predict CI. The cause is FreeType hinting: on Linux, Chromium hints Lato to the pixel
 * grid and rounds each glyph's advance, which made a 17px test line 524px wide there against
 * 516.89px on macOS (CoreText never hints). Over a 700px measure that is enough to move a
 * word to the next line, and a line is ~30px of page.
 *
 * --font-render-hinting=none turns hinting off, which also gives Linux fractional glyph
 * positions. Measured 2026-10-06 with Playwright 1.60.0 (macOS host against the
 * mcr.microsoft.com/playwright:v1.60.0-noble image): the test line becomes 516.906px, and
 * every page's first-chart top is identical on both platforms. macOS readings do not move
 * at all, so the flag changes the Linux basis only.
 *
 * Tried and left out, because they changed no measurement on either platform:
 * --disable-font-subpixel-positioning, --disable-lcd-text, --force-device-scale-factor=1
 * (headless already renders at scale 1).
 *
 * WHAT THIS DOES NOT FIX: text the bundled Lato does not cover falls back to the host's
 * fonts. That is every ui-monospace run (Courier or Menlo on macOS, a CJK mono on the
 * Playwright image) and the odd glyph outside Lato's unicode-range. It moves page heights
 * below the fold on sources and corrections by up to 250px; it moves no first-chart top.
 *
 * Every tool launches through launch(). tools/launchers.mjs fails the build on any tool
 * that reaches Playwright another way, so a new gate cannot quietly measure on the old basis.
 */
export const DETERMINISTIC_ARGS = Object.freeze(["--font-render-hinting=none"]);

export function launch(options = {}) {
  return chromium.launch({...options, args: [...DETERMINISTIC_ARGS, ...(options.args || [])]});
}
