const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture, html } = require('./runtime-harness.cjs');
const activeId = f => f.context.document.activeElement.attrs.id;
const key = (f, key, shiftKey = false) => f.context.document.emit('keydown', {key, shiftKey, preventDefault() { this.prevented = true; }});
async function openHelp(f) { f.get('helpBtn').focus(); await f.get('helpBtn').click(); }
async function openResult(f) { await f.result(); f.get('regenerateBtn').focus(); await f.get('regenerateBtn').click(); }
async function openZoom(f) { f.get('canvasShell').focus(); const pending = f.get('canvasShell').click(); f.complete(); await Promise.resolve(); f.get('zoomImage').onload(); await pending; }

test('Help owns focus, makes background inert and restores its opener on close', async () => {
  const f = fixture(); await openHelp(f);
  assert.equal(activeId(f), 'helpClose');
  assert.equal(f.get('helpBtn').closest('[inert]') !== null, true);
  assert.equal(f.context.document.body.classList.contains('modal-open'), true);
  await f.get('helpClose').click();
  assert.equal(activeId(f), 'helpBtn');
  assert.equal(f.get('helpBtn').closest('[inert]'), null);
  assert.equal(f.context.document.body.classList.contains('modal-open'), false);
});
test('Tab and Shift+Tab wrap Help controls instead of reaching background', async () => {
  const f = fixture(); await openHelp(f);
  assert.equal(activeId(f), 'helpClose');
  // The VM does not simulate native Tab defaults: exercise both actual boundaries.
  await key(f, 'Tab'); assert.equal(activeId(f), 'helpContent');
  await key(f, 'Tab', true); assert.equal(activeId(f), 'helpClose');
  await key(f, 'Escape'); assert.equal(activeId(f), 'helpBtn');
});
test('backdrop dismissal restores focus; an inside click does not close Help', async () => {
  const f = fixture(); await openHelp(f); await f.get('helpDialog').emit('click', {target:f.get('helpTitle')});
  assert.equal(activeId(f), 'helpClose'); assert.equal(f.get('helpDialog').classList.contains('hidden'), false);
  await f.get('helpDialog').click(); assert.equal(activeId(f), 'helpBtn');
});
test('regeneration Cancel restores the real opener and leaves the result unchanged', async () => {
  const f = fixture(); await openResult(f); const bytes=f.get('canvas').bytes(), runs=f.runs.length;
  assert.equal(activeId(f), 'regenerateCancel'); await f.get('regenerateCancel').click();
  assert.equal(activeId(f), 'regenerateBtn'); assert.deepEqual(f.get('canvas').bytes(),bytes); assert.equal(f.runs.length,runs);
});
test('regeneration navigation closes the overlay before focusing the selected page', async () => {
  const f=fixture({mobile:true});await openResult(f);await f.get('goFramesBtn').click();
  assert.equal(f.get('regenerateDialog').classList.contains('hidden'),true);
  assert.equal(f.context.document.body.dataset.mobilePage,'frames');
  assert.equal(f.get('countGrid').contains(f.context.document.activeElement),true);
  assert.equal(f.context.document.body.classList.contains('modal-open'),false);
});
test('zoom close returns focus and nested Help closes only the top overlay', async () => {
  const f=fixture();await f.result();await openZoom(f);assert.equal(activeId(f),'zoomClose');
  await f.get('helpBtn').click();assert.equal(activeId(f),'helpClose');await key(f,'Escape');
  assert.equal(f.get('helpDialog').classList.contains('hidden'),true);assert.equal(f.get('zoomViewer').classList.contains('hidden'),false);
  assert.equal(activeId(f),'zoomClose');assert.equal(f.context.document.body.classList.contains('modal-open'),true);
  await key(f,'Escape');assert.equal(activeId(f),'canvasShell');assert.equal(f.context.document.body.classList.contains('modal-open'),false);
});
test('repeated open/close restores prior inert state without duplicate modal ownership', async () => {
  const f=fixture();f.get('appMobileBottomBar').inert=true;
  for(let i=0;i<3;i++){await openHelp(f);await f.get('helpBtn').click();await f.get('helpClose').click();assert.equal(activeId(f),'helpBtn');assert.equal(f.get('appMobileBottomBar').inert,true);assert.equal(f.context.document.body.classList.contains('modal-open'),false);}
});
test('modal page-lock and wrapping title preserve existing scroll shells', () => {
  assert.match(html,/html:has\(body\.modal-open\),body\.modal-open\{overflow:hidden\}/);
  assert.match(html,/\.brand h1\{[^}]*white-space:normal/);
  assert.match(html,/\.ver\{[^}]*display:inline-block/);
  assert.match(html,/\.head-actions\{[^}]*flex:none/);
  assert.match(html,/\.dialog\{[^}]*overflow:auto/);
  assert.match(html,/\.dialog-head\{position:sticky/);
});

test('closing an underlying overlay preserves the top overlay focus and page lock', async () => {
  const f=fixture();await f.result();await openZoom(f);await f.get('helpBtn').click();
  await f.get('zoomClose').click();
  assert.equal(activeId(f),'helpClose');assert.equal(f.get('helpDialog').classList.contains('hidden'),false);
  assert.equal(f.context.document.body.classList.contains('modal-open'),true);
  await key(f,'Escape');assert.equal(f.context.document.body.classList.contains('modal-open'),false);
  assert.equal(f.get('helpBtn').closest('[inert]'),null);
  assert.equal(activeId(f),'canvasShell');
});
test('local processing badge uses the decorative shared shield before its truthful label', () => {
  const badge=html.match(/<div class="local">([\s\S]*?)<\/div>/)[1];
  assert.match(badge, /<svg[^>]*aria-hidden="true"[^>]*><path d="M12 3 5 6v5c0 4\.6 2\.8 8 7 10 4\.2-2 7-5\.4 7-10V6z"\/><path d="m9 12 2 2 4-5"\/><\/svg><span data-i18n="local">/);
});
