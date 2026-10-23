/**
 * v2 文档站（/v2/docs）回归检查。
 *
 * 覆盖边界（与 README 一致）：
 *   · 外壳（页头导航、侧边栏、搜索、目录、Copy 按钮）→ 必须全中文
 *   · 各级标题（h1-h3）→ 必须全中文（API 参考里的小写标识符除外）
 *   · Intro 页正文 → 必须全中文
 *   · 其余页面正文段落 → 属文档内容，不在本检查范围内
 *
 *   node check-v2.js
 *
 * 依赖 test/raw/v2-docs/*.html（由 fetch-pages.sh 下载）。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAW = path.join(__dirname, 'raw', 'v2-docs');
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'opencode-chinese.user.js'), 'utf8');

// 含中文标点，避免把「macOS：」这类已汉化的标签误判为英文
const CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;
// API 参考里的小写标识符 / 品牌 / 命令，保持原样
const KEEP = [
    /^[a-z][A-Za-z0-9]*$/,                       // agent / config / persistentPty
    /^(vLLM|OpenCode|OpenCode Go|GitHub|Docs|CLI|API|V1|V2|Console|Docker|Homebrew|npm|bun|pnpm|yarn|curl|paru|mise|vite\+|aur|macOS|Windows|Linux|ARM64|x64|Apple|Intel|JSON|JSONC|YAML|TOML|MCP|LSP|SDK|TUI|HTTP|HTTPS|URL|URI|UTC|AM|PM|ID|IP|LLM|AI|OS|CPU|GPU|RAM|RPC|ACP|SSE|Web|Desktop|Go|Zen|Mini|Markdown|Shell|Schema|SSO|SCIM|OAuth|WebSocket|WebSockets|LMStudio|Azure|Bedrock|Vertex|Copilot|Ollama|Git|Glob|Grep|Effect|JavaScript|TypeScript|Python|Cloudflare|Claude Code|Codex|Hermes|Pi|Raycast|HTTP API|AI Coding with OpenCode)$/,
    /^[\d\s.,:%$+\-–—*/×~`'"()[\]]+$/,
    /^(⌘K|Esc|\?|>|·)$/,
    /^(https?:\/\/|www\.|\/|#|@)/,
    /^[\w.+-]+@[\w.-]+$/,
    /^(OpenCode \| .*)$/,
];

function collect(window) {
  const doc = window.document;
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'TEXTAREA', 'SVG']);
  const nodes = [];
  const w = doc.createTreeWalker(doc.body, 4);
  let n;
  while ((n = w.nextNode())) {
    let e = n.parentElement, bad = false;
    for (; e; e = e.parentElement) if (skip.has(e.tagName)) { bad = true; break; }
    if (bad) continue;
    const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (t) nodes.push(t);
  }
  return {
    nodes,
    nav: [...doc.querySelectorAll('header nav a, details.mobile-navigation summary')].map((a) => a.textContent.trim()).filter(Boolean),
    side: [...doc.querySelectorAll('nav.docs-sidebar a')].map((a) => a.textContent.trim()).filter(Boolean),
    toc: [...doc.querySelectorAll('nav.docs-toc a')].map((a) => a.textContent.trim()).filter(Boolean),
    heads: [...doc.querySelectorAll('h1, h2, h3')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()),
    attrs: [...doc.querySelectorAll('[placeholder],[title],[aria-label]')]
      .flatMap((el) => ['placeholder', 'title', 'aria-label'].map((k) => el.getAttribute(k)).filter(Boolean))
      .map((s) => s.trim())
  };
}

function render(file) {
  const html = fs.readFileSync(path.join(RAW, file), 'utf8');
  const dom = new JSDOM(html, { url: 'https://opencode.ai/v2/docs/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.eval(SCRIPT);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  window.dispatchEvent(new window.Event('load'));
  const data = collect(window);
  window.close();
  return data;
}

const isTranslated = (s) => CJK.test(s) || !/[A-Za-z]/.test(s) || KEEP.some((re) => re.test(s));

const files = fs.existsSync(RAW) ? fs.readdirSync(RAW).filter((f) => f.endsWith('.html')) : [];
if (!files.length) {
  console.log('⚠️ 未找到 test/raw/v2-docs/*.html，请先运行 ./fetch-pages.sh');
  process.exit(1);
}

let fail = 0;
const rows = [];
for (const file of files) {
  const d = render(file);
  const miss = (arr) => [...new Set(arr)].filter((s) => s && !isTranslated(s));
  const navMiss = miss(d.nav);
  const sideMiss = miss(d.side);
  const headMiss = miss(d.heads);
  const tocMiss = miss(d.toc);
  const attrMiss = miss(d.attrs);
  // 只对 Intro 页检查正文
  const bodyMiss = file === 'index.html' ? miss(d.nodes) : [];
  const bad = navMiss.length + sideMiss.length + headMiss.length + tocMiss.length + attrMiss.length + bodyMiss.length;
  if (bad) fail++;
  rows.push({ file, navMiss, sideMiss, headMiss, tocMiss, attrMiss, bodyMiss, cjk: d.nodes.filter((s) => CJK.test(s)).length });
}

console.log('页面'.padEnd(20) + '中文节点  页头 侧栏 标题 目录 属性 正文');
rows.forEach((r) => console.log(r.file.replace('.html', '').padEnd(20) + String(r.cjk).padStart(7) +
  String(r.navMiss.length).padStart(5) + String(r.sideMiss.length).padStart(5) +
  String(r.headMiss.length).padStart(5) + String(r.tocMiss.length).padStart(5) + String(r.attrMiss.length).padStart(5) +
  String(r.bodyMiss.length).padStart(5)));

const detail = rows.filter((r) => r.navMiss.length || r.sideMiss.length || r.headMiss.length || r.tocMiss.length || r.attrMiss.length || r.bodyMiss.length);
if (detail.length) {
  console.log('\n=== 未翻译明细 ===');
  detail.slice(0, 8).forEach((r) => {
    console.log(r.file + ':');
    [['页头', r.navMiss], ['侧栏', r.sideMiss], ['标题', r.headMiss], ['目录', r.tocMiss], ['属性', r.attrMiss], ['正文', r.bodyMiss]]
      .filter(([, v]) => v.length).forEach(([k, v]) => console.log('  ' + k + ': ' + JSON.stringify(v.slice(0, 8))));
  });
}
console.log(`\n结果：${files.length - fail} / ${files.length} 个页面通过（外壳、标题与 Intro 正文均为中文）`);
process.exit(fail ? 1 : 0);
