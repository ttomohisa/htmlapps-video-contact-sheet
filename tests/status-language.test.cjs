const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./runtime-harness.cjs');

const labels = {
  ja: { preparing: '準備しています…', loading: 'FFmpeg WASMを準備しています…', analyzing: '動画を解析しています…', sampling: 'フレームを取得しています…', done: '完成しました', empty: '生成するとここにプレビューが表示されます。', ready: '画像をタップして拡大し、細部まで確認できます。' },
  en: { preparing: 'Preparing…', loading: 'Loading FFmpeg WASM…', analyzing: 'Analyzing video…', sampling: 'Sampling frames…', done: 'Done', empty: 'Your contact sheet preview will appear here.', ready: 'Tap the image to zoom in and inspect details before saving.' }
};
function assertProgress(f, phase, percent) {
  const expected = labels[f.api.state.lang][phase] + (phase === 'sampling' ? ` ${percent}%` : '');
  assert.equal(f.get('progressStatus').textContent, expected);
  assert.equal(f.get('progressPct').textContent, `${percent}%`);
  if (f.get('progressBar').style.width) assert.equal(f.get('progressBar').style.width, `${percent}%`);
}
function assertSubtitle(f, ready) {
  assert.equal(f.get('resultSub').textContent, labels[f.api.state.lang][ready ? 'ready' : 'empty']);
}

for (const language of ['ja', 'en']) {
  test(`completed result subtitle follows language rather than the empty-state placeholder from ${language}`, async () => {
    const f = fixture({ language }); await f.result();
    for (let i = 0; i < 5; i++) { assertSubtitle(f, true); await f.get('langBtn').click(); }
  });

  test(`ready and completed progress relocalizes without changing generated output from ${language}`, async () => {
    const f = fixture({ language, mobile: true });
    for (let i = 0; i < 3; i++) {
      assertProgress(f, 'preparing', 0); assertSubtitle(f, false);
      assert.equal(f.get('progressWrap').classList.contains('hidden'), true);
      await f.get('langBtn').click();
    }
    await f.result();
    f.get('outputFilename').value = '編集結果.png';
    const meta = f.api.state.meta, ppm = f.api.state.ppm, signature = f.api.state.lastGenerationSignature;
    const pixels = f.get('canvas').bytes(), metadata = JSON.stringify(meta);
    for (let i = 0; i < 5; i++) {
      assertProgress(f, 'done', 100); assertSubtitle(f, true);
      assert.equal(f.api.state.generated, true); assert.equal(f.api.state.busy, false);
      assert.equal(f.api.state.meta, meta); assert.equal(JSON.stringify(meta), metadata);
      assert.equal(f.api.state.ppm, ppm); assert.equal(f.api.state.lastGenerationSignature, signature);
      assert.equal(f.get('outputFilename').value, '編集結果.png');
      assert.equal(f.get('saveTimestampsBtn').disabled, false);
      assert.equal(f.get('canvasWrap').classList.contains('hidden'), false);
      assert.equal(f.get('resultActions').classList.contains('hidden'), false);
      assert.deepEqual(f.get('canvas').bytes(), pixels);
      assert.equal(f.runs.length, 1); assert.equal(f.encodes.length, 0); assert.equal(f.downloads.length, 0);
      await f.get('langBtn').click();
    }
  });

  test(`stale settings preserve completed status and current result subtitle from ${language}`, async () => {
    const f = fixture({ language }); await f.result();
    f.api.state.file = { name: 'pending.mp4', size: 99, lastModified: 2 };
    f.api.state.count = 48; f.get('timestamps').checked = false;
    await f.get('timestamps').emit('change');
    const meta = f.api.state.meta, pixels = f.get('canvas').bytes(), filename = f.get('outputFilename').value;
    for (let i = 0; i < 5; i++) {
      assertProgress(f, 'done', 100); assertSubtitle(f, true);
      assert.equal(f.get('pendingNotice').classList.contains('hidden'), false);
      assert.equal(f.get('summaryVideo').textContent, 'pending.mp4');
      assert.equal(f.get('summaryFrames').textContent, f.api.state.lang === 'ja' ? '48枚' : '48 frames');
      assert.equal(f.get('summaryTimestamps').textContent, f.api.state.lang === 'ja' ? 'オフ' : 'Off');
      assert.equal(f.api.state.meta, meta); assert.deepEqual(f.get('canvas').bytes(), pixels);
      assert.equal(f.get('outputFilename').value, filename); assert.equal(f.runs.length, 1);
      await f.get('langBtn').click();
    }
  });

  test(`loading phase and progress survive language changes from ${language}`, async () => {
    const f = fixture({ language }), runner = f.api.state.runner;
    let release, loads = 0;
    const gate = new Promise(resolve => { release = resolve; });
    f.api.state.runner = null;
    f.context.StandaloneAssets = { text: () => gate, bytes: () => gate };
    f.context.BrowserFFmpeg.loadEmbedded = async () => { loads++; return runner; };
    const generation = f.result();
    for (let i = 0; i < 5; i++) {
      assertProgress(f, 'loading', 1); assertSubtitle(f, false);
      assert.equal(f.api.state.busy, true); assert.equal(f.get('generateBtn').disabled, true);
      assert.equal(f.get('saveTimestampsBtn').disabled, true); assert.equal(f.runs.length, 0);
      await f.get('langBtn').click();
    }
    release('synthetic embedded asset'); await generation;
    assertProgress(f, 'done', 100); assertSubtitle(f, true);
    assert.equal(loads, 1); assert.equal(f.runs.length, 1);
  });

  test(`preparing, analyzing and sampling phases survive language changes from ${language}`, async () => {
    const f = fixture({ language });
    let release, signalStarted, runOptions;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { signalStarted = resolve; });
    f.api.state.runner = { run(options) { f.runs.push(options); runOptions = options; signalStarted(); return gate; } };
    const generation = f.result();
    assertProgress(f, 'preparing', 0);
    const initialToggle = f.get('langBtn').click();
    assertProgress(f, 'preparing', 0);
    await initialToggle; await started;
    for (const [phase, percent] of [['analyzing', 3], ['sampling', 51]]) {
      if (phase === 'sampling') runOptions.onProgress(.5);
      for (let i = 0; i < 5; i++) {
        assertProgress(f, phase, percent); assertSubtitle(f, false);
        assert.equal(f.api.state.busy, true); assert.equal(f.api.state.generated, false);
        assert.equal(f.get('generateBtn').disabled, true); assert.equal(f.get('saveTimestampsBtn').disabled, true);
        assert.equal(f.runs.length, 1); assert.equal(f.get('canvasWrap').classList.contains('hidden'), true);
        await f.get('langBtn').click();
      }
    }
    release({ meta: f.metadata(), ppm: { width: 48, height: 30, pixels: new Uint8ClampedArray(48 * 30 * 3).fill(120) } });
    await generation;
    assertProgress(f, 'done', 100); assertSubtitle(f, true);
    assert.equal(f.api.state.busy, false); assert.equal(f.runs.length, 1);
  });

  test(`failed regeneration keeps its error and empty result when language changes from ${language}`, async () => {
    const f = fixture({ language }); await f.result(); f.failNext(); await f.api.generate();
    const message = f.get('error').textContent;
    assert.match(message, /synthetic failure/);
    for (let i = 0; i < 5; i++) {
      assert.equal(f.get('error').textContent, message);
      assert.equal(f.get('error').classList.contains('hidden'), false);
      assert.equal(f.get('details').classList.contains('hidden'), false);
      assert.equal(f.api.state.generated, false); assert.equal(f.api.state.busy, false);
      assert.equal(f.get('saveTimestampsBtn').disabled, true);
      assert.equal(f.get('canvasWrap').classList.contains('hidden'), true);
      assert.equal(f.get('emptyResult').classList.contains('hidden'), false);
      assert.equal(f.runs.length, 2); assertProgress(f, 'analyzing', 3); assertSubtitle(f, false);
      await f.get('langBtn').click();
    }
    await f.result(); assertProgress(f, 'done', 100); assertSubtitle(f, true);
    assert.equal(f.get('error').classList.contains('hidden'), true);
  });
}
