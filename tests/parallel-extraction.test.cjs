const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { html } = require('./runtime-harness.cjs');
function runtime(Worker = class {}) {
  const revoked = [];
  const context = { Worker, WebAssembly, Blob, ArrayBuffer, Uint8Array, TextDecoder, AbortController, DOMException, performance,
    URL: { createObjectURL: () => 'blob:worker', revokeObjectURL: x => revoked.push(x) } };
  context.window = context;
  vm.runInNewContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)][1][1], context);
  return { api: context.BrowserFFmpeg, revoked };
}
function output(count = 12, partitionIndex, mutate) {
  const columns = count === 48 ? 8 : count === 24 ? 6 : 4;
  const meta = { schemaVersion: 1, count, columns, rows: count / columns, cellWidth: 3, cellHeight: 2, sheetWidth: columns * 3, sheetHeight: count / columns * 2, durationSeconds: 18, codec: 'synthetic', sourceWidth: 320, sourceHeight: 240, samples: [] };
  if (partitionIndex !== undefined) Object.assign(meta, { partitionCount: 2, partitionIndex });
  const pixels = new Uint8Array(meta.sheetWidth * meta.sheetHeight * 3);
  for (let i = 0; i < count; i++) if (partitionIndex === undefined || i % 2 === partitionIndex) {
    meta.samples.push({ index: i, targetSeconds: 18 * i / (count - 1), actualSeconds: 18 * i / (count - 1) + .01 });
    for (let y = 0; y < meta.cellHeight; y++) for (let x = 0; x < meta.cellWidth; x++) {
      const p = ((Math.floor(i / columns) * meta.cellHeight + y) * meta.sheetWidth + (i % columns) * meta.cellWidth + x) * 3;
      pixels.set([i + 1, 128, 255 - i], p);
    }
  }
  const decoded = { meta, ppm: { width: meta.sheetWidth, height: meta.sheetHeight, pixels } };
  mutate?.(decoded);
  return decoded;
}
function encode(o) {
  const header = Buffer.from(`P6\n${o.ppm.width} ${o.ppm.height}\n255\n`);
  return { wasmMemoryBytes: 16 * 1024 * 1024, files: [
    { name: '/contact-sheet.ppm', data: new Uint8Array(Buffer.concat([header, o.ppm.pixels])) },
    { name: '/contact-sheet.json', data: new Uint8Array(Buffer.from(JSON.stringify(o.meta))) }
  ] };
}
const value = (args, name) => args[args.indexOf(name) + 1];
test('partition arguments preserve global count and validate bounded indexes', () => {
  const { api } = runtime();
  for (const count of [12, 24, 48]) for (const index of [0, 1]) {
    const args = api.videoContactSheetArgs({ count, partitionCount: 2, partitionIndex: index });
    assert.equal(value(args, '--count'), String(count));
    assert.equal(value(args, '--partition-count'), '2'); assert.equal(value(args, '--partition-index'), String(index));
  }
  assert.equal(api.videoContactSheetArgs({}).includes('--partition-count'), false);
  for (const opts of [{ partitionCount: 3 }, { partitionCount: 0 }, { partitionCount: 1.5 }, { partitionCount: 2, partitionIndex: 2 }, { partitionIndex: 1 }, { partitionIndex: -1 }, { partitionIndex: .5 }]) assert.throws(() => api.videoContactSheetArgs(opts), /partition/i);
});
test('worker selection is bounded and conservative when capacity is unknown or low', () => {
  const { api } = runtime();
  for (const caps of [{}, { hardwareConcurrency: 16 }, { deviceMemory: 16 }, { hardwareConcurrency: 2, deviceMemory: 8 }, { hardwareConcurrency: 8, deviceMemory: 4 }]) assert.equal(api.contactSheetWorkerCount(caps), 1);
  assert.equal(api.contactSheetWorkerCount({ hardwareConcurrency: 4, deviceMemory: 8 }), 2);
  assert.equal(api.contactSheetWorkerCount({}, 2), 2);
  assert.equal(api.contactSheetWorkerCount({ hardwareConcurrency: 8, deviceMemory: 8 }, 1), 1);
  assert.throws(() => api.contactSheetWorkerCount({}, 3), /worker/i);
});
for (const count of [12, 24, 48]) test(`merging ${count} frames exactly restores pixels and global timestamps in shuffled partition order`, () => {
  const { api } = runtime(); const expected = output(count);
  const result = api.mergeContactSheetPartitions([output(count, 1), output(count, 0)], count);
  assert.deepEqual(Buffer.from(result.ppm.pixels), Buffer.from(expected.ppm.pixels));
  assert.deepEqual(JSON.parse(JSON.stringify(result.meta)), expected.meta);
});
for (const [label, mutate] of [
  ['missing sample', o => o.meta.samples.pop()], ['duplicate sample', o => o.meta.samples.push(o.meta.samples[0])],
  ['foreign sample', o => o.meta.samples[0].index = 1], ['fractional index', o => o.meta.samples[0].index = .5],
  ['bad target', o => o.meta.samples[0].targetSeconds = NaN], ['bad actual', o => o.meta.samples[0].actualSeconds = -1],
  ['codec mismatch', o => o.meta.codec = 'other'], ['duration mismatch', o => o.meta.durationSeconds = 20],
  ['dimensions mismatch', o => o.meta.cellWidth = 2], ['pixel size', o => o.ppm.pixels = new Uint8Array(1)],
  ['missing partition', o => delete o.meta.partitionCount], ['duplicate partition', o => o.meta.partitionIndex = 1],
  ['wrong global count', o => o.meta.count = 24], ['sheet dimensions', o => o.ppm.width = 1]
]) test(`merger rejects ${label}`, () => {
  const { api } = runtime(); assert.equal(typeof api.mergeContactSheetPartitions, 'function'); assert.throws(() => api.mergeContactSheetPartitions([output(12, 0, mutate), output(12, 1)], 12), /partition|metadata|sample|pixel|dimension|count/i);
});
test('parallel extraction mounts the same Blob, combines progress monotonically, and reports memory/stages', async () => {
  const { api } = runtime(); const file = new Blob(['synthetic']); const calls = [], progress = [];
  const runner = { async run(opts) { calls.push(opts); opts.onProgress(.8); opts.onProgress(.2); opts.onProgress(1); return encode(output(24, Number(value(opts.args, '--partition-index')))); } };
  const result = await api.extractContactSheet(runner, { file, count: 24, thumbSize: 280, workerCount: 2, onProgress: p => progress.push(p) });
  assert.equal(calls.length, 2); assert.ok(calls.every(c => c.files[0].data === file && c.files[0].workerfs && c.signal));
  assert.deepEqual(Buffer.from(result.ppm.pixels), Buffer.from(output(24).ppm.pixels));
  assert.ok(progress.length > 1 && progress.every((p, i) => p >= (progress[i - 1] || 0) && p <= 1));
  assert.equal(result.metrics.requestedWorkers, 2); assert.equal(result.metrics.workersUsed, 2); assert.equal(result.metrics.fallbackReason, null);
  assert.equal(result.metrics.wasmMemoryBytes, 32 * 1024 * 1024); assert.ok(result.metrics.extractionMs >= 0); assert.ok(result.metrics.mergeMs >= 0);
});
test('parallel failure aborts and settles the sibling before starting a one-worker retry', async () => {
  const { api } = runtime(); let active = 0, maxActive = 0, starts = 0, cancelled = false;
  const runner = { run(opts) { starts++; active++; maxActive = Math.max(maxActive, active);
    if (!opts.args.includes('--partition-count')) { assert.equal(active, 1); assert.equal(cancelled, true); active--; return Promise.resolve(encode(output())); }
    if (value(opts.args, '--partition-index') === '0') { active--; return Promise.reject(new Error('synthetic parallel allocation failure')); }
    return new Promise((resolve, reject) => opts.signal.addEventListener('abort', () => { active--; cancelled = true; reject(new DOMException('aborted', 'AbortError')); }, { once: true }));
  } };
  const result = await api.extractContactSheet(runner, { file: new Blob(['x']), workerCount: 2 });
  assert.equal(starts, 3); assert.equal(maxActive, 1); assert.equal(active, 0); assert.equal(result.metrics.workersUsed, 1); assert.match(result.metrics.fallbackReason, /allocation failure/);
});
test('malformed parallel output retries once in one-worker mode', async () => {
  const { api } = runtime(); let starts = 0;
  const runner = { async run(opts) { starts++; return encode(output(12)); } };
  const result = await api.extractContactSheet(runner, { file: new Blob(['x']), workerCount: 2 });
  assert.equal(starts, 3); assert.equal(result.metrics.workersUsed, 1); assert.match(result.metrics.fallbackReason, /partition/i);
});
test('failed single retry surfaces its error instead of retrying forever', async () => {
  const { api } = runtime(); let starts = 0;
  const runner = { async run() { starts++; throw new Error(starts > 2 ? 'single failed' : 'parallel failed'); } };
  await assert.rejects(api.extractContactSheet(runner, { file: new Blob(['x']), workerCount: 2 }), /single failed/); assert.equal(starts, 3);
});
test('aborting parallel extraction terminates both operations without retry', async () => {
  const { api } = runtime(); const controller = new AbortController(); let starts = 0, cancelled = 0;
  const runner = { run(opts) { starts++; return new Promise((resolve, reject) => opts.signal.addEventListener('abort', () => { cancelled++; reject(new DOMException('cancelled', 'AbortError')); })); } };
  const promise = api.extractContactSheet(runner, { file: new Blob(['x']), workerCount: 2, signal: controller.signal });
  controller.abort(); await assert.rejects(promise, { name: 'AbortError' }); assert.equal(starts, 2); assert.equal(cancelled, 2);
});
test('runner cancellation terminates active Workers and prevents late progress', { timeout: 300 }, async () => {
  const workers = []; class Worker { constructor() { workers.push(this); } postMessage() {} terminate() { this.terminated = true; } }
  const { api, revoked } = runtime(Worker); const runner = await api.loadEmbedded({ coreJsText: '', wasmBytes: new Uint8Array([0]) });
  const controller = new AbortController(); let progress = 0;
  const p = runner.run({ signal: controller.signal, onProgress: () => progress++ }); const w = workers[0]; controller.abort();
  await assert.rejects(p, { name: 'AbortError' }); assert.equal(w.terminated, true); assert.equal(revoked.length, 1);
  w.onmessage?.({ data: { type: 'progress', progress: .5 } }); assert.equal(progress, 0);
  const p2 = runner.run({}); runner.dispose(); await assert.rejects(p2, { name: 'AbortError' }); assert.equal(workers[1].terminated, true);
});
test('runner cleans up synchronous postMessage failure and message deserialization failure', { timeout: 300 }, async () => {
  for (const mode of ['post', 'message']) {
    let w; class Worker { constructor() { w = this; } postMessage() { if (mode === 'post') throw new Error('clone failed'); } terminate() { this.terminated = true; } }
    const { api, revoked } = runtime(Worker); const runner = await api.loadEmbedded({ coreJsText: '', wasmBytes: new Uint8Array([0]) });
    const p = runner.run({}); if (mode === 'message') w.onmessageerror?.({});
    await assert.rejects(p, /clone|message|deserialize/i); assert.equal(w.terminated, true); assert.equal(revoked.length, 1);
  }
});

test('production Generate uses device capacity without a global override and reports actual technical measurements', async () => {
  const { fixture } = require('./runtime-harness.cjs'); const f = fixture();
  assert.equal(f.context.VideoContactSheetBenchmark, undefined, 'production has no benchmark override or lastRun global');
  f.context.navigator.hardwareConcurrency = 8; f.context.navigator.deviceMemory = 8;
  await f.result();
  assert.equal(f.extractions.length, 1); assert.equal(f.extractions[0].workerCount, undefined); assert.equal(f.extractions[0].capabilities.deviceMemory, 8);
  assert.equal(f.api.state.generated, true);
  assert.match(f.get('log').textContent, /Workers: 2; extraction: 1 ms; merge: 0 ms; allocated WASM: unavailable bytes/);
});

test('pre-aborted extraction starts no Workers and never retries', async () => {
  const { api } = runtime(); const c = new AbortController(); c.abort(); let starts = 0;
  await assert.rejects(api.extractContactSheet({ async run() { starts++; } }, { workerCount: 2, signal: c.signal }), { name: 'AbortError' }); assert.equal(starts, 0);
});
test('partition errors with both Workers live terminate both before retry (peak remains two)', async () => {
  const { api } = runtime(); let active = 0, maxActive = 0, release; const terminations = [];
  const runner = { run(opts) {
    const index = value(opts.args, '--partition-index');
    if (!opts.args.includes('--partition-count')) { assert.equal(active, 0); assert.equal(terminations.length, 2); return Promise.resolve(encode(output())); }
    active++; maxActive = Math.max(maxActive, active);
    return new Promise((resolve, reject) => {
      let finished = false;
      const end = reason => { if (finished) return; finished = true; active--; terminations.push(index); reject(reason); };
      opts.signal.addEventListener('abort', () => end(new DOMException('cancelled', 'AbortError')), { once: true });
      if (index === '0') release = () => end(new Error('two live failure'));
    });
  } };
  const promise = api.extractContactSheet(runner, { file: new Blob(['x']), workerCount: 2 });
  assert.equal(active, 2); release(); const result = await promise;
  assert.equal(maxActive, 2); assert.equal(active, 0); assert.equal(result.metrics.workersUsed, 1);
});
test('merged cells ignore every unowned partial rectangle even if it is corrupted', () => {
  const { api } = runtime(); const a = output(12, 0), b = output(12, 1);
  for (let i = 0; i < a.ppm.pixels.length; i++) if (a.ppm.pixels[i] === 0) a.ppm.pixels[i] = 240;
  for (let i = 0; i < b.ppm.pixels.length; i++) if (b.ppm.pixels[i] === 0) b.ppm.pixels[i] = 240;
  const result = api.mergeContactSheetPartitions([a, b], 12);
  assert.deepEqual(Buffer.from(result.ppm.pixels), Buffer.from(output().ppm.pixels));
});
test('memory measurement is unavailable rather than fabricated if one Worker cannot report it', async () => {
  const { api } = runtime();
  const runner = { async run(opts) { const result = encode(output(12, Number(value(opts.args, '--partition-index')))); delete result.wasmMemoryBytes; return result; } };
  const result = await api.extractContactSheet(runner, { file: new Blob(['x']), workerCount: 2 }); assert.equal(result.metrics.wasmMemoryBytes, null);
});

test('public preview and production workflows do not build or publish the manual benchmark harness', () => {
  const fs = require('node:fs'), path = require('node:path');
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  for (const file of ['.github/workflows/preview.yml', 'build-standalone.ps1', '.github/workflows/deploy-pages.yml', '.github/workflows/build-standalone.yml']) {
    assert.doesNotMatch(read(file), /tests\/benchmark\/assemble\.cjs|benchmark-core|index\.benchmark\.html|benchmark\.html/);
  }
  assert.equal(fs.existsSync(path.join(__dirname, 'preview/index.benchmark.html')), false);
  assert.equal(fs.existsSync(path.join(__dirname, 'benchmark/assemble.cjs')), true, 'manual source-only fixture remains available');
});

test('merger rejects an unknown schema even if both partials agree', () => {
  const { api } = runtime();
  assert.throws(() => api.mergeContactSheetPartitions([output(12, 0, o => o.meta.schemaVersion = 2), output(12, 1, o => o.meta.schemaVersion = 2)], 12), /schema|metadata/i);
});
test('runner reports measured linear memory on success and cleans up once', async () => {
  let worker; class Worker { constructor() { worker = this; this.terminations = 0; } postMessage() {} terminate() { this.terminations++; } }
  const { api, revoked } = runtime(Worker); const runner = await api.loadEmbedded({ coreJsText: '', wasmBytes: new Uint8Array([0]) });
  const pending = runner.run({}); worker.onmessage({ data: { type: 'done', exitCode: 0, files: [], wasmMemoryBytes: 33554432 } });
  const result = await pending; runner.dispose(); assert.equal(result.wasmMemoryBytes, 33554432); assert.equal(worker.terminations, 1); assert.equal(revoked.length, 1);
});

test('successful generation exposes a collapsed localized Processing log without opening it', async () => {
  const { fixture } = require('./runtime-harness.cjs'); const f = fixture({ language: 'en' });
  const details = f.get('details'); assert.equal(details.classList.contains('hidden'), true);
  await f.result();
  assert.equal(details.classList.contains('hidden'), false, 'successful Worker diagnostics must be reachable');
  assert.equal(details.getAttribute('open'), null);
  const summary = details.children.find(node => node.tagName === 'SUMMARY');
  assert.equal(summary.textContent, 'Processing log');
  details.setAttribute('open', ''); await f.result();
  assert.equal(details.classList.contains('hidden'), false); assert.equal(details.getAttribute('open'), null, 'a new success is collapsed even if the previous log was open');
  await f.get('langBtn').click(); assert.equal(summary.textContent, '処理ログ');
});

test('production uses the released partition-capable dependency pin without changing the app version', () => {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const dependency = JSON.parse(fs.readFileSync(path.join(root, 'dependencies.json'), 'utf8')).dependencies[0];
  assert.equal(dependency.version, '1.10.4');
  assert.equal(dependency.source, 'github-release');
  assert.equal(dependency.releaseAsset, 'ffmpeg-wasm-video-contact-sheet-v{version}.zip');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8')).version, '1.0.6');
  assert.match(fs.readFileSync(path.join(root, 'scripts/check-repository.ps1'), 'utf8'), /version -ne "1\.10\.4"/);
  assert.match(fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'), /ffmpeg-wasm-video-contact-sheet-v1\.10\.4\.zip/);
});
