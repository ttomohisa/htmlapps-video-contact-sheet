'use strict';
// Development-only generator. Binary inputs and generated HTML stay outside source.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

function verifyCore({ root = path.resolve(__dirname, '../..'), builderDir, builderCommit, workflowRunId }) {
  const expected = readJson(path.join(root, 'tests/benchmark/expected-core.json'));
  if (builderCommit !== expected.builderCommit) throw new Error('Builder commit differs from the reviewed CI candidate.');
  if (!/^[0-9]+$/.test(String(workflowRunId || ''))) throw new Error('A numeric workflow run identity is required.');
  if (!builderDir) throw new Error('A candidate Builder directory is required.');
  const manifest = readJson(path.join(builderDir, 'manifest.json'));
  if (manifest.profile !== 'video-contact-sheet' || manifest.capabilities?.partitionSampling !== true || manifest.capabilities?.maxPartitionCount !== 2) throw new Error('Candidate must be the bounded partition-capable Contact Sheet profile.');
  if (manifest.runtime?.threading !== 'single-thread' || manifest.runtime.requiresSharedArrayBuffer !== false || manifest.runtime.requiresCrossOriginIsolation !== false || manifest.runtime.workerFsInput !== true) throw new Error('Candidate must preserve single-thread, WORKERFS, and no-isolation behavior.');
  const assets = {}, files = {};
  for (const [key, name, mime] of [['core-js', 'ffmpeg.js', 'text/javascript'], ['core-wasm', 'ffmpeg.wasm', 'application/wasm']]) {
    const bytes = fs.readFileSync(path.join(builderDir, name));
    const sha256 = hash(bytes), known = expected.files[name], declared = manifest.files?.[name];
    if (!known || bytes.length !== known.bytes || sha256 !== known.sha256) throw new Error(`${name} differs from the verified official core bytes.`);
    if (!declared || declared.bytes !== bytes.length || declared.sha256 !== sha256) throw new Error(`${name} manifest hash/size mismatch.`);
    const compressed = fs.readFileSync(path.join(builderDir, name + '.gz'));
    if (!zlib.gunzipSync(compressed).equals(bytes)) throw new Error(`${name} compressed payload mismatch.`);
    assets[key] = { mime, compression: 'gzip', base64: compressed.toString('base64') };
    files[name] = { bytes: bytes.length, sha256, gzipBytes: compressed.length, gzipSha256: hash(compressed) };
  }
  return { expected, manifest, assets, identity: { developmentOnly: true, provenance: 'reproduced-single-profile-ci', builderCommit, workflowRunId: String(workflowRunId), officialBaseline: expected.officialBaseline, coreFiles: files } };
}

function assemble(options) {
  const root = options.root || path.resolve(__dirname, '../..');
  const verified = verifyCore({ ...options, root });
  const input = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const template = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
  const variables = [['__APP_CONFIG_JSON__', 'APP_CONFIG'], ['__BUILD_MANIFEST_JSON__', 'BUILD_MANIFEST'], ['__EMBEDDED_ASSET_BUNDLE_JSON__', 'assetBundle']];
  const values = {};
  let recovered = template;
  for (const [marker, name] of variables) {
    const match = input.match(new RegExp('^const ' + name + '=(.*);$', 'm'));
    if (!match) throw new Error('Built app is missing bootstrap variable ' + name);
    values[marker] = JSON.parse(match[1]);
    recovered = recovered.replace(marker, match[1]);
  }
  if (recovered !== input) throw new Error('Built HTML does not match the current source template. Run the normal build first.');
  const appVersion = values.__APP_CONFIG_JSON__.version;
  const identity = { ...verified.identity, appVersion };
  const dependency = { id: 'ffmpeg-wasm-builder', source: 'development-ci-rebuild', repository: 'ttomohisa/htmlapps-ffmpeg-wasm-builder', commit: options.builderCommit, capabilities: verified.manifest.capabilities, coreFiles: identity.coreFiles };
  values.__BUILD_MANIFEST_JSON__ = { ...values.__BUILD_MANIFEST_JSON__, developmentVerificationOnly: true, dependencies: [dependency] };
  values.__EMBEDDED_ASSET_BUNDLE_JSON__ = { schemaVersion: 2, dependencies: { 'ffmpeg-wasm-builder': { ...dependency, assets: verified.assets } } };
  let html = template;
  for (const [marker] of variables) html = html.replace(marker, safeJson(values[marker]));
  if (!html.includes("connect-src 'none'")) throw new Error('Runtime network boundary is missing.');
  const ui = fs.readFileSync(path.join(root, 'tests/benchmark/harness.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'tests/benchmark/harness.js'), 'utf8');
  html = html.replace(/<body\b[^>]*>/, match => match + ui);
  const end = html.lastIndexOf('})();');
  if (end < 0 || !html.includes('id="bench-run"')) throw new Error('Application or developer UI injection point is missing.');
  html = html.slice(0, end) + 'window.ContactSheetDevBridge={render(ppm,meta){ppmToCanvas(ppm,meta);return els.canvas;}};' + html.slice(end);
  if (!html.includes('</body>')) throw new Error('Application body boundary is missing.');
  html = html.replace('</body>', '<script>const DEVELOPMENT_IDENTITY=' + safeJson(identity) + ';' + script + '</script></body>');
  const output = path.join(root, 'dist/benchmark.html');
  fs.writeFileSync(output, html);
  identity.harnessSha256 = hash(Buffer.from(html));
  fs.writeFileSync(path.join(root, 'dist/benchmark-identity.json'), JSON.stringify(identity, null, 2) + '\n');
  return identity;
}

if (require.main === module) {
  try {
    const options = { workflowRunId: process.env.GITHUB_RUN_ID };
    const keys = { '--builder-dir': 'builderDir', '--builder-commit': 'builderCommit', '--workflow-run-id': 'workflowRunId' };
    let verifyOnly = false;
    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      if (arg === '--verify-only') { verifyOnly = true; continue; }
      if (!keys[arg] || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw new Error('Unknown or incomplete benchmark generator option: ' + arg);
      options[keys[arg]] = process.argv[++i];
    }
    const result = verifyOnly ? verifyCore(options).identity : assemble(options);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) { console.error(error.message || error); process.exitCode = 1; }
}
module.exports = { verifyCore, assemble };
