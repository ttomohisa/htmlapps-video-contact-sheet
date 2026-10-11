(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const records = []; let runner = null, busy = false, previewUrl = null;
  $('bench-identity').textContent = 'CI candidate / test-only. ' + JSON.stringify(DEVELOPMENT_IDENTITY);
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
  const download = (blob, filename) => { const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); };
  const jsonBlob = value => new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const button = (label, action) => { const b = document.createElement('button'); b.textContent = label; b.type = 'button'; b.onclick = action; return b; };
  const status = text => { $('bench-status').textContent = text; };
  const lock = on => { busy = on; for (const id of ['bench-run','bench-compare','bench-file','bench-mode','bench-count','bench-repeat']) $(id).disabled = on; };
  async function extract(file, count, workerCount, repetition) {
    const started = performance.now(), coldLoad = !runner;
    if (!runner) {
      const [coreJsText, wasmBytes] = await Promise.all([StandaloneAssets.text('ffmpeg-wasm-builder','core-js'), StandaloneAssets.bytes('ffmpeg-wasm-builder','core-wasm')]);
      runner = await BrowserFFmpeg.loadEmbedded({ coreJsText, wasmBytes });
    }
    const loadMs = performance.now() - started;
    status(`Running ${count} frames, requested Workers ${workerCount ?? 'auto'}, repetition ${repetition + 1}…`);
    const result = await BrowserFFmpeg.extractContactSheet(runner, { file, count, workerCount, capabilities: navigator, thumbSize: count === 48 ? 220 : count === 24 ? 280 : 320,
      onProgress: progress => status(`Running ${count} frames, requested Workers ${workerCount ?? 'auto'}: ${Math.round(progress * 100)}%`)
    });
    const renderStarted = performance.now(), canvas = ContactSheetDevBridge.render(result.ppm, result.meta), renderMs = performance.now() - renderStarted;
    const totalMs = performance.now() - started;
    const [pixelSha256, metadataSha256, png] = await Promise.all([hash(result.ppm.pixels), hash(new TextEncoder().encode(JSON.stringify(canonical(result.meta)))), new Promise(resolve => canvas.toBlob(resolve,'image/png'))]);
    if (!png) throw new Error('PNG encode failed.');
    const metadata = result.meta, pngSha256 = await hash(await png.arrayBuffer());
    const record = { inputName: file.name ?? null, inputLastModified: file.lastModified ?? null, pngSha256, ordinal: records.length + 1, count, repetition, coldLoad, inputBytes: file.size, ...result.metrics, loadMs, renderMs, totalMs, pixelSha256, metadataSha256, width: result.ppm.width, height: result.ppm.height };
    records.push(record);
    const row = document.createElement('article');
    row.textContent = `#${record.ordinal}: ${record.inputName ?? "synthetic Blob"} (${record.inputBytes} bytes) | ${count} frames | requested Workers ${record.requestedWorkers}, used Workers ${record.workersUsed} | ${coldLoad ? 'cold asset load' : 'warm assets / new Workers'}\nTotal ${totalMs.toFixed(1)} ms; load ${loadMs.toFixed(1)} ms; extraction ${record.extractionMs.toFixed(1)} ms; merge ${record.mergeMs.toFixed(1)} ms; render ${renderMs.toFixed(1)} ms\nallocated WASM ${record.wasmMemoryBytes ?? 'unavailable'} bytes (not whole-browser peak)\nPixel SHA-256: ${pixelSha256}\nMetadata SHA-256: ${metadataSha256}\nPNG SHA-256: ${pngSha256}${record.fallbackReason ? '\nFALLBACK: ' + record.fallbackReason : ''}`;
    const base = `contact-${count}-workers-${record.workersUsed}-run-${record.ordinal}`;
    row.append(button('PNG', () => download(png, base + '.png')), button('Metadata JSON', () => download(jsonBlob(metadata), base + '-metadata.json')), button('Measurement JSON', () => download(jsonBlob(record), base + '-measurement.json')));
    $('bench-results').append(row);
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(png); $('bench-image').src = previewUrl;
    $('bench-download').disabled = false;
    return record;
  }
  async function run(compare) {
    if (busy) return;
    const file = $('bench-file').files[0]; if (!file) { status('Please select a synthetic video file.'); return; }
    const count = Number($('bench-count').value), repetitions = compare ? Number($('bench-repeat').value) : 1;
    if (![12,24,48].includes(count) || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 5) { status('Choose 12/24/48 frames and 1 to 5 repetitions.'); return; }
    lock(true);
    try {
      let fallback = false;
      for (let i = 0; i < repetitions; i++) {
        const selected = $('bench-mode').value === 'auto' ? null : Number($('bench-mode').value);
        const modes = compare ? i % 2 ? [2,1] : [1,2] : [selected], pair = [];
        for (const mode of modes) { const record = await extract(file,count,mode,i); pair.push(record); if (record.fallbackReason) fallback = true; }
        if (compare) {
          if (pair[0].pixelSha256 !== pair[1].pixelSha256 || pair[0].metadataSha256 !== pair[1].metadataSha256) throw new Error('FAILED: pixel or metadata hashes differ for the same video.');
          if (pair[0].pngSha256 !== pair[1].pngSha256) throw new Error('FAILED: PNG export hashes differ for the same video.');
          for (const record of pair) record.parity = { pixelSha256: 'matched', metadataSha256: 'matched', pngSha256: 'matched' };
        }
      }
      status(fallback ? 'Finished with fallback to one Worker. This does not demonstrate two-Worker acceleration.' : compare ? 'Finished: same-video pixels, metadata and PNG export hashes matched in both modes. Review measured time and memory below.' : 'Finished. Measurement, image and metadata are ready.');
    } catch (error) { status('FAILED: ' + (error.message || error)); }
    finally { lock(false); }
  }
  $('bench-run').addEventListener('click', () => run(false));
  $('bench-compare').addEventListener('click', () => run(true));
  $('bench-download').addEventListener('click', () => download(jsonBlob({ identity: DEVELOPMENT_IDENTITY, capacity: { hardwareConcurrency: navigator.hardwareConcurrency ?? null, deviceMemory: navigator.deviceMemory ?? null }, memoryMeaning: 'Sum of allocated WASM linear memory; not whole-browser peak memory', runs: records }), 'contact-sheet-measurements.json'));
  $('bench-reload').addEventListener('click', () => { if (!busy) location.reload(); });
})();
