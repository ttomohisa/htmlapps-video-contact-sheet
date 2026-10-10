const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const htmlPath = process.env.CONTACT_SHEET_HTML || path.join(__dirname, '../src/index.template.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const payload = html.match(/<script\s+id="self-extract-payload"\s+type="application\/octet-stream">([A-Za-z0-9+/=\r\n]+)<\/script>/);
if (payload) html = require('node:zlib').gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64')).toString('utf8');
const nativeCanvas = process.env.CONTACT_SHEET_REAL_CANVAS === '1' ? require('@napi-rs/canvas') : null;
function fixture({ language = 'en', mobile = false, appVersion } = {}) {
  const nodes = [], ids = new Map(), timers = [], encodes = [], downloads = [], revoked = [], urls = new Map(), runs = [];
  function element(tag, attrs = {}) {
    const listeners = new Map(), classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
    const node = { tagName: tag.toUpperCase(), attrs, dataset: {}, style: {}, value: '', textContent: '', checked: 'checked' in attrs, disabled: 'disabled' in attrs, children: [], parentElement: null, inert: 'inert' in attrs, isConnected: true,
      classList: { add(...cs) { cs.forEach(c => classes.add(c)); }, remove(...cs) { cs.forEach(c => classes.delete(c)); }, contains: c => classes.has(c), toggle(c, on) { if (on ?? !classes.has(c)) classes.add(c); else classes.delete(c); } },
      setAttribute(k, v) { attrs[k] = String(v); }, removeAttribute(k) { delete attrs[k]; }, getAttribute(k) { return attrs[k] ?? null; },
      addEventListener(k, fn) { if (!listeners.has(k)) listeners.set(k, []); listeners.get(k).push(fn); }, removeEventListener() {},
      async emit(k, extra = {}) { const e = { target: this, preventDefault() {}, ...extra }; if (typeof this['on' + k] === 'function') await this['on' + k](e); for (const fn of listeners.get(k) || []) await fn(e); },
      click() { if (tag === 'a') downloads.push({ filename: this.download, blob: urls.get(this.href), url: this.href }); else if (!this.disabled) return this.emit('click'); },
      scrollIntoView() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 500 }; },
      contains(other) { for (let n = other; n; n = n.parentElement) if (n === this) return true; return false; },
      closest(selector) { for (let n = this; n; n = n.parentElement) if (matches(n, selector)) return n; return null; },
      querySelectorAll(selector) { return nodes.filter(n => n !== this && this.contains(n) && matches(n, selector)); },
      getClientRects() { return this.closest('.hidden') ? [] : [this.getBoundingClientRect()]; },
      focus() { if (!this.disabled && !this.closest('[inert],.hidden')) document.activeElement = this; }
    };
    for (const [key, value] of Object.entries(attrs)) if (key.startsWith('data-')) node.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    if (tag === 'canvas') {
      const canvas = nativeCanvas?.createCanvas(1, 1); let w = 1, h = 1, ops = [];
      Object.defineProperties(node, { width: { get: () => canvas ? canvas.width : w, set(v) { w = v; if (canvas) canvas.width = v; ops = []; } }, height: { get: () => canvas ? canvas.height : h, set(v) { h = v; if (canvas) canvas.height = v; ops = []; } } });
      const ctx = canvas ? canvas.getContext('2d') : new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), measureText: t => ({ width: t.length * 8 }) }, { get(o, k) { return o[k] ?? ((...a) => ops.push([k, ...a])); } });
      node.native = canvas; node.getContext = () => ctx;
      node.bytes = () => canvas ? canvas.toBuffer('image/png') : Buffer.from(JSON.stringify([w, h, ops]));
      node.toBlob = (callback, mime, quality) => { const bytes = canvas ? canvas.toBuffer(mime, mime === 'image/jpeg' ? Math.round(quality * 100) : undefined) : node.bytes(); encodes.push({ callback, mime, quality, bytes }); };
    }
    nodes.push(node); if (attrs.id) ids.set(attrs.id, node); return node;
  }
  const stack = [], voidTags = new Set(['AREA','BASE','BR','COL','EMBED','HR','IMG','INPUT','LINK','META','PARAM','SOURCE','TRACK','WBR']);
  for (const m of html.slice(0, html.indexOf('<script')).matchAll(/<(\/?)(\w+)\b([^>]*)>([^<]*)/g)) {
    if (m[1]) { const i = stack.findLastIndex(n => n.tagName === m[2].toUpperCase()); if (i >= 0) stack.length = i; continue; }
    const attrs = {}; for (const x of m[3].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[x[1]] = x[2] ?? '';
    const node = element(m[2], attrs); node.textContent = m[4]; node.parentElement = stack.at(-1) || null; node.parentElement?.children.push(node);
    if (!voidTags.has(node.tagName) && !m[3].trimEnd().endsWith('/')) stack.push(node);
  }
  function matches(node, selector) { return selector.split(',').some(raw => { const s = raw.trim(); if (s.startsWith('#')) return node.attrs.id === s.slice(1); if (s.startsWith('.')) return node.classList.contains(s.slice(1)); if (s === '[inert]') return node.inert; const d = s.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/); return d ? d[1] in node.attrs && (d[2] == null || node.attrs[d[1]] === d[2]) : node.tagName.toLowerCase() === s; }); }
  function queryAll(selector) { return nodes.filter(n => matches(n, selector)); }
  const documentListeners = new Map();
  const document = { body: nodes.find(n => n.tagName === 'BODY'), documentElement: nodes.find(n => n.tagName === 'HTML'), getElementById: id => ids.get(id), querySelectorAll: queryAll, createElement: tag => element(tag), addEventListener(k, fn) { if (!documentListeners.has(k)) documentListeners.set(k, []); documentListeners.get(k).push(fn); }, async emit(k, extra) { const e = {preventDefault() {}, ...extra}; for (const fn of documentListeners.get(k) || []) await fn(e); } };
  document.activeElement = document.body;
  const get = id => { assert.ok(ids.has(id), `Expected #${id} in HTML`); return ids.get(id); };
  let nextResult;
  const context = { document, navigator: { language }, Blob, console, Uint8ClampedArray,
    URL: { createObjectURL(blob) { const url = `blob:synthetic-${urls.size + 1}`; urls.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push(url); } },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {}, requestAnimationFrame() {},
    matchMedia: q => ({ matches: q.includes('max-width') ? mobile : q.includes('min-width') ? !mobile : false }), addEventListener() {}, scrollTo() {},
    BrowserFFmpeg: { isSupported: () => true, videoContactSheetArgs: opts => opts, decodePpmOutput: result => result.ppm, decodeJsonOutput: result => result.meta }
  };
  context.window = context;
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  let script = scripts.at(-1)[1];
  // Expose the real application closure only inside this test VM; product has no test hooks.
  script = script.replace(/\}\)\(\);\s*$/, 'globalThis.api={state,save,generate,resetResult,updateActions,formatTime,ppmToCanvas,applyLang};\n})();');
  vm.createContext(context);
  let bootstrap = scripts[0][1].replace('__APP_CONFIG_JSON__', JSON.stringify(require('../app.config.json'))).replace('__BUILD_MANIFEST_JSON__', '{}').replace('__EMBEDDED_ASSET_BUNDLE_JSON__', '{}');
  if (appVersion) bootstrap = bootstrap.replace(/const APP_CONFIG=(.*);/, (_, json) => `const APP_CONFIG=${JSON.stringify({ ...JSON.parse(json), version: appVersion })};`);
  vm.runInContext(bootstrap, context, { filename: htmlPath });
  vm.runInContext(script, context, { filename: htmlPath });
  const api = context.api;
  api.state.runner = { async run(opts) { runs.push(opts); if (nextResult instanceof Error) throw nextResult; return nextResult; } };
  const metadata = (count = 12) => ({ count, columns: count === 48 ? 8 : count === 24 ? 6 : 4, cellWidth: 12, cellHeight: 10, durationSeconds: 9000, codec: 'synthetic', sheetWidth: 48, sheetHeight: 30, samples: Array.from({ length: count }, (_, index) => ({ index, actualSeconds: index * 3600.125 + .125 })) });
  async function result(meta = metadata()) { api.state.file = { name: 'synthetic.mp4', size: 10, lastModified: 1 }; api.state.count = meta.count; nextResult = { meta, ppm: { width: 48, height: 30, pixels: new Uint8ClampedArray(48 * 30 * 3).fill(120) } }; await api.generate(); }
  function complete(i = 0, nullBlob = false) { const x = encodes[i]; x.callback(nullBlob ? null : new Blob([x.bytes], { type: x.mime })); }
  return { api, get, nodes, context, result, metadata, runs, encodes, downloads, revoked, timers, complete, html, failNext() { nextResult = new Error('synthetic failure'); }, format: value => nodes.find(n => n.dataset.format === value).click() };
}
module.exports = { fixture, html };
