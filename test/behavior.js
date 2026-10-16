/**
 * 行为测试：幂等性、DOM 结构安全、动态节点、属性翻译、代码块保护、
 *           正则规则、SPA 路由切换、停用开关。
 *
 *   npm install && node behavior.js
 *
 * 依赖 test/raw/ 下的页面快照（先执行 ./fetch-pages.sh，或按 README 手工下载）。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAW = path.join(__dirname, 'raw');
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'opencode-chinese.user.js'), 'utf8');

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra ? ' → ' + extra : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function boot(file) {
  const html = fs.readFileSync(path.join(RAW, file), 'utf8');
  const dom = new JSDOM(html, { url: 'https://opencode.ai/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.eval(SCRIPT); // 模拟 @run-at document-start
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  window.dispatchEvent(new window.Event('load'));
  return dom;
}

(async () => {
  console.log('【1】幂等性：重复扫描不产生二次翻译');
  {
    const dom = boot('home.html');
    const { window } = dom;
    await sleep(150);
    const before = window.document.body.textContent;
    window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    window.dispatchEvent(new window.Event('load'));
    await sleep(400);
    assert('二次扫描后正文完全一致', before === window.document.body.textContent);
    assert('标题已汉化', window.document.title === 'OpenCode | 开源 AI 编程智能体', window.document.title);
    window.close();
  }

  console.log('【2】DOM 结构安全：只改文本，不动结构');
  {
    const raw = fs.readFileSync(path.join(RAW, 'home.html'), 'utf8');
    const plain = new JSDOM(raw, { url: 'https://opencode.ai/', runScripts: 'outside-only' });
    const beforeCount = plain.window.document.querySelectorAll('*').length;
    const beforeHTML = plain.window.document.body.innerHTML.length;
    plain.window.close();

    const dom = boot('home.html');
    await sleep(300);
    const afterCount = dom.window.document.querySelectorAll('*').length;
    const afterHTML = dom.window.document.body.innerHTML.length;
    assert('元素数量一致 (' + beforeCount + ')', beforeCount === afterCount, beforeCount + ' vs ' + afterCount);
    assert('HTML 体积变化 < 2%', Math.abs(afterHTML - beforeHTML) / beforeHTML < 0.02, beforeHTML + ' → ' + afterHTML);
    dom.window.close();
  }

  console.log('【3】动态节点（MutationObserver + 属性）');
  {
    const dom = boot('home.html');
    const { window } = dom;
    await sleep(150);

    const btn = window.document.createElement('button');
    btn.textContent = 'Read docs';
    window.document.body.appendChild(btn);
    await sleep(200);
    assert('新增按钮被翻译', btn.textContent === '阅读文档', btn.textContent);

    const span = window.document.createElement('span');
    span.textContent = '  Built for privacy first  ';
    window.document.body.appendChild(span);
    await sleep(200);
    assert('保留节点首尾空白', span.textContent === '  隐私优先  ', JSON.stringify(span.textContent));

    const input = window.document.createElement('input');
    input.setAttribute('placeholder', 'Email address');
    window.document.body.appendChild(input);
    await sleep(200);
    assert('placeholder 被翻译', input.getAttribute('placeholder') === '电子邮箱地址', input.getAttribute('placeholder'));

    const icon = window.document.createElement('button');
    icon.setAttribute('aria-label', 'Open menu');
    icon.setAttribute('title', 'Install options');
    window.document.body.appendChild(icon);
    await sleep(200);
    assert('aria-label 被翻译', icon.getAttribute('aria-label') === '打开菜单', icon.getAttribute('aria-label'));
    assert('title 被翻译', icon.getAttribute('title') === '安装方式', icon.getAttribute('title'));
    window.close();
  }

  console.log('【4】保护代码、命令与品牌名');
  {
    const dom = boot('docs.html');
    const { window } = dom;
    await sleep(300);
    const codes = [...window.document.querySelectorAll('code, pre')].map((e) => e.textContent).join('\n');
    assert('代码块保持原样', /curl|npm|brew|opencode/.test(codes), codes.slice(0, 40));
    const pre = window.document.createElement('pre');
    pre.textContent = 'Read docs';
    window.document.body.appendChild(pre);
    await sleep(200);
    assert('pre 内文本不翻译', pre.textContent === 'Read docs', pre.textContent);
    window.close();
  }

  console.log('【5】正则规则：动态数值与日期');
  {
    const data = boot('data.html');
    await sleep(500);
    const text = data.window.document.body.textContent;
    assert('图表日期 AUG 22 → 8月22日', text.includes('8月22日'));
    assert('更新时间转 24 小时制', /更新于 \d{1,2}月\d{1,2}日 \d{2}:\d{2} UTC/.test(text) && !/\d{1,2}:\d{2} (AM|PM) UTC/.test(text),
      (text.match(/更新于[^。]{0,24}/) || [''])[0]);
    data.window.close();

    const home = boot('home.html');
    await sleep(300);
    assert('Fig 1. → 图 1.', home.window.document.body.textContent.includes('图 1.'));
    home.window.close();
  }

  console.log('【6】SPA 路由切换后的页面级词条');
  {
    const dom = boot('zen.html');
    const { window } = dom;
    await sleep(150);
    window.history.pushState({}, '', '/zen');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await sleep(200);
    const span = window.document.createElement('span');
    span.textContent = 'With';
    window.document.body.appendChild(span);
    await sleep(250);
    assert('/zen 下 With → 用', span.textContent === '用', span.textContent);
    window.close();
  }

  console.log('【7】停用开关');
  {
    const html = fs.readFileSync(path.join(RAW, 'home.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'https://opencode.ai/', runScripts: 'outside-only' });
    const { window } = dom;
    window.localStorage.setItem('opencode-zh:enabled', 'false');
    window.eval(SCRIPT);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    await sleep(200);
    assert('停用后保持英文', window.document.body.textContent.includes('Read docs'), window.document.title);
    window.close();
  }

  console.log('【8】站点菜单：切换到官方简体中文（完整模式）');
  {
    // 注入测试钩子：暴露内部函数、拦截跳转（正式脚本不受影响）
    const HOOKED = SCRIPT
      .replace('    registerMenus();', '    window.__ocTest = { setSiteLocale: setSiteLocale };\n    registerMenus();')
      .replace("location.href = '/' + segs.join('/') + location.search + location.hash;", "window.__ocTest.lastNav = '/' + segs.join('/') + location.search + location.hash;");

    const menus = [];
    const html = fs.readFileSync(path.join(RAW, 'home.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'https://opencode.ai/docs/agents', runScripts: 'outside-only' });
    const { window } = dom;
    window.GM_registerMenuCommand = (label, fn) => menus.push({ label, fn });
    window.GM_getValue = (k, d) => d;
    window.GM_setValue = () => {};
    window.GM_notification = () => {};
    window.eval(HOOKED);
    await sleep(150);
    assert('注册了 4 个菜单项', menus.length === 4, menus.map((m) => m.label).join(' | '));
    assert('菜单标签含中文', menus.every((m) => /[\u4e00-\u9fff]/.test(m.label)));

    window.__ocTest.setSiteLocale('zh');
    assert('写入 oc_locale=zh Cookie', window.document.cookie.includes('oc_locale=zh'), window.document.cookie);
    assert('文档站 URL 改写为 /docs/zh-cn/agents', window.__ocTest.lastNav === '/docs/zh-cn/agents', window.__ocTest.lastNav);

    window.__ocTest.setSiteLocale('en');
    assert('清除 Cookie', !/oc_locale=zh/.test(window.document.cookie), window.document.cookie);
    assert('文档站 URL 还原为 /docs/agents', window.__ocTest.lastNav === '/docs/agents', window.__ocTest.lastNav);
    window.close();

    const dom2 = new JSDOM(html, { url: 'https://opencode.ai/zen', runScripts: 'outside-only' });
    dom2.window.GM_registerMenuCommand = () => {};
    dom2.window.eval(HOOKED);
    await sleep(120);
    dom2.window.__ocTest.setSiteLocale('zh');
    assert('非文档页仅写 Cookie、不改路径', dom2.window.__ocTest.lastNav === '/zen' &&
      dom2.window.document.cookie.includes('oc_locale=zh'), dom2.window.__ocTest.lastNav);
    dom2.window.close();

    const dom3 = new JSDOM(html, { url: 'https://opencode.ai/zh/data', runScripts: 'outside-only' });
    dom3.window.GM_registerMenuCommand = () => {};
    dom3.window.eval(HOOKED);
    await sleep(120);
    dom3.window.__ocTest.setSiteLocale('en');
    assert('剥掉路径语言前缀 /zh/data → /data', dom3.window.__ocTest.lastNav === '/data', dom3.window.__ocTest.lastNav);
    dom3.window.close();
  }

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail === 0 ? 0 : 1);
})();
