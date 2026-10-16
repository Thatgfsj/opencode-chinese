/**
 * 覆盖率检查：把 userscript 注入 test/raw/ 下的真实页面快照（jsdom），
 * 统计「仍是英文的可见文本」与「仍是英文的属性」，输出到 test/out/。
 *
 *   npm install && node check.js            # 全部页面
 *   node check.js home docs                 # 指定页面
 *
 * 说明：结果中残留的英文应为下列「有意保留」的内容：
 *   品牌/模型/协议名、命令与代码、平台标签、图表数字，
 *   以及文档正文与法律条款正文（本脚本不翻译长文，见 README）。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAW = path.join(__dirname, 'raw');
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'opencode-chinese.user.js'), 'utf8');
const OUT = path.join(__dirname, 'out');

const PAGES = [
  ['home', 'home.html'],
  ['zen', 'zen.html'],
  ['go', 'go.html'],
  ['enterprise', 'enterprise.html'],
  ['download', 'download.html'],
  ['brand', 'brand.html'],
  ['data', 'data.html'],
  ['changelog', 'changelog.html'],
  ['docs', 'docs.html'],
  ['privacy', 'legal_privacy-policy.html'],
  ['terms', 'legal_terms-of-service.html']
];

// 与 userscript 中 IGNORE_SELECTOR 保持一致
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'TEXTAREA', 'SVG', 'MATH', 'CANVAS']);

function shouldSkip(el) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (SKIP.has(e.tagName)) return true;
    if (e.hasAttribute && (e.hasAttribute('data-oc-zh-ignore') || e.getAttribute('translate') === 'no')) return true;
    if (e.classList && (e.classList.contains('shiki') || e.classList.contains('expressive-code') || e.classList.contains('astro-code'))) return true;
  }
  return false;
}

// 含中日韩标点与全角符号（。，：（）等），避免把已汉化的文本误判为英文
const HAS_CJK = /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/;
const HAS_LATIN = /[A-Za-z]/;

// 有意保留英文的清单
const LEGIT = [
  /^(OpenCode|GitHub|GitLab|Zen|Go|Claude|GPT|Gemini|ChatGPT|Copilot|Discord|X|Anomaly|VSCodium|Windsurf|Cursor|Zed|VS Code|PNG|SVG|TUI|CLI|IDE|SDK|LSP|MCP|ACP|API|JSON|ZDR|MIT|SOC|NDA|UTC|URL|Email|Login|npm|bun|brew|paru|yay|pnpm|yarn|mise|curl|bash|PowerShell|Windows|Linux|macOS|Arch|Docker|Homebrew|Chocolatey|Scoop|Mise|WSL|Alacritty|Ghostty|Kitty|WezTerm|Apple|Intel|ARM64|x64)$/,
  /^(English|Dansk|Deutsch|Español|Français|Italiano|Norsk Bokmål|Polski|Português \(Brasil\)|Русский|Українська|العربية|ไทย|Türkçe|한국어|日本語|简体中文|繁體中文|Bosanski)$/,
  /^[\d\s.,:%+\-–—*/×~`'"()[\]]+$/,
  /^[$€]?[\d.,]+[TKM]?$/,
  /^v?\d+(\.\d+)*$/,
  /^(https?:\/\/|www\.|opencode\.ai|\/|#|@)/,
  /^[\w.+-]+@[\w.-]+$/,
  /^[a-z0-9][a-z0-9._-]*$/i,
  /^[\w.-]+\.(js|ts|json|md|toml|lock|yaml|yml|sh|exe|dmg|deb|rpm|zip|svg|png)$/i,
  /^(Fig|vs|and|or|the|a|an)$/,
  /^[^\s]+ vs [^\s]+$/,
  /^©/,
  /^\d{1,2}:\d{2} UTC$/,
  /^(.*)(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d/,
  /^(Kimi|Gemini|Claude|GPT|Qwen|DeepSeek|MiniMax|LongCat|Beam|Space|Muse|Step|GLM|MiMo|Nemotron|Hy3|Go Plus|Big Pickle)/,
  /^(Dax Raad|Jay V|Adam Elmore|David Hill|Frank Wang|Jeff Bezos|Acme Inc|Executive Chairman)/,
  /^(\$[\d.]+[K]?[–-]?\$?[\d.K]*|Under \$[\d.K]+|\$[\d.K]+ or more)$/
];

const isLegit = (t) => LEGIT.some((re) => re.test(t));

async function check(name, file) {
  const html = fs.readFileSync(path.join(RAW, file), 'utf8');
  const dom = new JSDOM(html, { url: 'https://opencode.ai/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const errors = [];
  window.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  try {
    window.eval(SCRIPT); // 模拟 @run-at document-start
  } catch (e) {
    errors.push('脚本执行异常: ' + e.stack);
  }
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  window.dispatchEvent(new window.Event('load'));
  await new Promise((r) => setTimeout(r, 400));

  const doc = window.document;
  const leftovers = [];
  const attrLeftovers = [];
  const walker = doc.createTreeWalker(doc.body || doc.documentElement, window.NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.nodeValue || '').trim();
    if (!text || !HAS_LATIN.test(text) || HAS_CJK.test(text)) continue;
    if (shouldSkip(node.parentElement) || isLegit(text)) continue;
    leftovers.push(text);
  }
  doc.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach((el) => {
    if (shouldSkip(el)) return;
    ['placeholder', 'title', 'aria-label', 'alt'].forEach((a) => {
      const v = (el.getAttribute(a) || '').trim();
      if (!v || !HAS_LATIN.test(v) || HAS_CJK.test(v) || isLegit(v)) return;
      attrLeftovers.push(a + '=' + v);
    });
  });

  const result = { name, leftovers, attrLeftovers, errors, title: doc.title };
  window.close();
  return result;
}

(async () => {
  const only = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  let total = 0;
  let failed = false;
  for (const [name, file] of PAGES) {
    if (only.length && !only.includes(name)) continue;
    const r = await check(name, file);
    const uniq = [...new Set(r.leftovers)];
    total += r.leftovers.length;
    fs.writeFileSync(path.join(OUT, name + '.txt'), [
      `# ${r.name}  title=${r.title}`,
      `## 残留英文文本节点（${uniq.length} 种 / ${r.leftovers.length} 处）`,
      ...uniq.map((s) => '- ' + s),
      `## 残留属性（${r.attrLeftovers.length}）`,
      ...[...new Set(r.attrLeftovers)].map((s) => '- ' + s),
      '## 错误',
      ...r.errors.map((s) => '- ' + s)
    ].join('\n'));
    console.log(`${r.name.padEnd(11)} 残留文本 ${String(r.leftovers.length).padStart(4)} 处 / ${String(uniq.length).padStart(3)} 种   属性 ${r.attrLeftovers.length}   标题 ${r.title}`);
    if (r.errors.length) { failed = true; console.log('   ⚠️ ' + r.errors.join('\n   ')); }
  }
  console.log('合计残留：' + total + '（明细见 test/out/）');
  process.exit(failed ? 1 : 0);
})();
