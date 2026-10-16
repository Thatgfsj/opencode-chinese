/**
 * 用登录态把控制台各页面真实渲染出来，抓取所有可见文案与可译属性。
 * 只读浏览，不做任何修改操作。
 *
 * 用法：node sess-harvest.js [路径...]
 *   默认抓取 设置 及其子页 + 主页面。
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 9411, PROFILE = process.env.OC_SESS_PROFILE || '/tmp/oc-sess';
const OUT = path.join(__dirname, 'console-live');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (p) => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json();

const DUMP = `(() => {
  const skip = new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','IFRAME','CODE','PRE','KBD','SAMP','VAR','TEXTAREA','SVG']);
  const texts = [], attrs = [], options = [];
  const w = document.createTreeWalker(document.body, 4);
  let n;
  while ((n = w.nextNode())) {
    let e = n.parentElement, bad = false;
    for (; e; e = e.parentElement) if (skip.has(e.tagName)) { bad = true; break; }
    if (bad) continue;
    const t = (n.nodeValue || '').replace(/\\s+/g, ' ').trim();
    if (t) texts.push({ t, tag: n.parentElement ? n.parentElement.tagName : '' });
  }
  document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach((el) => {
    ['placeholder', 'title', 'aria-label', 'alt'].forEach((a) => {
      const v = (el.getAttribute(a) || '').replace(/\\s+/g, ' ').trim();
      if (v) attrs.push({ a, v, tag: el.tagName });
    });
  });
  document.querySelectorAll('option').forEach((o) => {
    const v = (o.textContent || '').replace(/\\s+/g, ' ').trim();
    if (v) options.push(v);
  });
  return JSON.stringify({ url: location.pathname, title: document.title, texts, attrs, options });
})()`;

(async () => {
    const wsId = process.argv[2] && process.argv[2].startsWith('org_') ? process.argv[2] : null;
    const edge = spawn((process.env.OC_EDGE || '/opt/microsoft/msedge/msedge'), ['--headless=new', `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`, '--no-first-run', '--disable-gpu', '--window-size=1440,1200', 'about:blank'],
        { stdio: 'ignore', detached: true });
    for (let i = 0; i < 40; i++) { try { await get('/json/version'); break; } catch (e) { await sleep(500); } }
    const page = (await get('/json/list')).find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0; const pend = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const send = (m, p = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise((r) => pend.set(i, r)); };
    const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
    await send('Page.enable'); await send('Runtime.enable');

    // 先用一次导航拿到 workspace id
    await send('Page.navigate', { url: 'https://opencode.ai/console/' });
    await sleep(9000);
    let org = wsId;
    if (!org) {
        const href = await ev('location.pathname');
        const m = /(org_[A-Za-z0-9]+)/.exec(href || '');
        org = m ? m[1] : null;
    }
    if (!org) { console.log('❌ 未能取得 workspace id，可能登录态失效'); process.exit(1); }
    console.log('workspace:', org);

    const base = `https://opencode.ai/console/${org}`;
    const routes = process.argv.slice(2).filter((a) => !a.startsWith('org_'));
    const list = routes.length ? routes : [
        '/settings',
        '/settings/general',
        '/settings/billing',
        '/settings/security',
        '/settings/members',
        '/settings/service-accounts',
        '/settings/policies',
        '/settings/integrations',
        '/settings/providers',
        '/settings/models',
        '/settings/routes',
        '/settings/sso',
        '/settings/controls',
        '/settings/appearance',
        '/settings/api-keys',
        '/settings/account',
        '/go',
        '/models',
        '/providers',
        '/controls',
        '/integrations',
        '/logs',
        '/audit'
    ];

    fs.mkdirSync(OUT, { recursive: true });
    const summary = [];
    for (const route of list) {
        const url = base + route;
        await send('Page.navigate', { url });
        await sleep(5200);
        const raw = await ev(DUMP);
        let data;
        try { data = JSON.parse(raw); } catch (e) { summary.push([route, 'ERR', String(raw).slice(0, 60)]); continue; }
        const name = route.replace(/[/]/g, '_').replace(/^_/, '') || 'root';
        fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data, null, 1));
        summary.push([route, data.texts.length, data.url]);
    }
    console.log('\n路径'.padEnd(32) + '文本节点  实际URL');
    summary.forEach(([r, n, u]) => console.log(String(r).padEnd(32) + String(n).padStart(6) + '  ' + String(u).slice(0, 60)));
    try { process.kill(-edge.pid); } catch (e) { /* ignore */ }
    process.exit(0);
})();
