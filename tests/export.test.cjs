const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./runtime-harness.cjs');
for (const [first, second] of [['png', 'jpeg'], ['jpeg', 'png']]) test(`image save owns ${first} filename when switched to ${second} while encoding`, async () => {
  const f = fixture(); await f.result(); await f.format(first); await f.get('saveBtn').click(); await f.format(second); f.complete();
  assert.equal(f.downloads[0].filename, `synthetic_contact-sheet_12.${first === 'png' ? 'png' : 'jpg'}`);
  assert.equal(f.downloads[0].blob.type, `image/${first}`); assert.equal(f.encodes[0].quality, first === 'jpeg' ? .92 : undefined);
});
for (const order of [[0, 1], [1, 0]]) test(`overlapping image saves own click-time names, completion ${order}`, async () => {
  const f = fixture(); await f.result(); await f.get('saveBtn').click(); await f.format('jpeg'); f.get('outputFilename').value = '二回目.jpg'; await f.get('saveBtn').click(); f.get('outputFilename').value = 'later.jpg'; order.forEach(i => f.complete(i));
  const expected = [['synthetic_contact-sheet_12.png', 'image/png'], ['二回目.jpg', 'image/jpeg']];
  assert.deepEqual(f.downloads.map(d => [d.filename, d.blob.type]), order.map(i => expected[i]));
  f.timers.filter(t => t.delay === 1500).forEach(t => t.fn()); assert.deepEqual(f.revoked, f.downloads.map(d => d.url));
});
test('image save retains blank-name default, null Blob and no-result guards', async () => {
  const f = fixture(); f.api.save(); assert.equal(f.encodes.length, 0); await f.result(); f.get('outputFilename').value = ' '; f.api.save(); assert.equal(f.get('outputFilename').value, 'synthetic_contact-sheet_12.png'); f.complete(0, true); assert.equal(f.downloads.length, 0); assert.equal(f.revoked.length, 0);
});
test('image encoding bytes are unchanged by subsequent format and filename edits', async () => {
  const f = fixture(); await f.result(); const before = f.get('canvas').bytes(); f.api.save(); await f.format('jpeg'); f.get('outputFilename').value = 'later.jpg'; f.complete(); assert.deepEqual(Buffer.from(await f.downloads[0].blob.arrayBuffer()), before); assert.deepEqual(f.get('canvas').bytes(), before);
});

const csvRows = async f => (await f.downloads.at(-1).blob.text()).trimEnd().split('\r\n').map(line => line.split(','));
for (const count of [12, 24, 48]) test(`CSV exports ${count} stored samples with exact decoded times and sheet positions`, async () => {
  const f = fixture(); const meta = f.metadata(count); [meta.samples[0], meta.samples[2]] = [meta.samples[2], meta.samples[0]]; meta.samples[1].actualSeconds = .987654321; meta.samples[3].actualSeconds = 3661.9;
  await f.result(meta); const before = f.get('canvas').bytes(), calls = f.runs.length; await f.get('saveTimestampsBtn').click();
  assert.equal(f.downloads.length, 1); assert.equal(f.downloads[0].blob.type, 'text/csv;charset=utf-8'); assert.equal(f.downloads[0].filename, `synthetic_contact-sheet_${count}_timestamps.csv`);
  const rows = await csvRows(f); assert.deepEqual(rows[0], ['frame', 'row', 'column', 'actual_seconds', 'timestamp']); assert.equal(rows.length, count + 1);
  meta.samples.forEach((s, i) => assert.deepEqual(rows[i + 1], [String(s.index + 1), String(Math.floor(s.index / meta.columns) + 1), String(s.index % meta.columns + 1), String(s.actualSeconds), f.api.formatTime(s.actualSeconds)]));
  assert.match(await f.downloads[0].blob.text(), /\r\n$/); assert.equal(f.runs.length, calls); assert.equal(f.encodes.length, 0); assert.deepEqual(f.get('canvas').bytes(), before);
  f.timers.filter(t => t.delay === 1500).forEach(t => t.fn()); assert.deepEqual(f.revoked, [f.downloads[0].url]);
});
test('CSV is a native, keyboard-activatable result button, initially disabled', () => {
  const f = fixture(); const b = f.get('saveTimestampsBtn'); assert.equal(b.tagName, 'BUTTON'); assert.equal(b.getAttribute('type'), 'button'); assert.equal(b.disabled, true); assert.equal(typeof b.onclick, 'function');
  b.onclick(); assert.equal(f.downloads.length, 0);
});
test('pending source/count/timestamp changes keep CSV attached to the generated result', async () => {
  const f = fixture(); await f.result(); await f.get('saveTimestampsBtn').click(); const oldCsv = await f.downloads[0].blob.text(); const oldFilename = f.downloads[0].filename;
  f.api.state.file = { name: 'not-generated-yet.mp4', size: 20, lastModified: 2 }; f.api.state.count = 48; f.get('timestamps').checked = false; await f.get('timestamps').emit('change');
  await f.get('saveTimestampsBtn').click(); assert.equal(await f.downloads[1].blob.text(), oldCsv); assert.equal(f.downloads[1].filename, oldFilename); assert.equal(f.runs.length, 1);
  await f.result(f.metadata(24)); await f.get('saveTimestampsBtn').click(); assert.equal((await csvRows(f)).length, 25); assert.equal(f.runs.length, 2);
});
test('timestamp overlay toggle changes neither CSV labels nor rendered pixels until regeneration', async () => {
  const f = fixture(); await f.result(); const bytes = f.get('canvas').bytes(); await f.get('saveTimestampsBtn').click(); const text = await f.downloads[0].blob.text(); f.get('timestamps').checked = false; await f.get('timestamps').emit('change'); await f.get('saveTimestampsBtn').click(); assert.equal(await f.downloads[1].blob.text(), text); assert.deepEqual(f.get('canvas').bytes(), bytes);
});
for (const [label, mutate] of [
  ['missing', m => null], ['empty samples', m => ({ ...m, samples: [] })], ['missing samples', m => ({ ...m, samples: undefined })],
  ['incomplete samples', m => ({ ...m, samples: m.samples.slice(1) })], ['zero columns', m => ({ ...m, columns: 0 })], ['fractional columns', m => ({ ...m, columns: 2.5 })],
  ['nonfinite time', m => (m.samples[2].actualSeconds = NaN, m)], ['infinite time', m => (m.samples[2].actualSeconds = Infinity, m)], ['string time', m => (m.samples[2].actualSeconds = '=1+1', m)],
  ['missing time', m => (delete m.samples[2].actualSeconds, m)], ['null sample', m => (m.samples[2] = null, m)], ['sparse samples', m => (delete m.samples[2], m)],
  ['invalid index', m => (m.samples[2].index = -1, m)], ['missing index', m => (delete m.samples[2].index, m)], ['out-of-range index', m => (m.samples[2].index = m.count, m)]
]) test(`CSV rejects ${label} metadata with no partial rows or result changes`, async () => {
  const f = fixture(); await f.result(); const bytes = f.get('canvas').bytes(); f.api.state.meta = mutate(f.api.state.meta); f.api.updateActions(); assert.equal(f.get('saveTimestampsBtn').disabled, true);
  f.get('saveTimestampsBtn').onclick(); assert.equal(f.downloads.length, 0); assert.equal(f.encodes.length, 0); assert.equal(f.api.state.generated, true); assert.deepEqual(f.get('canvas').bytes(), bytes); assert.equal(f.get('timestampExportError').classList.contains('hidden'), false); assert.equal(f.get('timestampExportError').textContent, 'Could not export timestamps: sample metadata is incomplete or invalid.');
});
test('reset or failed regeneration cannot export stale metadata', async () => {
  const f = fixture(); await f.result(); f.api.resetResult(); f.get('saveTimestampsBtn').onclick(); assert.equal(f.downloads.length, 0); assert.equal(f.get('saveTimestampsBtn').disabled, true);
  f.failNext(); await f.api.generate(); f.get('saveTimestampsBtn').onclick(); assert.equal(f.downloads.length, 0); assert.equal(f.api.state.generated, false);
});
for (const [input, expected] of [[' review.jpeg ', 'review_timestamps.csv'], ['日本語.png', '日本語_timestamps.csv'], ['a/b\\c:*?"<>|.JPG', 'a_b_c__timestamps.csv'], [' ', 'contact-sheet_timestamps.csv'], ['....', 'contact-sheet_timestamps.csv'], ['.png', 'contact-sheet_timestamps.csv'], ['a\n\r\u0000b.png', 'a_b_timestamps.csv'], ['=1+1.png', '=1+1_timestamps.csv'], ['report.v2.png', 'report.v2_timestamps.csv']]) test(`CSV filename sanitizes ${JSON.stringify(input)} without putting it in cells`, async () => {
  const f = fixture(); await f.result(); f.api.state.file = { name: 'future.mp4' }; f.get('outputFilename').value = input; await f.get('saveTimestampsBtn').click(); assert.equal(f.downloads[0].filename, expected); assert.equal(f.get('outputFilename').value, input); assert.equal(await f.downloads[0].blob.text(), 'frame,row,column,actual_seconds,timestamp\r\n' + f.api.state.meta.samples.map(s => `${s.index + 1},${Math.floor(s.index / 4) + 1},${s.index % 4 + 1},${s.actualSeconds},${f.api.formatTime(s.actualSeconds)}`).join('\r\n') + '\r\n');
});
test('CSV format switches preserve CSV basename and metadata', async () => {
  const f = fixture(); await f.result(); f.get('outputFilename').value = '編集.png'; await f.get('saveTimestampsBtn').click(); await f.format('jpeg'); await f.get('saveTimestampsBtn').click(); assert.equal(f.downloads[0].filename, f.downloads[1].filename); assert.equal(await f.downloads[0].blob.text(), await f.downloads[1].blob.text());
});
test('localized result labels/error and all four mobile page handlers remain usable', async () => {
  const f = fixture({ language: 'ja', mobile: true }); assert.equal(f.get('saveTimestampsBtn').textContent, '時刻一覧を保存 (CSV)'); await f.result(); f.api.state.meta = null; f.get('saveTimestampsBtn').onclick(); assert.equal(f.get('timestampExportError').textContent, '時刻一覧を保存できませんでした: フレーム情報が不完全または無効です。');
  await f.get('langBtn').click(); assert.equal(f.get('saveTimestampsBtn').textContent, 'Save timestamps (CSV)'); assert.equal(f.get('timestampExportError').textContent, 'Could not export timestamps: sample metadata is incomplete or invalid.');
  for (const [id, key] of [['mobileVideo','video'], ['mobileFrames','frames'], ['mobileGenerate','generate'], ['mobileResult','result']]) { await f.get(id).click(); assert.equal(f.context.document.body.dataset.mobilePage, key); assert.equal(f.get(id).getAttribute('aria-current'), 'page'); }
  assert.match(f.html, /#saveTimestampsBtn\{[^}]*grid-column:1\s*\/\s*-1/); assert.equal(f.get('timestampExportError').getAttribute('role'), 'alert');
});
if (process.env.CONTACT_SHEET_REAL_CANVAS === '1') test('native synthetic Canvas encodes genuine PNG/JPEG bytes without changing pixels', async () => {
  const f = fixture(); await f.result(); const before = f.get('canvas').bytes(); f.api.save(); await f.format('jpeg'); f.api.save(); f.complete(1); f.complete(0);
  const jpeg = Buffer.from(await f.downloads[0].blob.arrayBuffer()), png = Buffer.from(await f.downloads[1].blob.arrayBuffer());
  assert.equal(jpeg.subarray(0, 3).toString('hex'), 'ffd8ff'); assert.equal(jpeg.subarray(-2).toString('hex'), 'ffd9'); assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.deepEqual(png, before); assert.deepEqual(f.get('canvas').bytes(), before);
});
test('blank field focus-loss before CSV preserves generic fallback despite pending source/count', async () => {
  const f = fixture(); await f.result(); f.api.state.file = { name: 'future.mp4', size: 20, lastModified: 2 }; f.api.state.count = 48;
  f.get('outputFilename').value = ' '; await f.get('outputFilename').emit('input'); await f.get('outputFilename').emit('change'); await f.get('outputFilename').emit('blur');
  await f.get('saveTimestampsBtn').click(); assert.equal(f.downloads[0].filename, 'contact-sheet_timestamps.csv'); assert.equal((await csvRows(f)).length, 13);
  await f.format('jpeg'); await f.get('saveTimestampsBtn').click(); assert.equal(f.downloads[1].filename, 'contact-sheet_timestamps.csv');
  f.get('outputFilename').value = 'renamed.jpg'; await f.get('outputFilename').emit('input'); await f.get('outputFilename').emit('change'); await f.get('outputFilename').emit('blur'); await f.get('saveTimestampsBtn').click(); assert.equal(f.downloads[2].filename, 'renamed_timestamps.csv');
});
test('successful regeneration clears the earlier blank CSV filename fallback', async () => {
  const f = fixture(); await f.result(); f.get('outputFilename').value = ''; await f.get('outputFilename').emit('input'); await f.get('outputFilename').emit('blur'); await f.result(f.metadata(24)); await f.get('saveTimestampsBtn').click(); assert.equal(f.downloads[0].filename, 'synthetic_contact-sheet_24_timestamps.csv');
});
