/** 回归检查：官方简体中文页面不应被本脚本破坏（只应补译其中的英文残留）。 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const S = fs.readFileSync(path.join(__dirname, '..', 'opencode-chinese.user.js'), 'utf8');
const files = (process.argv.slice(2).length ? process.argv.slice(2) : ['home_zh.html', 'zh_zen.html', 'zh_data.html', 'zh_docs.html']);

function textNodes(doc) {
  const out = [];
  const w = doc.createTreeWalker(doc.body, 4); // 4 = NodeFilter.SHOW_TEXT
  let n;
  while ((n = w.nextNode())) out.push(n.nodeValue);
  return out;
}

(async () => {
  for (const f of files) {
    const html = fs.readFileSync(path.join(__dirname, 'raw', f), 'utf8');
    const plain = new JSDOM(html, { url: 'https://opencode.ai/' });
    const before = textNodes(plain.window.document);
    plain.window.close();

    const dom = new JSDOM(html, { url: 'https://opencode.ai/', runScripts: 'outside-only' });
    let err = null;
    dom.window.addEventListener('error', (e) => { err = e.message; });
    dom.window.eval(S);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 500));
    const after = textNodes(dom.window.document);

    const changed = [];
    for (let i = 0; i < Math.max(before.length, after.length); i++) {
      if (before[i] !== after[i]) changed.push([before[i], after[i]]);
    }
    console.log('===== ' + f + '  节点数 ' + before.length + ' → ' + after.length + '  变更 ' + changed.length + '  错误 ' + (err || '无'));
    changed.slice(0, 12).forEach(([a, b]) => console.log('   ' + JSON.stringify(a) + ' → ' + JSON.stringify(b)));
    dom.window.close();
  }
  process.exit(0);
})();
