/* Readiness for the room's bundled pages, installed BEFORE their scripts run.
 * Initial work uses timers, animation frames, fetch/body reads and web fonts. Wait for
 * those, CSS animations and two stable rendering frames, not an arbitrary sleep.
 * This is not a universal detector of application intent: a new async primitive such
 * as a worker or IndexedDB needs tracking here before a page relies on it at startup.
 * Interaction/late-font tests deliberately keep their own timing and fresh pages.
 */
function trackBootstrap() {
  const pending = new Map(), errors = [];
  const nativeTimeout = window.setTimeout.bind(window);
  const nativeClear = window.clearTimeout.bind(window);
  const nativeFrame = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  let sequence = 0, generation = 0;
  const begin = label => { const id = ++sequence; pending.set(id, label); generation++; return id; };
  const end = id => { pending.delete(id); generation++; };
  const timers = new Map(), frames = new Map();
  window.setTimeout = (fn, delay, ...args) => {
    const token = begin(`timer ${delay || 0}ms`);
    const id = nativeTimeout(() => {
      timers.delete(id);
      try { typeof fn === "function" ? fn(...args) : (0, eval)(String(fn)); }
      finally { end(token); }
    }, delay);
    timers.set(id, token); return id;
  };
  window.clearTimeout = id => {
    if (timers.has(id)) { end(timers.get(id)); timers.delete(id); }
    nativeClear(id);
  };
  window.requestAnimationFrame = fn => {
    const token = begin("animation frame");
    const id = nativeFrame(t => {
      frames.delete(id);
      try { fn(t); } finally { end(token); }
    });
    frames.set(id, token); return id;
  };
  window.cancelAnimationFrame = id => {
    if (frames.has(id)) { end(frames.get(id)); frames.delete(id); }
    nativeCancel(id);
  };
  const fetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const token = begin(`fetch ${String(args[0]).slice(0, 120)}`);
    try {
      const response = await fetch(...args);
      if (!response.ok) errors.push(`fetch HTTP ${response.status}: ${response.url}`);
      // Headers alone are not data-ready. A clone drains the complete body, without
      // consuming the response the page owns or delaying delivery of its headers.
      response.clone().arrayBuffer().catch(e => errors.push(String(e))).finally(() => end(token));
      return response;
    } catch (e) { errors.push(String(e)); end(token); throw e; }
  };
  for (const method of ["json", "text", "arrayBuffer", "blob", "formData"]) {
    const original = Response.prototype[method];
    Response.prototype[method] = async function (...args) {
      const token = begin(`response.${method}`);
      try { return await original.apply(this, args); }
      finally { end(token); }
    };
  }
  addEventListener("error", e => errors.push(e.message || `resource failed: ${e.target?.src || e.target?.href || "unknown"}`), true);
  addEventListener("unhandledrejection", e => errors.push(String(e.reason)));
  new MutationObserver(() => generation++).observe(document, {subtree: true, childList: true, attributes: true, characterData: true});
  const inspect = () => ({
    pending: [...pending.values()],
    errors: [...errors, ...[...document.fonts].filter(f => f.status === "error").map(f => `font failed: ${f.family}`)],
    fonts: document.fonts.status,
    animations: document.getAnimations().filter(a => a.playState === "running" || a.pending).length,
    busy: document.querySelectorAll('[aria-busy="true"]').length,
    generation,
    layout: [document.documentElement.scrollWidth, document.documentElement.scrollHeight].join(","),
  });
  Object.defineProperty(window, "__evidenceReady", {value: {
    inspect,
    wait: timeout => new Promise((resolve, reject) => {
      let stable = 0, last = null, frame;
      const timer = nativeTimeout(() => {
        nativeCancel(frame);
        reject(new Error(`render readiness timed out: ${JSON.stringify(inspect())}`));
      }, timeout);
      const tick = () => {
        const state = inspect();
        if (state.errors.length) {
          nativeClear(timer); reject(new Error(`render readiness failed: ${state.errors.join("; ")}`)); return;
        }
        const idle = !state.pending.length && state.fonts === "loaded" && !state.animations && !state.busy;
        const signature = `${state.generation}:${state.layout}`;
        stable = idle && signature === last ? stable + 1 : 0;
        last = signature;
        if (stable >= 2) { nativeClear(timer); resolve(state); }
        else frame = nativeFrame(tick);
      };
      frame = nativeFrame(tick);
    }),
  }});
}

const instrumented = new WeakSet();
export async function gotoReady(page, url, {timeout = 10000} = {}) {
  if (!instrumented.has(page)) {
    await page.addInitScript(trackBootstrap);
    instrumented.add(page);
  }
  const failures = [];
  const failed = request => failures.push(`${request.url()}: ${request.failure()?.errorText}`);
  page.on("requestfailed", failed);
  try {
    await page.goto(url, {waitUntil: "load", timeout});
    const state = await page.evaluate(ms => {
      if (!window.__evidenceReady) throw new Error("render readiness tracker missing");
      return window.__evidenceReady.wait(ms);
    }, timeout);
    if (failures.length) throw new Error(`requested resources failed: ${failures.join("; ")}`);
    return state;
  } catch (e) {
    throw new Error(`UNINSPECTABLE ${url}: ${e.message}`, {cause: e});
  } finally { page.off("requestfailed", failed); }
}
