/**
 * 控制台（/console）词典覆盖率检查。
 *
 * 控制台是纯客户端渲染的 React SPA，jsdom 无法完整运行，因此这里改为
 * 「从真实 bundle 中抽取界面文案 → 逐条喂给脚本的翻译函数」，统计覆盖率。
 *
 *   node console-coverage.js [--list]
 *
 * 依赖 test/raw/console/assets/app-pages-*.js（由 fetch-pages.sh 下载）。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAW = path.join(__dirname, 'raw', 'console', 'assets');
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'opencode-chinese.user.js'), 'utf8');

// 抽取 HTML/React 属性位置上的可见文案
const PROPS = /(?:children|label|title|placeholder|ariaLabel|"aria-label"|description|heading|tooltip|message|subtitle|buttonText|emptyMessage|helperText|confirmText|cancelText|summary|body)\s*:\s*"((?:[^"\\]|\\.){2,220})"/g;

function extractStrings() {
    const out = new Set();
    for (const file of fs.readdirSync(RAW)) {
        if (!file.endsWith('.js')) continue;
        const src = fs.readFileSync(path.join(RAW, file), 'utf8');
        let m;
        while ((m = PROPS.exec(src))) {
            const v = m[1];
            if (!/[A-Za-z]/.test(v)) continue;
            if (/^[a-z0-9:_\-[\]/.]+$/.test(v)) continue;
            if (/[{}]|=>|className/.test(v)) continue;
            if (/^[a-z]+-[a-z]+-/.test(v)) continue;
            if (/[\w\s./:-]*\.(js|ts|tsx|css|json|svg|png)$/.test(v)) continue;
            if (v.startsWith('http') || v.startsWith('/') || v.startsWith('@') || v.startsWith('--')) continue;
            out.add(v.replace(/\s+/g, ' ').trim());
        }
        PROPS.lastIndex = 0;
    }
    return [...out];
}

// 注入测试钩子，暴露内部翻译函数（正式脚本不含该钩子）
const HOOKED = SCRIPT.replace(
    '    registerMenus();',
    '    window.__ocTest = { translateText: translateText, state: State };\n    registerMenus();'
);

(async () => {
    const strings = extractStrings();
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'https://opencode.ai/console/',
        runScripts: 'outside-only'
    });
    const { window } = dom;
    window.eval(HOOKED);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    const t = window.__ocTest.translateText;
    const consoleDictReady = window.__ocTest.state.consoleDict !== null;
    const missing = [];
    let ok = 0;
    for (const s of strings) {
        const r = t(s);
        if (r && /[\u3400-\u9fff]/.test(r)) ok++;
        else missing.push(s);
    }

    console.log('控制台词典是否按路径生效：' + (consoleDictReady ? '是' : '否（异常）'));
    console.log('bundle 抽取文案：' + strings.length + ' 条');
    console.log('已汉化：' + ok + ' 条  未覆盖：' + missing.length + ' 条  覆盖率 ' +
        (strings.length ? (ok / strings.length * 100).toFixed(1) : '0') + '%');

    const listPath = path.join(__dirname, 'out', 'console-missing.txt');
    fs.mkdirSync(path.dirname(listPath), { recursive: true });
    fs.writeFileSync(listPath, missing.join('\n'));
    console.log('未覆盖清单：' + listPath);
    if (process.argv.includes('--list')) missing.forEach((s) => console.log('  - ' + s));
    window.close();
    process.exit(0);
})();
