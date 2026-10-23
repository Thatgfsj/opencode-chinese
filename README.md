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
| **v2 文档站 `/v2/docs/**`** | ✅ 页头导航、侧边栏、搜索框、本页目录、Copy 按钮、全部 h1~h3 小节标题、属性提示；**「Intro」页正文也全中文**；⚠️ 其余 27 页的正文段落保留英文 |
| **控制台 `/console/**`** | ✅ 用量/账单/点数、Go 订阅面板、API 密钥、成员与角色、集成与提供商、策略与路由、SSO/SCIM、监控告警、支持工具、登录/注册/授权/设备码等界面文案（bundle 抽取 1218 条中覆盖 1115 条，91.5%） |
| 隐私政策 / 用户协议 | ⚠️ 仅页面标题；**条款正文保留英文原版** |

> 控制台（`/console`，也可通过 `console.opencode.ai` 进入）是独立的纯客户端渲染管理后台，
> 站点自身**没有 i18n**（英文硬编码在 bundle 里），所以它完全依赖本插件的控制台词典。
> bundle 里的懒加载 chunk 必须全部抓到才能算准覆盖率——
> `test/fetch-pages.sh` 会从 shell HTML 取入口再递归抓取，缺 chunk 会低估（也会漏词条）。
> 未覆盖的 103 条是模型/厂商名（OpenAI、Anthropic、DeepSeek…）、缩写（API、MCP、SSO、JSON）、
> 示例值（`Acme Inc.`、`owner@example.com`）与运行时内部错误串，按原则本就不译。

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
| Credits（控制台） | 点数 | 与 `Limits`（限额）、`Balance`（余额）区分开 |
| workspace | 工作区 | |
| service account | 服务账号 | |
| Credits / allowance | 点数 / 额度 | 控制台与站点文案保持一致 |

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
- **词典分层**：`I18N` 全站生效；`I18N_CONSOLE` 只在 `/console` 下参与匹配，
  这样控制台里的通用词（`Open`、`Name`、`Type`、`From`、`Service`…）不会影响营销站。

---

## 验证

`test/` 下是一套基于 jsdom 的验证台：把脚本注入**真实页面快照**，统计仍为英文的可见文本；
控制台因为是纯客户端渲染，改为从真实 bundle 抽取文案、逐条喂给脚本的翻译函数。

```bash
cd test
npm install           # 安装 jsdom
./fetch-pages.sh      # 抓取页面快照与控制台 bundle 到 test/raw/（未入库，必须先执行）
node behavior.js      # 行为测试
node check.js         # 营销站/文档站覆盖率（明细写入 test/out/）
node regression-zh.js # 官方中文页回归（只应补译英文残留，不得破坏中文）
node console-coverage.js  # 控制台词典覆盖率（明细写入 test/out/console-missing.txt）
node check-v2.js          # v2 文档站回归（外壳/侧栏/目录/标题/Intro 正文）
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

【营销站/文档站覆盖率】 残留英文文本
  home 2 · zen 0 · go 0 · enterprise 0 · download 0 · brand 0 · data 0 · docs 1
  changelog 241 · privacy 374 · terms 106   ← 全部为发布条目/法律条款正文，属有意保留

【控制台覆盖率】bundle 抽取 1218 条，已汉化 1115 条（91.5%）
  未覆盖 103 条：模型/厂商名、缩写、示例值、运行时内部错误串

【v2 文档站】28 / 28 个页面通过
  页头、侧栏、目录、h1~h3 标题均为中文；Intro 页正文 113 个中文节点、0 残留英文
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

### 用真实登录态复核控制台（维护者用，只读）

控制台大部分界面对未登录用户不可见，bundle 抽取也会漏掉运行时拼接的文案。要"翻全"，可以
用浏览器登录态把每个页面真实渲染出来逐条核对——**全过程只读浏览，不做任何写操作**：

```bash
# 1) 复制登录态（只复制 Cookies 与 Local State，不含任何脚本/扩展数据）
mkdir -p /tmp/oc-sess/Default
cp -a ~/.config/microsoft-edge/Local\ State /tmp/oc-sess/
cp -a ~/.config/microsoft-edge/Default/Cookies /tmp/oc-sess/Default/

# 2) 逐页抓取渲染后的文案与可译属性 → test/console-live/*.json
cd test && node sess-harvest.js

# 3) 与词典对比，列出未覆盖项
node sess-diff.js            # 汇总数量；--all 打印全部
node sess-diff.js --all

# 4) 反向验证：注入脚本后逐页统计中文与残留英文
node sess-verify.js

# 5) 用完删除登录态副本
rm -rf /tmp/oc-sess
```

环境变量：`OC_SESS_PROFILE`（登录态目录，默认 `/tmp/oc-sess`）、`OC_EDGE`（浏览器可执行文件路径）。

最近一次复核结果（设置、模型、提供商、控制、集成、Go、日志、审计共 15 个页面）：
**除用户自己的邮箱外，无残留英文**。

---

## 自定义

- **加词条**：在 `opencode-chinese.user.js` 的 `I18N`（全站）或 `I18N_CONSOLE`（仅 `/console`）
  里追加 `'English': '中文'`。键必须是**单个文本节点的完整内容**（可用开发者工具查看），
  首尾不要带空格；引擎会自动折叠节点内部换行、统一弯引号，所以不必为换行写法额外加词条。
- **加动态规则**：在 `REGEXP` 里追加 `[/正则/, '替换']`，替换串支持 `$1`；需要计算时用函数
  `(m, g1) => '...'`。
- **页面级多义词**：在 `PAGE_I18N` 中按路径前缀添加。
- **控制台新增文案**：改完运行 `node test/console-coverage.js` 即可看到还剩哪些没覆盖
  （`test/out/console-missing.txt`）。
- 改完记得跑 `node --check opencode-chinese.user.js` 与 `cd test && node behavior.js`。

---

## 排障：脚本好像没生效

脚本在 `@run-at document-start` 注入，**安装/更新之前就已经打开的标签页不会自动生效**，先按顺序排查：

1. **刷新页面**（F5 / Ctrl+R）。控制台是 SPA，务必整页刷新，不要只在站内点来点去。
2. **确认油猴里是最新版**：Tampermonkey 面板 → 本脚本应显示版本 `1.0.0`，
   「安装来源」为 `raw.githubusercontent.com/Thatgfsj/opencode-chinese/...`；
   若显示的是本地地址或旧版本，点「重新安装」再刷新。
   脚本头里带 `@updateURL`/`@downloadURL`，之后会自动更新。
3. **在页面上自检**：F12 → Console → 执行

   ```js
   document.documentElement.dataset.ocZh   // 期望输出 "on"
   ```

   - `"on"`：脚本正在运行，若仍是英文，多半是该处文案不在词典里（把文字发我即可补）；
   - `undefined`：脚本没在这个页面运行 → 检查油猴面板里脚本是否启用、
     站点访问权限是否为「所有网站」，以及是否有另一个同名脚本被禁用。
4. **看控制台报错**：F12 → Console 里若有来自本脚本的红色报错，连同页面 URL 一起反馈。

---

## 已知限制

- 站点为 SolidStart 单页应用，首屏水合期间会重绘部分节点；脚本用「多次补扫 + MutationObserver」
  兜住这种情况，但极端慢速网络下可能有一瞬间仍显示英文。控制台（React SPA）同理。
- 站点文案会随版本更新，新增文案若不在词典中会保持英文，欢迎按上面的方式补充。
- 控制台词典来自对当前 bundle 的全量抽取（覆盖率 91.4%），剩余未译项为厂商/模型名、
  技术缩写、示例值与运行时内部错误串；若站点新增界面文案，覆盖率会下降，需按上表补充。
- 数据看板与控制台的图表由运行时数据生成，若站点改变提示文案格式，相关正则需同步调整。

## 许可与致谢

- 本脚本以 GPL-3.0 发布。
- 结构与思路参考 [maboloshi/github-chinese](https://github.com/maboloshi/github-chinese)
  （GitHub 中文化插件，原作者楼教主 / 沙漠之子），以及其前身 `52cik/github-hans`。
- 词条为本项目自行翻译，术语沿用站点官方中文版中已通行且准确的部分（如「提供商」「会话」「额度」）。
