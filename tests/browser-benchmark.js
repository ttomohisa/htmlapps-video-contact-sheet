/* Load this developer helper in the development standalone page, then call
   runContactSheetBenchmark(theSyntheticFileBlob). No network/storage/UI changes. */
async function runContactSheetBenchmark(file, { repetitions = 3, counts = [12, 24, 48] } = {}) {
  if (!(file instanceof Blob)) throw new TypeError('A synthetic video Blob is required.');
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new RangeError('Use 1 to 10 benchmark repetitions.');
  const started = performance.now();
  const [coreJsText, wasmBytes] = await Promise.all([
    StandaloneAssets.text('ffmpeg-wasm-builder', 'core-js'),
    StandaloneAssets.bytes('ffmpeg-wasm-builder', 'core-wasm')
  ]);
  const runner = await BrowserFFmpeg.loadEmbedded({ coreJsText, wasmBytes });
  const report = { inputBytes: file.size, capacity: { hardwareConcurrency: navigator.hardwareConcurrency ?? null, deviceMemory: navigator.deviceMemory ?? null }, loadMs: performance.now() - started,
    memoryMeaning: 'Sum of allocated WASM linear memory, not whole-browser peak memory', runs: [] };
  try {
    for (const count of counts) for (let repetition = 0; repetition < repetitions; repetition++) {
      const outputs = [];
      for (const workerCount of repetition % 2 ? [2, 1] : [1, 2]) {
        const result = await BrowserFFmpeg.extractContactSheet(runner, { file, count, workerCount, thumbSize: count === 48 ? 220 : count === 24 ? 280 : 320 });
        report.runs.push({ count, repetition, ...result.metrics }); outputs.push(result);
        if (result.metrics.workersUsed !== workerCount) throw new Error('Requested benchmark mode fell back: ' + result.metrics.fallbackReason);
      }
      const [a, b] = outputs;
      if (a.ppm.width !== b.ppm.width || a.ppm.height !== b.ppm.height || a.ppm.pixels.length !== b.ppm.pixels.length) throw new Error('Output dimensions differ.');
      for (let i = 0; i < a.ppm.pixels.length; i++) if (a.ppm.pixels[i] !== b.ppm.pixels[i]) throw new Error(`RGB byte ${i} differs for ${count} frames.`);
      if (JSON.stringify(a.meta) !== JSON.stringify(b.meta)) throw new Error(`Metadata or timestamps differ for ${count} frames.`);
      report.runs.at(-1).parity = report.runs.at(-2).parity = 'every RGB byte and metadata value matched';
    }
    return report;
  } finally { runner.dispose(); }
}
