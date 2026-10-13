const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./runtime-harness.cjs');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const decoded = (f, count = 12, color = 80) => ({ meta: f.metadata(count), ppm: { width: 48, height: 30, pixels: new Uint8ClampedArray(48 * 30 * 3).fill(color) }, metrics: { workersUsed: 1, extractionMs: 1, mergeMs: 0 } });
function extractionGate(f) { const gate = deferred(); let options; f.context.BrowserFFmpeg.extractContactSheet = async (_, opts) => { f.extractions.push(opts); options = opts; return gate.promise; }; return { gate, get options() { return options; } }; }
const selectResolution = async (f, resolution) => { const target = f.nodes.find(n => n.dataset.resolution === resolution); assert.ok(target, `Expected ${resolution} resolution control`); await f.get('resolutionOptions').emit('click', { target }); };

test('failed regeneration retains the source-owned image, CSV, name, and visible result', async () => {
  const f = fixture(); await f.result(); const bytes = f.get('canvas').bytes(), ppm = f.api.state.ppm, meta = f.api.state.meta;
  f.get('outputFilename').value = 'edited.png'; f.api.state.file = { name: 'pending.mp4', size: 10, lastModified: 1 }; f.api.state.count = 48;
  f.failNext(); await f.api.generate();
  assert.equal(f.api.state.generated, true); assert.equal(f.api.state.ppm, ppm); assert.equal(f.api.state.meta, meta); assert.deepEqual(f.get('canvas').bytes(), bytes);
  assert.equal(f.get('outputFilename').value, 'edited.png'); assert.equal(f.get('canvasWrap').classList.contains('hidden'), false); assert.equal(f.get('emptyResult').classList.contains('hidden'), true);
  assert.match(f.get('resultSource').textContent, /synthetic.mp4/); assert.doesNotMatch(f.get('resultSource').textContent, /pending/);
  await f.get('saveTimestampsBtn').click(); assert.equal(f.downloads[0].filename, 'edited_timestamps.csv'); assert.equal((await f.downloads[0].blob.text()).split('\r\n').length, 14);
  f.get('outputFilename').value = ''; await f.get('outputFilename').emit('blur'); f.api.save(); assert.equal(f.get('outputFilename').value, 'synthetic_contact-sheet_12.png'); f.complete(); assert.equal(f.downloads[1].filename, 'synthetic_contact-sheet_12.png');
});

test('timestamp-only Generate changes rendered pixels without any new extraction and preserves edited names', async () => {
  const f = fixture(); await f.result(); const ppm = f.api.state.ppm, meta = f.api.state.meta, bytes = f.get('canvas').bytes();
  f.get('outputFilename').value = 'review.png'; f.get('timestamps').checked = false; await f.get('timestamps').emit('change'); assert.deepEqual(f.get('canvas').bytes(), bytes);
  await f.api.generate(); assert.equal(f.extractions.length, 1); assert.equal(f.api.state.ppm, ppm); assert.equal(f.api.state.meta, meta); assert.notDeepEqual(f.get('canvas').bytes(), bytes); assert.equal(f.get('outputFilename').value, 'review.png'); assert.equal(f.get('pendingNotice').classList.contains('hidden'), true);
  f.get('timestamps').checked = true; await f.api.generate(); assert.equal(f.extractions.length, 1); assert.deepEqual(f.get('canvas').bytes(), bytes);
  await f.get('generateBtn').click(); assert.equal(f.get('regenerateDialog').classList.contains('hidden'), false);
});

for (const change of ['source', 'count', 'resolution']) test(`${change} changes require fresh extraction even with a timestamp change`, async () => {
  const f = fixture(); await f.result(); f.get('timestamps').checked = false;
  if (change === 'source') f.api.state.file = { ...f.api.state.file }; // Same name/size/mtime, different File identity.
  if (change === 'count') f.api.state.count = 24;
  if (change === 'resolution') await selectResolution(f, 'high');
  f.api.updateActions(); assert.equal(f.get('pendingNotice').classList.contains('hidden'), false);
  await f.api.generate(); assert.equal(f.extractions.length, 2);
});

test('same-name distinct files bypass the unchanged confirmation', async () => {
  const f = fixture(); await f.result(); f.api.state.file = { ...f.api.state.file }; await f.get('generateBtn').click(); await tick();
  assert.equal(f.get('regenerateDialog').classList.contains('hidden'), true); assert.equal(f.extractions.length, 2);
});

test('failed cached redraw preserves all previous output and can be retried', async () => {
  const f = fixture(); await f.result(); const bytes = f.get('canvas').bytes(), signature = f.api.state.lastGenerationSignature;
  f.get('timestamps').checked = false;
  const create = f.context.document.createElement; f.context.document.createElement = tag => { const node = create(tag); if (tag === 'canvas') node.getContext = () => { throw new Error('synthetic canvas failure'); }; return node; };
  await f.api.generate(); assert.match(f.get('error').textContent, /canvas failure/); assert.equal(f.api.state.generated, true); assert.equal(f.api.state.lastGenerationSignature, signature); assert.deepEqual(f.get('canvas').bytes(), bytes); assert.equal(f.extractions.length, 1);
  f.context.document.createElement = create; await f.api.generate(); assert.equal(f.api.state.busy, false); assert.equal(f.extractions.length, 1); assert.notDeepEqual(f.get('canvas').bytes(), bytes);
});

test('Stop aborts active extraction, keeps last output, and permits retry before stale settlement', async () => {
  const f = fixture({ mobile: true }); await f.result(); const bytes = f.get('canvas').bytes(), meta = f.api.state.meta;
  f.api.state.count = 24; const first = extractionGate(f), old = f.api.generate(); await tick();
  assert.equal(f.get('stopBtn').classList.contains('hidden'), false); assert.equal(f.get('timestamps').disabled, true);
  await f.get('stopBtn').click(); assert.equal(first.options.signal.aborted, true); assert.equal(f.api.state.busy, false); assert.equal(f.api.state.generated, true); assert.equal(f.get('generateBtn').disabled, false); assert.equal(f.get('timestamps').disabled, false); assert.equal(f.get('stopBtn').classList.contains('hidden'), true); assert.equal(f.get('progressStatus').textContent, 'Stopped'); assert.deepEqual(f.get('canvas').bytes(), bytes);
  const second = extractionGate(f), retry = f.api.generate(); await tick(); first.options.onProgress(1); first.options.onLog({ stream: 'late', message: 'IGNORE ME' }); first.gate.resolve(decoded(f, 24)); await old;
  assert.equal(f.api.state.busy, true); assert.equal(f.api.state.meta, meta); assert.doesNotMatch(f.get('log').textContent, /IGNORE ME/); assert.equal(f.get('progressPct').textContent, '3%');
  second.gate.resolve(decoded(f, 24, 180)); await retry; assert.equal(f.api.state.busy, false); assert.equal(f.api.state.meta.count, 24); assert.notDeepEqual(f.get('canvas').bytes(), bytes);
  for (const timer of f.timers.filter(t => t.delay === 80)) timer.fn(); assert.equal(f.context.document.body.dataset.mobilePage, 'result');
});

test('Stop during asset initialization prevents a worker load and late errors cannot poison retry', async () => {
  const f = fixture(); f.api.state.runner = null; const assets = deferred(); let loads = 0;
  f.context.StandaloneAssets = { text: () => assets.promise, bytes: () => assets.promise }; f.context.BrowserFFmpeg.loadEmbedded = async () => { loads++; return {}; };
  const old = f.result(); await f.get('stopBtn').click(); assert.equal(f.api.state.busy, false); assert.equal(f.get('progressStatus').textContent, 'Stopped');
  assets.reject(new Error('late asset failure')); await old; assert.equal(loads, 0); assert.equal(f.get('error').classList.contains('hidden'), true); assert.equal(f.api.state.generated, false); assert.equal(f.get('saveTimestampsBtn').disabled, true);
});

test('a runner that finishes loading after Stop is disposed instead of replacing the current runner', async () => {
  const f = fixture(); f.api.state.runner = null; const loaded = deferred(); let disposed = 0;
  f.context.StandaloneAssets = { text: async () => '', bytes: async () => new Uint8Array() }; f.context.BrowserFFmpeg.loadEmbedded = () => loaded.promise;
  const old = f.result(); await tick(); await f.get('stopBtn').click(); const current = { run() {} }; f.api.state.runner = current;
  loaded.resolve({ dispose() { disposed++; } }); await old; assert.equal(disposed, 1); assert.equal(f.api.state.runner, current); assert.equal(f.extractions.length, 0);
});

test('source, count, resolution, and timestamp settings are captured at job start', async () => {
  const f = fixture(); const gate = extractionGate(f), pending = f.result(); const source = f.api.state.file;
  f.api.state.file = { name: 'changed.mp4' }; f.api.state.count = 48; f.api.state.resolution = 'high'; f.get('timestamps').checked = false;
  await tick(); assert.equal(gate.options.file, source); assert.equal(gate.options.count, 12); assert.equal(gate.options.thumbSize, 320);
  gate.gate.resolve(decoded(f)); await pending;
  assert.equal(f.get('outputFilename').value, 'synthetic_contact-sheet_12.png'); assert.match(f.get('resultSource').textContent, /synthetic.mp4/); assert.equal(f.get('pendingNotice').classList.contains('hidden'), false);
  const bytes = f.get('canvas').bytes(); f.api.state.file = source; f.api.state.count = 12; f.api.state.resolution = 'standard'; await f.api.generate(); assert.equal(f.extractions.length, 1); assert.notDeepEqual(f.get('canvas').bytes(), bytes);
});

for (const [resolution, sizes] of [['light', [160,140,110]], ['standard', [320,280,220]], ['high', [480,420,330]], ['ultra', [960,840,660]]]) for (const [i, count] of [12,24,48].entries()) test(`${resolution} ${count} uses its bounded thumbnail size`, async () => {
  const f = fixture(); assert.equal(f.api.state.resolution, 'standard'); await selectResolution(f, resolution); await f.result(f.metadata(count));
  assert.equal(f.extractions[0].thumbSize, sizes[i]); assert.ok(sizes[i] >= 96 && sizes[i] <= 960); assert.equal(f.get('summaryResolution').textContent, ({light:'Light',standard:'Standard',high:'High',ultra:'Ultra'})[resolution]);
  assert.equal(f.get('highResolutionWarning').classList.contains('hidden'), resolution !== 'high');
});

test('High warning, source ownership and Stop labels relocalize without changing pixels', async () => {
  const f = fixture({ language: 'ja', mobile: true }); await selectResolution(f, 'high'); await f.result(); const bytes = f.get('canvas').bytes();
  assert.match(f.get('highResolutionWarning').textContent, /メモリ/); assert.match(f.get('resultSource').textContent, /synthetic.mp4/); assert.equal(f.get('stopBtn').textContent, '生成を中止');
  await f.get('langBtn').click(); assert.match(f.get('highResolutionWarning').textContent, /memory/i); assert.match(f.get('resultSource').textContent, /synthetic.mp4/); assert.equal(f.get('stopBtn').textContent, 'Stop generation'); assert.deepEqual(f.get('canvas').bytes(), bytes);
  assert.ok(f.get('countPanel').contains(f.get('resolutionOptions'))); assert.ok(f.get('resultPanel').contains(f.get('resultSource')));
});

test('mobile regeneration reveals Stop and every control unlocks after cancellation', async () => {
  const f = fixture({ mobile: true }); await f.result(); await f.get('mobileResult').click(); f.api.state.count = 24;
  const gate = extractionGate(f), pending = f.api.generate(); await tick();
  assert.equal(f.context.document.body.dataset.mobilePage, 'generate');
  await f.get('stopBtn').click(); gate.gate.reject(new Error('late cancellation rejection')); await pending;
  for (const node of f.nodes.filter(n => n.dataset.count || n.dataset.resolution || ['timestamps','file','selectBtn','clearBtn','regenerateBtn'].includes(n.attrs.id))) assert.equal(node.disabled, false, node.attrs.id || JSON.stringify(node.dataset));
  assert.equal(f.get('error').classList.contains('hidden'), true);
  for (const timer of f.timers.filter(t => t.delay === 80)) timer.fn(); assert.equal(f.context.document.body.dataset.mobilePage, 'generate', 'old completion cannot navigate after a later Stop');
});

test('Stop after decoding but before drawing leaves committed pixels intact', async () => {
  const f = fixture(); await f.result(); const bytes = f.get('canvas').bytes(), meta = f.api.state.meta; f.api.state.count = 24;
  let render; const timeout = f.context.setTimeout; f.context.setTimeout = (fn, delay) => delay === 0 ? (render = fn) : timeout(fn, delay);
  const pending = f.api.generate(); await tick(); assert.equal(typeof render, 'function'); await f.get('stopBtn').click(); render(); await pending;
  assert.equal(f.api.state.meta, meta); assert.deepEqual(f.get('canvas').bytes(), bytes); assert.equal(f.get('progressStatus').textContent, 'Stopped');
});

test('resolution help warns that higher resolution cannot recover source detail in either language', async () => {
  const f = fixture({ language: 'ja' }); assert.match(f.get('resolutionHint').textContent, /元の動画/); await f.get('langBtn').click(); assert.match(f.get('resolutionHint').textContent, /source video/i);
});

test('Stop restores keyboard focus to the enabled Generate action', async () => {
  const f = fixture(), gate = extractionGate(f), pending = f.result(); await tick(); f.get('stopBtn').focus(); await f.get('stopBtn').click();
  assert.equal(f.context.document.activeElement, f.get('generateBtn')); gate.gate.reject(new DOMException('cancelled','AbortError')); await pending;
});

for (const meta of [null, { count: 12, columns: 4, samples: [] }]) test(`invalid extracted metadata ${meta ? 'incomplete' : 'missing'} cannot replace a successful snapshot`, async () => {
  const f = fixture(); await f.result(); const bytes = f.get('canvas').bytes(), oldMeta = f.api.state.meta, signature = f.api.state.lastGenerationSignature;
  f.api.state.file = { name: 'invalid.mp4', size: 2, lastModified: 3 }; f.context.BrowserFFmpeg.extractContactSheet = async () => ({ ...decoded(f), meta });
  await f.api.generate(); assert.equal(f.api.state.meta, oldMeta); assert.equal(f.api.state.lastGenerationSignature, signature); assert.deepEqual(f.get('canvas').bytes(), bytes); assert.equal(f.get('outputFilename').value, 'synthetic_contact-sheet_12.png'); assert.equal(f.get('error').classList.contains('hidden'), false); assert.equal(f.get('saveTimestampsBtn').disabled, false);
});

test('delayed result navigation captures only scalar ownership rather than an RGB snapshot', () => {
  const { html } = require('./runtime-harness.cjs');
  const scheduler = html.match(/function scheduleResultNavigation\(jobId,signature\)\{([\s\S]*?)\n\}/);
  assert.ok(scheduler, 'navigation scheduling needs its own scalar-only closure');
  assert.doesNotMatch(scheduler[1], /snapshot|ppm|meta|canvas|job\./);
});

test('repeated replacements retain only the latest extraction cache and detach earlier canvases', async () => {
  const f = fixture(); await f.result();
  for (let i = 0; i < 5; i++) {
    const previous = f.api.state.snapshot, canvas = f.get('canvas');
    await f.result(f.metadata(i % 2 ? 24 : 48));
    assert.notEqual(f.api.state.snapshot, previous); assert.notEqual(f.api.state.ppm, previous.ppm); assert.notEqual(f.api.state.meta, previous.meta); assert.equal(canvas.isConnected, false);
    assert.equal(f.api.state.snapshot.ppm, f.api.state.ppm); assert.equal(f.api.state.snapshot.meta, f.api.state.meta);
    const ppm = f.api.state.ppm, extractions = f.extractions.length; f.get('timestamps').checked = !f.get('timestamps').checked; await f.api.generate();
    assert.equal(f.api.state.ppm, ppm); assert.equal(f.extractions.length, extractions); assert.equal(f.api.state.activeJob, null);
  }
});

if (process.env.CONTACT_SHEET_REAL_CANVAS === '1') for (const [resolution, size] of [['high', 330], ['ultra', 660]]) test(`48 ${resolution} square cells render within the bounded RGB and Canvas dimensions and reuse the same cache`, async () => {
  const f = fixture(); await selectResolution(f, resolution); f.api.state.file = { name: 'square.mp4', size: 1, lastModified: 1 }; f.api.state.count = 48; f.get('timestamps').checked = false;
  const width = size * 8, height = size * 6, meta = { ...f.metadata(48), cellWidth: size, cellHeight: size, sheetWidth: width, sheetHeight: height };
  const ppm = { width, height, pixels: new Uint8Array(width * height * 3).fill(91) }; let calls = 0;
  f.context.BrowserFFmpeg.extractContactSheet = async (_, opts) => { calls++; assert.equal(opts.thumbSize, size); return { ppm, meta }; };
  await f.api.generate(); assert.equal(f.get('canvas').width * f.get('canvas').height, size * size * 48); assert.equal(f.api.state.ppm.pixels.byteLength, size * size * 48 * 3);
  assert.equal(f.get('canvas').width * f.get('canvas').height * 4, size * size * 48 * 4, 'RGBA surface bytes, excluding temporary/decoder/WASM/browser allocations');
  assert.deepEqual([...f.get('canvas').getContext('2d').getImageData(width - 1, height - 1, 1, 1).data], [91,91,91,255]);
  f.api.save(); f.complete(); const png = Buffer.from(await f.downloads[0].blob.arrayBuffer()); assert.equal(png.readUInt32BE(16), width); assert.equal(png.readUInt32BE(20), height);
  f.get('timestamps').checked = true; await f.api.generate(); assert.equal(calls, 1); assert.equal(f.api.state.ppm, ppm);
});


test('Ultra has a localized PC and memory warning, summary, source label, and exclusive selection', async () => {
  const f = fixture({ language: 'ja', mobile: true });
  assert.deepEqual(f.nodes.filter(n => n.dataset.resolution).map(n => n.dataset.resolution), ['light','standard','high','ultra']);
  assert.equal(f.get('ultraResolutionWarning').classList.contains('hidden'), true);
  await selectResolution(f, 'ultra'); await f.result(); const bytes = f.get('canvas').bytes();
  assert.equal(f.get('summaryResolution').textContent, '超高解像度');
  assert.match(f.get('ultraResolutionWarning').textContent, /PC/); assert.match(f.get('ultraResolutionWarning').textContent, /メモリ/);
  assert.equal(f.get('ultraResolutionWarning').classList.contains('hidden'), false);
  assert.equal(f.get('highResolutionWarning').classList.contains('hidden'), true);
  assert.match(f.get('resultSource').textContent, /synthetic.mp4.*超高解像度/);
  for (const node of f.nodes.filter(n => n.dataset.resolution)) assert.equal(node.getAttribute('aria-pressed'), String(node.dataset.resolution === 'ultra'));
  await f.get('langBtn').click(); assert.equal(f.get('summaryResolution').textContent, 'Ultra');
  assert.match(f.get('ultraResolutionWarning').textContent, /PC/); assert.match(f.get('ultraResolutionWarning').textContent, /memory/i);
  assert.match(f.get('resultSource').textContent, /synthetic.mp4.*Ultra/); assert.deepEqual(f.get('canvas').bytes(), bytes);
  await selectResolution(f, 'high'); assert.equal(f.get('ultraResolutionWarning').classList.contains('hidden'), true);
  assert.equal(f.get('highResolutionWarning').classList.contains('hidden'), false);
});

test('four resolution controls use a two-column grid on narrow screens', () => {
  const { html } = require('./runtime-harness.cjs');
  assert.match(html, /@media\s*\(max-width:600px\)\s*\{\s*\.resolution-buttons\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('Ultra timestamp-only changes redraw without another extraction and retain edited names', async () => {
  const f = fixture(); await selectResolution(f, 'ultra'); await f.result();
  const ppm = f.api.state.ppm, bytes = f.get('canvas').bytes(); f.get('outputFilename').value = 'ultra-review.png';
  f.get('timestamps').checked = false; await f.api.generate();
  assert.equal(f.extractions.length, 1); assert.equal(f.extractions[0].thumbSize, 960); assert.equal(f.api.state.ppm, ppm);
  assert.notDeepEqual(f.get('canvas').bytes(), bytes); assert.equal(f.get('outputFilename').value, 'ultra-review.png');
});

for (const resolution of ['standard', 'ultra']) test(`stopping a new Ultra source preserves the previous ${resolution} image, source label, and CSV`, async () => {
  const f = fixture(); await selectResolution(f, resolution); await f.result();
  const bytes = f.get('canvas').bytes(), meta = f.api.state.meta, source = f.get('resultSource').textContent;
  f.get('outputFilename').value = 'retained.png'; f.api.state.file = { name: 'new-ultra.mp4', size: 2, lastModified: 3 };
  await selectResolution(f, 'ultra'); const gate = extractionGate(f), pending = f.api.generate(); await tick();
  assert.equal(gate.options.thumbSize, 960); await f.get('stopBtn').click(); gate.gate.reject(new DOMException('stopped', 'AbortError')); await pending;
  assert.deepEqual(f.get('canvas').bytes(), bytes); assert.equal(f.api.state.meta, meta); assert.equal(f.get('resultSource').textContent, source);
  await f.get('saveTimestampsBtn').click(); assert.equal(f.downloads[0].filename, 'retained_timestamps.csv');
  assert.equal((await f.downloads[0].blob.text()).split('\r\n').length, 14);
});

test('oversized decoded output is rejected before setting any Canvas dimensions', () => {
  const f = fixture(), writes = [];
  const canvas = { set width(value) { writes.push(value); }, set height(value) { writes.push(value); }, getContext() { throw new Error('must not allocate a Canvas'); } };
  assert.throws(() => f.api.ppmToCanvas({ width: 5001, height: 5000, pixels: new Uint8Array() }, null, canvas, false), /25000000|pixel limit/i);
  assert.deepEqual(writes, []);
});
