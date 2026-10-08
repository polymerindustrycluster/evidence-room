/* node --test tools/selftest-baseline.test.mjs — all mutations stay in temp fixtures. */
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, utimesSync, symlinkSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {CleanBaselines, inputSnapshot, assertRestored, verifyRestoration} from "./_selftest-baseline.mjs";

const fixture = t => {
  const root = mkdtempSync(join(tmpdir(), "selftest-baseline-test-"));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  assert.equal(spawnSync("git", ["init", "--quiet"], {cwd: root}).status, 0);
  mkdirSync(join(root, "dist"));
  mkdirSync(join(root, "_data/build"), {recursive: true});
  writeFileSync(join(root, ".gitignore"), "dist/\n_data/cite.json\n_data/build/*.json\n__pycache__/\n");
  writeFileSync(join(root, "page.json"), '{"claims":1}\n');
  writeFileSync(join(root, "dist/page.html"), "<p>clean</p>");
  const snapshot = () => inputSnapshot(root);
  return {root, snapshot, write: (file, value) => writeFileSync(join(root, file), value)};
};
const command = {gate: "style", args: ["page"]};
const pass = () => ({status: 0, output: "clean"});

test("only identical executable, args and preparation reuse a successful baseline", t => {
  const {snapshot} = fixture(t);
  const cache = new CleanBaselines();
  assert.equal(cache.check(command, snapshot, pass).reused, false);
  assert.equal(cache.check({...command, page: "different fixture"}, snapshot,
    () => assert.fail("must reuse")).reused, true);
  assert.equal(cache.check({...command, args: ["other"]}, snapshot, pass).reused, false);
  assert.equal(cache.check({...command, command: "python3"}, snapshot, pass).reused, false);
  assert.equal(cache.check({...command, prepare: ["tools/prepare.mjs"]}, snapshot, pass).reused, false);
  assert.equal(cache.actual, 4);
  assert.equal(cache.reused, 1);
});

test("source, generated bundle, generated census and added input invalidate ALL baselines", t => {
  const {snapshot, write} = fixture(t);
  const cache = new CleanBaselines();
  cache.check(command, snapshot, pass);
  for (const [file, bytes] of [["page.json", '{"claims":2}\n'],
    ["dist/page.html", "<p>changed</p>"], ["_data/cite.json", "{}"], ["new-input.json", "{}"]]) {
    write(file, bytes);
    assert.equal(cache.check(command, snapshot, pass).reused, false, file);
    assert.equal(cache.check(command, snapshot, pass).reused, true, file);
  }
  assert.equal(cache.actual, 5);
  assert.equal(cache.reused, 4);
});

test("same-size edit with unchanged mtime cannot reuse a baseline", t => {
  const {root, snapshot, write} = fixture(t);
  const cache = new CleanBaselines();
  cache.check(command, snapshot, pass);
  const path = join(root, "page.json"), original = statSync(path);
  write("page.json", '{"claims":9}\n');
  utimesSync(path, original.atimeMs / 1000, original.mtimeMs / 1000);
  assert.equal(cache.check(command, snapshot, pass).reused, false);
});

test("failed clean baseline is never cached; explicit opt-out executes every clean run", t => {
  const {snapshot} = fixture(t);
  for (const cache of [new CleanBaselines(), new CleanBaselines({enabled: false})]) {
    cache.check(command, snapshot, () => ({status: 1, output: "FAIL"}));
    assert.equal(cache.check(command, snapshot, pass).reused, false);
    if (!cache.enabled) assert.equal(cache.check(command, snapshot, pass).reused, false);
    assert.equal(cache.reused, 0);
  }
});

test("ignored raw build inputs disable reuse; backup and Python bytecode do not", t => {
  const {root, snapshot, write} = fixture(t);
  const cache = new CleanBaselines();
  cache.check(command, snapshot, pass);
  write("dist/page.html.selftest-backup", "backup");
  mkdirSync(join(root, "_data/build/__pycache__"));
  write("_data/build/__pycache__/example.pyc", "bytecode");
  assert.equal(cache.check(command, snapshot, pass).reused, true);
  write("_data/build/raw.json", "{}");
  assert.equal(cache.check(command, snapshot, pass).reused, false);
  assert.equal(cache.check(command, snapshot, pass).reused, false);
  assert.deepEqual([...cache.disabled], ["ignored build inputs present"]);
});

test("clean gate changing inputs and incomplete fixture restoration fail closed", t => {
  const {snapshot, write} = fixture(t);
  const cache = new CleanBaselines();
  const original = snapshot();
  assert.throws(() => cache.check(command, snapshot, () => {
    write("dist/page.html", "corrupt");
    return pass();
  }), /clean gate changed its inputs/);
  assert.equal(cache.entries.size, 0);
  assert.throws(() => assertRestored(original, snapshot()), /not restored/);
  write("dist/page.html", "<p>clean</p>");
  assert.doesNotThrow(() => assertRestored(original, snapshot()));
});

test("restoration verifies bytes and restores submillisecond timestamps", t => {
  const {root, write} = fixture(t);
  const path = join(root, "page.json");
  utimesSync(path, 1700000000.123456, 1700000001.654321);
  const originalTimes = statSync(path), originalBytes = readFileSync(path);
  write("page.json", "wrong");
  assert.throws(() => verifyRestoration(path, originalBytes, originalTimes), /restored bytes differ/);
  write("page.json", originalBytes);
  assert.doesNotThrow(() => verifyRestoration(path, originalBytes, originalTimes));
  assert.ok(Math.abs(statSync(path).mtimeMs - originalTimes.mtimeMs) < 0.0011);
});

test("catalog/script mtime changes invalidate even when content is identical", t => {
  const {root, snapshot, write} = fixture(t);
  write("_data/catalog.json", "{}");
  write("_data/build/derive_example.py", "pass\n");
  const cache = new CleanBaselines();
  cache.check(command, snapshot, pass);
  utimesSync(join(root, "_data/build/derive_example.py"), 1700000000, 1700000000);
  assert.equal(cache.check(command, snapshot, pass).reused, false);
});

test("fixed node_modules symlink is excluded, but other uninspectable symlinks fail closed", t => {
  const {root, snapshot} = fixture(t);
  const dependencies = mkdtempSync(join(tmpdir(), "selftest-dependencies-test-"));
  t.after(() => rmSync(dependencies, {recursive: true, force: true}));
  const cache = new CleanBaselines();
  cache.check(command, snapshot, pass);
  symlinkSync(dependencies, join(root, "node_modules"), "dir");
  assert.equal(cache.check(command, snapshot, pass).reused, true);
  symlinkSync(dependencies, join(root, "unexpected-input"), "dir");
  assert.throws(snapshot, /cannot inspect selftest input unexpected-input/);
});
