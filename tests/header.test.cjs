const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./runtime-harness.cjs');
const { version } = require('../app.config.json');
const vm = require('node:vm');

const localized = {
  ja: { language: 'EN', target: '英語に切り替え', help: '使い方と注意事項', close: '閉じる', privacy: '完全ローカル処理' },
  en: { language: 'JA', target: 'Switch to Japanese', help: 'How to use & notes', close: 'Close', privacy: 'Fully local processing' }
};
function assertHeader(f, lang) {
  const expected = localized[lang];
  assert.equal(f.context.document.documentElement.lang, lang);
  assert.equal(f.get('langBtn').textContent, expected.language);
  for (const [id, label] of [['langBtn', expected.target], ['helpBtn', expected.help], ['helpClose', expected.close]]) {
    const button = f.get(id);
    assert.equal(button.tagName, 'BUTTON');
    assert.equal(button.getAttribute('type'), 'button');
    assert.equal(button.getAttribute('aria-label'), label, `${id} accessible name in ${lang}`);
    assert.equal(button.getAttribute('title'), label, `${id} tooltip in ${lang}`);
  }
  assert.equal(f.nodes.find(n => n.dataset.i18n === 'local').textContent, expected.privacy);
}
for (const language of ['ja', 'ja-JP', 'en', 'en-US']) test(`header names target language and localizes Help across repeated toggles from ${language}`, async () => {
  const f = fixture({ language, mobile: true });
  let lang = language.startsWith('ja') ? 'ja' : 'en';
  for (let i = 0; i < 5; i++) {
    assertHeader(f, lang);
    await f.get('langBtn').click();
    lang = lang === 'ja' ? 'en' : 'ja';
  }
});
for (const language of ['ja', 'en']) test(`Help retains button, backdrop and Escape dismissal in ${language}`, async () => {
  const f = fixture({ language });
  const dialog = f.get('helpDialog');
  for (const [id, label] of [['helpBtn', localized[language].help], ['helpClose', localized[language].close]]) {
    assert.equal(f.get(id).getAttribute('aria-label'), label);
    assert.equal(f.get(id).getAttribute('title'), label);
  }
  assert.equal(dialog.classList.contains('hidden'), true);
  await f.get('helpBtn').click();
  assert.equal(dialog.classList.contains('hidden'), false);
  await f.get('langBtn').click();
  assertHeader(f, language === 'ja' ? 'en' : 'ja');
  assert.equal(dialog.classList.contains('hidden'), false);
  await f.get('helpClose').click();
  assert.equal(dialog.classList.contains('hidden'), true);
  await f.get('helpBtn').click();
  await dialog.emit('click', { target: f.get('helpTitle') });
  assert.equal(dialog.classList.contains('hidden'), false);
  await dialog.click();
  assert.equal(dialog.classList.contains('hidden'), true);
  await f.get('helpBtn').click();
  await f.context.document.emit('keydown', { key: 'Escape' });
  assert.equal(dialog.classList.contains('hidden'), true);
});
for (const appVersion of [undefined, '9.8.7']) test(`header and Help render full canonical version ${appVersion || version}`, async () => {
  const f = fixture({ language: 'ja', mobile: true, appVersion });
  const expected = `v${appVersion || version}`;
  assert.equal(vm.runInContext('APP_VERSION', f.context), appVersion || version, 'runtime version derives from the embedded app configuration');
  assert.equal(f.nodes.filter(n => n.classList.contains('version-text')).length, 0, 'version prefix must not use the narrow-screen hidden class');
  const badge = f.nodes.find(n => n.classList.contains('ver'));
  const helpVersion = f.nodes.find(n => n.classList.contains('tech'));
  assert.equal(badge.textContent, expected);
  assert.equal(helpVersion.textContent, `Video Contact Sheet ${expected}`);
  await f.get('langBtn').click();
  assert.equal(badge.textContent, expected);
  assert.equal(helpVersion.textContent, `Video Contact Sheet ${expected}`);
});
