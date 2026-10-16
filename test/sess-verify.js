/**
 * 真实页面验证：用登录态渲染每个页面 → 注入 userscript → 统计中文与残留英文。
 * 只读浏览。用法：node sess-verify.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 9412, PROFILE = process.env.OC_SESS_PROFILE || '/tmp/oc-sess';
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'opencode-chinese.user.js'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (p) => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json();

const STATS = `(() => {
  const skip = new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','IFRAME','CODE','PRE','KBD','SAMP','VAR','TEXTAREA','SVG']);
  const KEEP = [/^(OpenCode|GitHub|Zen|Go|Google|Anthropic|OpenAI|Azure|AWS|Meta|DeepSeek|Mistral|Cohere|Groq|NVIDIA|MiniMax|Alibaba|Xiaomi|Moonshot|Z\\\\.AI|xAI|Cerebras|Baseten|Chutes|Databricks|DeepInfra|DigitalOcean|Fireworks|Together|SiliconFlow|Vultr|Venice|Vercel|LiteLLM|Poolside|Hugging|OpenRouter|Cloudflare|Homebrew|Slack|UPI|Alipay|WeChat|Console MCP|AIX)/,
    /^[\\\\d\\\\s.,:%$+\\\\-–—*/×~\\\`'"()\\\\[\\\\]]+$/, /^[a-z0-9][a-z0-9._:/+-]*$/i,
    /^(Claude|GPT|Gemini|Grok|Kimi|GLM|Qwen|MiMo|DeepSeek|MiniMax|LongCat|Jev|LL|Beam|Big Pickle|Space Bunny|Muse|Step|Nemotron|Fable|Opus|Sonnet|Haiku|Mistral|v\\\\d)/,
    /^[\\\\w.+-]+@[\\\\w.-]+$/, /^(e\\\\.g\\\\.|Example)/i, /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\\\b/,
    /^[A-Z]{2,}$/, /^(tok|in|out)$/];
  const texts = [], latin = [], cjk = [];
  const w = document.createTreeWalker(document.body, 4);
  let n;
  while ((n = w.nextNode())) {
    let e = n.parentElement, bad = false;
    for (; e; e = e.parentElement) if (skip.has(e.tagName)) { bad = true; break; }
    if (bad) continue;
    const t = (n.nodeValue || '').replace(/\\s+/g, ' ').trim();
    if (!t) continue;
    texts.push(t);
    if (/[\\u4e00-\\u9fff]/.test(t)) cjk.push(t);
    else if (/[A-Za-z]/.test(t) && !KEEP.some((re) => re.test(t))) latin.push(t);
  }
  return JSON.stringify({ marker: document.documentElement.dataset.ocZh || null,
    total: texts.length, cjk: cjk.length, latin: [...new Set(latin)],
    sample: cjk.slice(0, 8) });
})()`;

(async () => {
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

    await send('Page.navigate', { url: 'https://opencode.ai/console/' });
    await sleep(9000);
    const org = (/(org_[A-Za-z0-9]+)/.exec(await ev('location.pathname')) || [])[1];
    if (!org) { console.log('❌ 未取得 workspace'); process.exit(1); }
    const base = `https://opencode.ai/console/${org}`;

    const routes = ['/settings', '/settings/billing', '/settings/security', '/settings/members',
        '/settings/service-accounts', '/settings/appearance', '/settings/api-keys', '/settings/account',
        '/models', '/providers', '/controls', '/integrations', '/go', '/logs', '/audit'];

    console.log('页面'.padEnd(30) + '标记  文本  中文  残留英文');
    const leftovers = [];
    for (const route of routes) {
        await send('Page.navigate', { url: base + route });
        await sleep(5200);
        await ev(SCRIPT);          // 注入 userscript
        await sleep(1800);
        let s;
        try { s = JSON.parse(await ev(STATS)); } catch (e) { console.log(route.padEnd(30) + '解析失败'); continue; }
        console.log(route.padEnd(30) + String(s.marker).padEnd(6) + String(s.total).padStart(5) +
            String(s.cjk).padStart(6) + String(s.latin.length).padStart(9));
        if (s.latin.length) leftovers.push([route, s.latin]);
    }
    if (leftovers.length) {
        console.log('\n=== 残留英文明细 ===');
        leftovers.forEach(([r, list]) => console.log('  ' + r + ': ' + JSON.stringify(list.slice(0, 12))));
    } else {
        console.log('\n所有页面均无残留英文（除品牌/模型名）');
    }
    try { process.kill(-edge.pid); } catch (e) { /* ignore */ }
    process.exit(0);
})();
