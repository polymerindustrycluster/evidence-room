import test, {before, after} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createServer} from "node:http";
import {spawnSync} from "node:child_process";
import {launch} from "./_browser.mjs";
import {gotoReady} from "./_ready.mjs";
import {runChecks} from "./_page-runner.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });
const html = text => `data:text/html,${encodeURIComponent(text)}`;
async function withPage(fn) {
  const page = await browser.newPage();
  try { await fn(page); } finally { await page.close(); }
}

test("readiness waits past the old sleep for timer → frame → timer work", async () => {
  await withPage(async p => {
    await gotoReady(p, html('<p>initial</p><script>setTimeout(() => requestAnimationFrame(() => setTimeout(() => document.querySelector("p").textContent = "late defect", 20)), 950)</script>'));
    assert.equal(await p.locator("p").textContent(), "late defect");
  });
});

test("cancelled timers/frames do not leave phantom work; re-navigation works", async () => {
  await withPage(async p => {
    const url = html('<p>ready</p><script>clearTimeout(setTimeout(()=>{}, 60000)); cancelAnimationFrame(requestAnimationFrame(()=>{}));</script>');
    await gotoReady(p, url, {timeout: 2000});
    await gotoReady(p, url, {timeout: 2000});
  });
});

test("fetch headers are not complete data; wait for the response body", async () => {
  const server = createServer((req, res) => {
    if (req.url === "/body") {
      res.writeHead(200, {"Content-Type": "application/json"});
      res.write('{"value":');
      setTimeout(() => res.end('"body ready"}'), 200);
    } else res.end('<p>pending</p><script>fetch("/body").then(r=>r.json()).then(d=>document.querySelector("p").textContent=d.value)</script>');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await withPage(async p => {
      await gotoReady(p, `http://127.0.0.1:${server.address().port}/`);
      assert.equal(await p.locator("p").textContent(), "body ready");
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
});

for (const [name, script, expected] of [
  ["stuck timer", '<script>setTimeout(()=>{},60000)</script>', /timed out.*timer 60000ms/],
  ["busy page", '<div aria-busy="true">loading</div>', /timed out.*busy/],
  ["infinite animation", '<style>@keyframes spin {to{transform:rotate(360deg)}} p{animation:spin 1s infinite}</style><p>busy</p>', /timed out.*animations/],
  ["script exception", '<script>throw new Error("boot failed")</script>', /readiness failed.*boot failed/],
  ["unhandled rejection", '<script>Promise.reject(new Error("data failed"))</script>', /readiness failed.*data failed/],
  ["failed font", '<script>const f=new FontFace("broken", "url(data:font/woff2;base64,AAAA)");document.fonts.add(f);f.load().catch(()=>{});</script>', /font failed/],
]) test(`readiness fails closed on ${name}`, async () => {
  await withPage(p => assert.rejects(gotoReady(p, html(script), {timeout: 500}), expected));
});

test("font-ready callbacks and CSS animations finish before measurement", async () => {
  await withPage(async p => {
    await gotoReady(p, html('<style>@keyframes move {from{margin-left:0}to{margin-left:30px}} p{animation:move .2s forwards}</style><p>pending</p><script>document.fonts.ready.then(()=>requestAnimationFrame(()=>document.querySelector("p").textContent="fonts ready"))</script>'));
    assert.equal(await p.locator("p").textContent(), "fonts ready");
    assert.equal(await p.locator("p").evaluate(e => getComputedStyle(e).marginLeft), "30px");
  });
});

test("shared probes keep independent findings and reject state contamination", async () => {
  const previous = process.cwd(), root = mkdtempSync(join(tmpdir(), "evidence-page-runtime-"));
  mkdirSync(join(root, "dist"));
  writeFileSync(join(root, "dist", "sample.html"), '<p id="value">original</p>');
  process.chdir(root);
  try {
    const make = (name, fail = false) => (list, {log}) => ({
      async check(n, p) { assert.equal(await p.locator("p").textContent(), "original"); log(`${name}: ${n}`); },
      finish() { return fail ? 1 : 0; },
    });
    const one = await runChecks({first: make("first", true), second: make("second")}, ["sample"]);
    assert.equal(one.first.code, 1); assert.equal(one.second.code, 0);
    assert.equal(one.first.inspected, 1); assert.equal(one.second.inspected, 1);
    const two = await runChecks({
      corrupt: () => ({async check(n, p) { await p.locator("p").evaluate(e => e.textContent = "changed"); }, finish() { return 0; }}),
      intact: make("intact"),
    }, ["sample"]);
    assert.equal(two.corrupt.code, 1); assert.equal(two.intact.code, 0);
    assert.match(two.corrupt.lines.join("\n"), /read-only probe changed/);
    const missing = await runChecks({check: make("check")}, ["missing"]);
    assert.equal(missing.check.code, 1); assert.equal(missing.check.inspected, 0);
  } finally { process.chdir(previous); rmSync(root, {recursive: true, force: true}); }
});

test("CI image follows the exact lockfile pin and rejects mismatches", () => {
  const script = new URL("./ci-image.mjs", import.meta.url);
  const good = spawnSync(process.execPath, [script.pathname], {encoding: "utf8"});
  assert.equal(good.status, 0);
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const browserPackage = "play" + "wright";
  const version = pkg.devDependencies[browserPackage];
  assert.equal(good.stdout.trim(), `mcr.microsoft.com/${browserPackage}:v${version}-noble`);
  const root = mkdtempSync(join(tmpdir(), "evidence-ci-image-"));
  try {
    writeFileSync(join(root, "package.json"), JSON.stringify({devDependencies: {playwright: "9.9.9"}}));
    writeFileSync(join(root, "package-lock.json"), readFileSync("package-lock.json"));
    const bad = spawnSync(process.execPath, [script.pathname], {cwd: root, encoding: "utf8"});
    assert.notEqual(bad.status, 0); assert.match(bad.stderr, /same exact version/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
