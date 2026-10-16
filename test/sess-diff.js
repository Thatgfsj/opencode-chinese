/**
 * 对比真实渲染文案与词典，输出未覆盖清单。
 * 用法：node sess-diff.js [--all]
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const LIVE = path.join(__dirname, 'console-live');
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'opencode-chinese.user.js'), 'utf8');
const HOOKED = SCRIPT.replace('    registerMenus();', '    window.__t = { translateText: translateText };\n    registerMenus();');

// 有意保留英文：品牌/模型/协议/技术标识/数字/示例值
const KEEP = [
    /^(OpenCode|GitHub|GitLab|Zen|Go|Google|GitHub|Anthropic|OpenAI|Azure|AWS|Meta|DeepSeek|Mistral|Cohere|Groq|NVIDIA|MiniMax|Alibaba|Xiaomi|Moonshot|Z\.AI|xAI|Cerebras|Baseten|Chutes|Databricks|DeepInfra|DigitalOcean|Fireworks|Together AI|SiliconFlow|Vultr|Venice AI|Vercel|LiteLLM|Poolside|Thinking Machines|Hugging Face|OpenRouter|Cloudflare|Homebrew|Slack|UPI|Alipay|WeChat Pay|Google Workspace|Auth0|Okta|Microsoft Entra ID|Ping Identity|Amazon|Postgres|PlanetScale|Stripe|Big Pickle|Space Bunny|Kimi|Qwen|GLM|MiMo|Step|Muse|LongCat|Nemotron|GPT|Claude|Gemini|ChatGPT|MCP|API|SDK|CLI|TUI|LSP|ZDR|SSO|SCIM|OIDC|SAML|JSON|CSV|PDF|HTML|HTTP|HTTPS|URL|URI|UTC|AM|PM|ID|IP|RBAC|RPM|CI|CD|OS|CPU|GPU|RAM|LLM|PNG|SVG|WebP|REST|SQL|TOML|YAML|Markdown|Slack)$/,
    /^[\d\s.,:%+\-–—*/×~`'"()[\]]+$/,
    /^[$€]?[\d.,]+[TKM]?$/,
    /^(https?:\/\/|www\.|\/|#|@)/,
    /^[\w.+-]+@[\w.-]+$/,
    /^[a-z0-9][a-z0-9._:/-]*$/i,
    /^(e\.g\.|For example:?|Example)/i,
    /^[^\s]+[-_][^\s]+$/,           // 标识符：kebab/snake
    /^[a-z]+[A-Z][A-Za-z]*$/,       // camelCase
    /^(xxxx|XXXX|hello@|jeff@|owner@|Acme)/i,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/,
    /^(v?\d+(\.\d+)*)$/,
    /^(tok|1M|1K|0 days|30 days|Never|Jan \d)/,
    /^[A-Z][a-z]+ [A-Z][a-z]+$/,    // 人名
];

(async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'https://opencode.ai/console/', runScripts: 'outside-only'
    });
    dom.window.eval(HOOKED);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
    const t = dom.window.__t.translateText;

    const perPage = new Map();
    const all = new Set();
    for (const file of fs.readdirSync(LIVE).filter((f) => f.endsWith('.json'))) {
        const data = JSON.parse(fs.readFileSync(path.join(LIVE, file), 'utf8'));
        const miss = new Set();
        for (const item of data.texts) {
            const s = item.t;
            if (!/[A-Za-z]/.test(s)) continue;
            const r = t(s);
            if (r && /[\u4e00-\u9fff]/.test(r)) continue;
            if (KEEP.some((re) => re.test(s))) continue;
            miss.add(s);
            all.add(s);
        }
        for (const item of data.attrs) {
            const s = item.v;
            if (!/[A-Za-z]/.test(s)) continue;
            const r = t(s);
            if (r && /[\u4e00-\u9fff]/.test(r)) continue;
            if (KEEP.some((re) => re.test(s))) continue;
            miss.add('[' + item.a + '] ' + s);
            all.add('[' + item.a + '] ' + s);
        }
        for (const s of data.options) {
            if (!/[A-Za-z]/.test(s)) continue;
            const r = t(s);
            if (r && /[\u4e00-\u9fff]/.test(r)) continue;
            if (KEEP.some((re) => re.test(s))) continue;
            miss.add('[option] ' + s);
            all.add('[option] ' + s);
        }
        perPage.set(file.replace('.json', ''), [...miss]);
    }

    console.log('=== 各页未覆盖数 ===');
    [...perPage.entries()].sort((a, b) => b[1].length - a[1].length)
        .forEach(([p, m]) => console.log('  ' + p.padEnd(28) + m.length));

    const out = path.join(__dirname, 'console-live', 'untranslated.txt');
    fs.writeFileSync(out, [...all].sort().join('\n'));
    console.log('\n未覆盖去重合计: ' + all.size + ' 条 → ' + out);
    if (process.argv.includes('--all')) [...all].sort().forEach((s) => console.log(s));
    process.exit(0);
})();
