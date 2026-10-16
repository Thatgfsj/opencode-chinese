# OpenCode 中文化插件

一个用于 [opencode.ai](https://opencode.ai) 的油猴（用户脚本）汉化插件，思路与结构参考
[maboloshi/github-chinese](https://github.com/maboloshi/github-chinese)：
**词典精确匹配 + 正则规则 + TreeWalker 遍历 + MutationObserver 增量翻译**。

> **词条全部为人工翻译，不是机器翻译。** 站点原文以英文文案为主，译文按中文技术社区的习惯用词重写，
> 而不是逐词直译，详见[翻译原则与术语表](#翻译原则与术语表)。

- 脚本文件：[`opencode-chinese.user.js`](opencode-chinese.user.js)
- 验证台：[`test/`](test/)（jsdom，覆盖率 + 行为测试）

---

## 安装

1. 安装用户脚本管理器：[Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox / Safari）或
   [Violentmonkey](https://violentmonkey.github.io/)。
2. 安装脚本，任选一种：
   - **本地安装**：把 [`opencode-chinese.user.js`](opencode-chinese.user.js) 拖进浏览器窗口，或在该文件上右键 →
     用 Tampermonkey 打开；
   - **管理器导入**：Tampermonkey 面板 → 实用工具 → 导入 → 选择本文件。
3. 打开 <https://opencode.ai>，界面文案即变为简体中文。

> 提示：站点支持按浏览器语言自动返回中文。若你的浏览器语言是中文，页面本身已是站点官方简体中文，
> 此时本插件不会改动它（词典的键都是英文原文）。若想让**文档正文、隐私政策、更新日志条目**也变中文，
> 用脚本菜单里的「切换到站点官方简体中文」（用的是站点自带的官方译文，不是本插件的译文）。

---

## 覆盖范围

| 页面 | 覆盖情况 |
| --- | --- |
| 全站导航、页脚、语言/主题选择器、404 | ✅ 全部界面文案 |
| 首页 `/` | ✅ 主标题、卖点、增长数据、隐私板块、FAQ 问答、Zen 推广位 |
| Zen `/zen` | ✅ 正文、三步说明、用户评价、FAQ 问答 |
| Go `/go` | ✅ 套餐、模型额度表头、FAQ 问答、数据留存对照表 |
| 企业版 `/enterprise` | ✅ 正文、表单字段与占位符、校验提示、FAQ 问答 |
| 下载 `/download` | ✅ 各平台/编辑器/集成区块、FAQ 问答 |
| 品牌 `/brand` | ✅ 全部文案 |
| 数据看板 `/data` | ✅ 区块标题、图例、方法说明、国家/地区名、图表日期与自动生成的摘要句 |
| 更新日志 `/changelog` | ⚠️ 外壳（标题、空态、按钮）；**发布条目正文保留英文** |
| 文档站 `/docs/**` | ⚠️ 外壳（侧边栏、搜索、本页目录、主题/语言选择、页脚、页面标题）与「简介」页正文；**其余页面正文保留英文** |
| 隐私政策 / 用户协议 | ⚠️ 仅页面标题；**条款正文保留英文原版** |

### 为什么不翻译文档正文与法律条款

- **法律文本**（隐私政策、用户协议）需要与英文原版严格对应，逐句改写会带来法律歧义风险；
  站点官方中文版同样保留了这两篇的英文原文。本插件只汉化页面标题，正文请以英文原版为准。
- **文档长篇正文**与**更新日志条目**属于「内容」而非「界面」，与 GitHub 中文化插件不翻译
  issue / 文章正文的取舍一致；机器翻译这类长文正是本项目要避免的。
- 需要文档正文中文时，用脚本菜单切到站点官方简体中文即可。

---

## 翻译原则与术语表

1. **agent → 智能体**，`coding agent → 编程智能体`，`agentic coding → 智能体编程`。
   「代理」在中文语境里多指 proxy（网络代理），容易误解，故不采用。
2. 面向开发者，人人称统一用**「你」**，不用「您」，避免生硬的官腔。
3. **不翻译**：产品名与模型名（OpenCode、Zen、Go、Claude、GPT、Gemini、Big Pickle…）、
   命令与代码、协议与缩写（TUI、CLI、SDK、LSP、MCP、ZDR、API）、平台与厂商名（GitHub、macOS、Windows）。
4. 金额、版本号、URL、代码标识符一律保持原样；数字与中文之间保留空格（如「每月 $10」）。
5. 中文标点使用全角，括号内的平台名转换为全角括号（如 `macOS（Apple 芯片）`）。

| 英文 | 译文 | 说明 |
| --- | --- | --- |
| agent / coding agent | 智能体 / 编程智能体 | 不用「代理」 |
| provider | 提供商 | |
| session | 会话 | |
| keybinds | 快捷键 | |
| formatters | 格式化工具 | |
| permissions / policies | 权限 / 策略 | |
| retention | 留存 | 数据留存 |
| top up | 充值 | |
| pay as you go | 按量付费 | |
| limits / allowance | 额度 / 限额 | |
| GitHub Stars | GitHub 星标 | 站点官方中文此条漏译 |
| Fig 1. | 图 1. | |
| coding models | 编程模型 | |

### 顺带修掉的站点小问题

脚本在**英文页与官方中文页**上都会运行（词典键是英文原文），因此下列官方中文版遗留的英文也会被补上：

- 站点 i18n 漏译，界面上直接显示键名 `app.header.home` / `app.header.docs` → 已译为「首页 / 文档」；
- 官方中文版仍留英文的地方：Zen 页用户评价、文档侧边栏若干项（`Web`、`Console`、`Policies`、
  `References`、`Releases`、`Windows Subsystem for Linux (WSL)`）、首页 `Data` / `GitHub Stars`、
  数据页图表日期 `AUG 22`（520 处）。

另外一点需要说明：站点官方中文把页脚的 Discord 项显示为「飞书」（链接仍指向 Discord 邀请）。
这是站点自己的地域化处理，本插件**不覆盖**；英文页按原文保留 `Discord`。

---

## 脚本菜单

安装后点击 Tampermonkey 图标即可看到：

| 菜单项 | 作用 |
| --- | --- |
| 汉化：已启用 / 已停用 | 一键开关（设置会保存在本地，刷新后生效） |
| 🇨🇳 切换到站点官方简体中文 | 写入 `oc_locale=zh` Cookie，文档站同时改写为 `/docs/zh-cn/...`，用于获得整站（含文档与条款）中文 |
| 🇺🇸 恢复站点英文 | 清除上述 Cookie，回到英文原版 + 本插件翻译 |
| ℹ️ 关于本插件 | 查看版本与覆盖范围 |

---

## 工作原理

```
document-start
   └─ boot()                    页面加载即启动
        ├─ scanAll()            TreeWalker 遍历整页：文本节点 + placeholder/title/aria-label/alt
        ├─ scheduleScans()      0/80/300/800/2000/5000ms 补扫，追赶 Solid 水合与懒加载
        ├─ MutationObserver     增量处理新增节点、文本变更、属性变更（60ms 合并窗口）
        └─ URL 监听             popstate/hashchange + 700ms 轮询，覆盖单页应用路由切换
```

几个关键实现细节：

- **词典命中优先，其次正则**：`I18N` 是「英文原文 → 中文」的精确映射，覆盖站点 i18n 的键结构
  （站点用 `beforeLink` / `link` / `afterLink` 之类的模板键，正好对应 DOM 里的文本节点切分，
  因此逐条精确匹配即可拼出通顺整句）；日期、图表数值等动态内容交给 `REGEXP` 规则。
- **文本归一化**：SSR/MDX 渲染出的文本节点内部常含换行缩进，站点文案又混用直引号与弯引号
  （`'` / `’`）。匹配前统一折叠空白、统一引号，避免「明明有词条却不命中」。
- **幂等**：译文含汉字即跳过，所以重复扫描、重复触发不会二次翻译，也不会与自身写入的
  MutationObserver 记录形成死循环。
- **安全**：`script/style/code/pre/kbd/textarea/svg/contenteditable/translate="no"` 整棵子树跳过，
  品牌名与命令绝不会被改；只改文本与少数属性，不动 DOM 结构。
- **多义词**：`PAGE_I18N` 按路径提供页面级词条，例如 Zen 页评价里的 `With` → 「用」。

---

## 验证

`test/` 下是一套基于 jsdom 的验证台：把脚本注入**真实页面快照**，统计仍为英文的可见文本。

```bash
cd test
npm install          # 安装 jsdom
./fetch-pages.sh     # 抓取验证用的页面快照到 test/raw/（未入库，必须先执行）
node behavior.js     # 行为测试
node check.js        # 覆盖率检查（明细写入 test/out/）
node regression-zh.js # 官方中文页回归（只应补译英文残留，不得破坏中文）
```

最近一次运行结果：

```
【行为测试】 24 通过 / 0 失败
  ✅ 幂等性：二次扫描后正文完全一致
  ✅ DOM 结构安全：元素数量一致 (664)、HTML 体积变化 < 2%
  ✅ 动态节点 / placeholder / aria-label / title 均被翻译，且保留首尾空白
  ✅ 代码块与 pre 内容不被翻译
  ✅ 正则规则：AUG 22 → 8月22日、更新时间转 24 小时制、Fig 1. → 图 1.
  ✅ SPA 路由切换后页面级词条生效
  ✅ 停用开关生效
  ✅ 菜单：写 oc_locale Cookie、/docs/agents → /docs/zh-cn/agents、可还原、可剥离 /zh 前缀

【覆盖率】 残留英文文本
  home 2 · zen 0 · go 0 · enterprise 0 · download 0 · brand 0 · data 0 · docs 1
  changelog 241 · privacy 374 · terms 106   ← 全部为发布条目/法律条款正文，属有意保留
```

`home` 残留的 2 条是 `GitHub Copilot`、`ChatGPT Plus/Pro`，`docs` 残留 1 条是 `OpenCode Zen`，
均为产品名，按翻译原则保留原样。

官方中文页回归（`node regression-zh.js`，对比注入前后每个文本节点）：

```
home_zh    变更 2 处   Data → 数据、GitHub Stars → GitHub 星标
zh_zen     变更 13 处  用户评价等英文残留
zh_data    变更 520 处 AUG 22 → 8月22日 等图表日期
zh_docs    变更 10 处  app.header.home/docs、Web、Console、Policies、Releases…
无一处中文被误改，无脚本报错。
```

---

## 自定义

- **加词条**：在 `opencode-chinese.user.js` 的 `I18N` 里追加 `'English': '中文'`。
  键必须是**单个文本节点的完整内容**（可用开发者工具查看），首尾不要带空格；
  引擎会自动折叠节点内部换行、统一弯引号，所以不必为换行写法额外加词条。
- **加动态规则**：在 `REGEXP` 里追加 `[/正则/, '替换']`，替换串支持 `$1`；需要计算时用函数
  `(m, g1) => '...'`。
- **页面级多义词**：在 `PAGE_I18N` 中按路径前缀添加。
- **发布到 Greasy Fork 前**：把头部的 `@namespace`、`@supportURL` 改成你自己的仓库地址
  （Tampermonkey 用 `@namespace` 区分同名脚本并检查更新）。
- 改完记得跑 `node --check opencode-chinese.user.js` 与 `cd test && node behavior.js`。

---

## 已知限制

- 站点为 SolidStart 单页应用，首屏水合期间会重绘部分节点；脚本用「多次补扫 + MutationObserver」
  兜住这种情况，但极端慢速网络下可能有一瞬间仍显示英文。
- 站点文案会随版本更新，新增文案若不在词典中会保持英文，欢迎按上面的方式补充。
- 数据看板的图表由运行时数据生成，若站点改变图表提示文案格式，相关正则需同步调整。

## 许可与致谢

- 本脚本以 GPL-3.0 发布。
- 结构与思路参考 [maboloshi/github-chinese](https://github.com/maboloshi/github-chinese)
  （GitHub 中文化插件，原作者楼教主 / 沙漠之子），以及其前身 `52cik/github-hans`。
- 词条为本项目自行翻译，术语沿用站点官方中文版中已通行且准确的部分（如「提供商」「会话」「额度」）。
