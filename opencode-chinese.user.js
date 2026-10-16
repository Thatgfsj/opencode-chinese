// ==UserScript==
// @name         OpenCode 中文化插件
// @name:en      OpenCode Chinese Localization
// @namespace    https://github.com/thatgfsj/opencode-chinese
// @description  汉化 opencode.ai：导航、首页、Zen、Go、企业版、下载、品牌、数据看板与文档站外壳。词条均为人工翻译，非机器翻译。
// @description:en  Localize opencode.ai into Simplified Chinese with hand-written translations.
// @icon         https://opencode.ai/favicon-96x96-v3.png
// @version      1.0.0
// @author       油猴汉化脚本
// @license      GPL-3.0
// @match        https://opencode.ai/*
// @match        https://www.opencode.ai/*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @supportURL   https://github.com/thatgfsj/opencode-chinese/issues
// ==/UserScript==

/*
 * OpenCode 中文化插件
 * ---------------------------------------------------------------
 * 思路参考 maboloshi/github-chinese（GitHub 中文化插件）：
 *   词典精确匹配 + 正则规则 + TreeWalker 遍历 + MutationObserver 增量翻译。
 *
 * 翻译原则（人工翻译，非机翻）：
 *   1. agent 一律译为「智能体」，coding agent → 编程智能体；
 *      agentic coding → 智能体编程（「代理」在中文里是 proxy，容易误解）。
 *   2. 面向开发者，人称统一用「你」，不使用「您」。
 *   3. 产品名、模型名、协议名、命令、代码不翻译：
 *      OpenCode / Zen / Go / TUI / CLI / SDK / LSP / MCP / ZDR / Claude / GPT 等保持原样。
 *   4. 金额、版本号、URL 保持原样；数字与中文之间保留必要空格。
 *
 * 覆盖范围：站点界面与站点自身文案（导航、页脚、首页、Zen、Go、企业版、
 *   下载、品牌、数据看板、更新日志外壳、文档站外壳与侧边栏、200/404）。
 * 不覆盖：文档正文长段落、隐私政策与用户协议正文、更新日志条目正文
 *   （与 GitHub 中文化插件不翻译 issue/文章正文同理）。需要整站中文时，
 *   可用脚本菜单切换到站点官方简体中文。
 */

(function () {
    'use strict';

    /* =========================== 配置 =========================== */

    const CONFIG = {
        // 翻译后不再处理的选择器（子树整体跳过）
        IGNORE_SELECTOR: [
            'script', 'style', 'noscript', 'template', 'iframe',
            'code', 'pre', 'kbd', 'samp', 'var',
            'textarea', 'svg', 'math', 'canvas',
            "[contenteditable]:not([contenteditable='false'])",
            "[translate='no']",
            '.shiki', '.expressive-code', '.astro-code',
            '[data-oc-zh-ignore]'
        ].join(','),

        // 需要翻译的元素属性
        ATTRS: ['placeholder', 'title', 'aria-label', 'alt'],

        // 首次加载 / 路由切换后的补扫时间点（毫秒），用于追赶 Solid 水合与懒加载
        SCAN_DELAYS: [0, 80, 300, 800, 2000, 5000],

        // MutationObserver 增量处理的合并窗口
        FLUSH_DELAY: 60,

        // 无 GM 存储时的 localStorage 键名
        STORE_KEY: 'opencode-zh:enabled',

        // 站点语言 Cookie（见站点 i18n 实现：oc_locale）
        LOCALE_COOKIE: 'oc_locale'
    };

    /* =========================== 词条库（人工翻译） =========================== */

    const I18N = {
        /* ---------- 站点通用 / 导航 / 页脚 ---------- */
        'Home': '首页',
        'Docs': '文档',
        'Data': '数据',
        'Models': '模型',
        'Teams': '团队',
        'Enterprise': '企业版',
        'Download': '下载',
        'Login': '登录',
        'Open menu': '打开菜单',
        'Get started for free': '免费开始',
        'Changelog': '更新日志',
        'Feishu': '飞书',
        'Brand': '品牌',
        'Privacy': '隐私',
        'Terms': '条款',
        'Brand assets': '品牌素材',
        'Copy logo as SVG': '复制 Logo（SVG）',
        'Copy wordmark as SVG': '复制文字标识（SVG）',
        'Cancel': '取消',
        'Contact us': '联系我们',
        'FAQ': '常见问题',
        'Learn more': '了解更多',
        'Get Started': '开始使用',
        'Model': '模型',
        'New': '新',
        'Warning': '警告',
        'Other': '其他',
        'Your browser does not support the video tag.': '你的浏览器不支持 video 标签。',
        // 站点 i18n 漏译、直接以键名显示的两处（站点自身缺陷）
        'app.header.home': '首页',
        'app.header.docs': '文档',

        /* ---------- 404 ---------- */
        'Not Found | opencode': '页面未找到 | OpenCode',
        '404 - Page Not Found': '404 - 页面未找到',
        'opencode logo light': 'opencode logo（浅色）',
        'opencode logo dark': 'opencode logo（深色）',

        /* ---------- 邮件订阅 ---------- */
        'Be the first to know when we release new products': '第一时间了解我们的新产品',
        'Join the waitlist for early access.': '加入候补名单，抢先体验。',
        'Email address': '电子邮箱地址',
        'Subscribe': '订阅',
        'Almost done, check your inbox and confirm your email address': '快完成了，请查收邮件并确认你的邮箱地址',

        /* ---------- 首页 ---------- */
        'OpenCode | The open source AI coding agent': 'OpenCode | 开源 AI 编程智能体',
        'The open source AI coding agent': '开源 AI 编程智能体',
        'Free models included or connect any model from any provider,': '内置免费模型，也可接入任意提供商的任意模型，',
        'including Claude, GPT, Gemini and more.': '包括 Claude、GPT、Gemini 等。',
        'Install options': '安装方式',
        'What is OpenCode?': 'OpenCode 是什么？',
        'OpenCode is an open source agent that helps you write code in your terminal, IDE, or desktop.': 'OpenCode 是一款开源智能体，帮你在终端、IDE 或桌面端写代码。',
        'LSP enabled': '支持 LSP',
        'Automatically loads the right LSPs for the LLM': '自动为 LLM 加载合适的 LSP',
        'Multi-session': '多会话',
        'Start multiple agents in parallel on the same project': '在同一项目上并行运行多个智能体',
        'Share links': '分享链接',
        'Share a link to any session for reference or to debug': '把任意会话的链接分享出去，便于参考或排查问题',
        'Log in with GitHub to use your Copilot account': '用 GitHub 账号登录，即可使用你的 Copilot 订阅',
        'Log in with OpenAI to use your ChatGPT Plus or Pro account': '用 OpenAI 账号登录，即可使用你的 ChatGPT Plus 或 Pro 订阅',
        'Any model': '任意模型',
        '75+ LLM providers through Models.dev, including local models': '通过 Models.dev 接入 75+ 家 LLM 提供商，也支持本地模型',
        'Any editor': '任意编辑器',
        'Available as a terminal interface, desktop app, and IDE extension': '提供终端界面、桌面应用和 IDE 扩展',
        'Read docs': '阅读文档',
        'GitHub Stars': 'GitHub 星标',
        'Contributors': '贡献者',
        'Monthly Devs': '月活跃开发者',
        'With over': '拥有超过',
        'GitHub stars,': '个 GitHub 星标、',
        'contributors, and over': '位贡献者，以及超过',
        'commits, OpenCode is used and trusted by over': '次提交，每月有超过',
        'developers every month.': '名开发者在使用并信赖 OpenCode。',
        'Built for privacy first': '隐私优先',
        'OpenCode does not store any of your code or context data, so that it can operate in privacy sensitive environments.': 'OpenCode 不会存储你的任何代码或上下文数据，因此可以在隐私敏感的环境中运行。',
        'Learn more about': '详细了解',
        'privacy': '隐私政策',
        'How do I use OpenCode?': '如何使用 OpenCode？',
        'Do I need extra AI subscriptions to use OpenCode?': '使用 OpenCode 需要额外订阅 AI 服务吗？',
        'Can I use my existing AI subscriptions with OpenCode?': '我能用现有的 AI 订阅吗？',
        'Can I only use OpenCode in the terminal?': 'OpenCode 只能在终端里用吗？',
        'How much does OpenCode cost?': 'OpenCode 收费吗？',
        'What about data and privacy?': '数据和隐私怎么处理？',
        'Is OpenCode open source?': 'OpenCode 是开源的吗？',
        'OpenCode is an open source agent that helps you write and run code with any AI model. It\'s available as a terminal-based interface, desktop app, or IDE extension.': 'OpenCode 是一款开源智能体，可以配合任意 AI 模型编写和运行代码，提供终端界面、桌面应用和 IDE 扩展。',
        'The easiest way to get started is to read the': '最快的入门方式是阅读',
        'intro': '入门指南',
        'Not necessarily, OpenCode comes with a set of free models that you can use without creating an account.': '不一定。OpenCode 自带一组免费模型，无需注册账号即可使用。',
        'Aside from these, you can use any of the popular coding models by creating a': '除此之外，你还可以注册一个',
        'account.': '账号，使用各种主流编程模型。',
        'While we encourage users to use Zen, OpenCode also works with all popular providers such as OpenAI, Anthropic, xAI etc.': '我们推荐你使用 Zen，同时 OpenCode 也兼容 OpenAI、Anthropic、xAI 等所有主流提供商。',
        'You can even connect your': '你甚至可以接入自己的',
        'local models': '本地模型',
        'Yes, OpenCode supports subscription plans from all major providers. You can use your Claude Pro/Max, ChatGPT Plus/Pro, or GitHub Copilot subscriptions.': '可以。OpenCode 支持各大提供商的订阅方案，包括 Claude Pro/Max、ChatGPT Plus/Pro 和 GitHub Copilot 订阅。',
        'Not anymore! OpenCode is now available as an app for your': '早就不止终端了！OpenCode 现在还提供',
        'desktop': '桌面端',
        'and': '和',
        'web': '网页端',
        'OpenCode is 100% free to use. It also comes with a set of free models. There might be additional costs if you connect any other provider.': 'OpenCode 完全免费，还自带一组免费模型。如果你接入了其他提供商，可能会产生额外费用。',
        'Your data and information is only stored when you use our free models.': '只有使用我们的免费模型时，你的数据和信息才会被存储。',
        'our models': '我们的模型',
        'Yes, OpenCode is fully open source. The source code is public on': '是的，OpenCode 完全开源，源代码公开在',
        'under the': '采用',
        'MIT License': 'MIT 许可证',
        ', meaning anyone can use, modify, or contribute to its development. Anyone from the community can file issues, submit pull requests, and extend functionality.': '，任何人都可以使用、修改或参与开发。社区里的任何人都可以提交 issue、发起 PR、扩展功能。',
        'Access reliable optimized models for coding agents': '为编程智能体提供可靠且经过优化的模型',
        'Zen gives you access to a handpicked set of AI models that OpenCode has tested and benchmarked specifically for coding agents. No need to worry about inconsistent performance and quality across providers, use validated models that work.': 'Zen 提供一组精选 AI 模型，都经过 OpenCode 针对编程智能体的实测与基准测试。不必再担心各家提供商的表现和质量参差不齐，直接用验证过、靠得住的模型。',
        'Learn about Zen': '了解 Zen',

        /* ---------- Zen ---------- */
        'OpenCode Zen | A curated set of reliable optimized models for coding agents': 'OpenCode Zen | 为编程智能体精选的可靠优化模型',
        'Reliable optimized models for coding agents': '为编程智能体打造的可靠优化模型',
        'Zen gives you access to a curated set of AI models that OpenCode has tested and benchmarked specifically for coding agents. No need to worry about inconsistent performance and quality, use validated models that work.': 'Zen 提供一组精选 AI 模型，都经过 OpenCode 针对编程智能体的实测与基准测试。不必再担心各家提供商的表现和质量参差不齐，直接用验证过、靠得住的模型。',
        'Get started with Zen': '开始使用 Zen',
        'Add $20 Pay as you go balance': '充值 $20 按量付费余额',
        '(+$1.23 card processing fee)': '（另收 $1.23 银行卡手续费）',
        'Use with any agent. Set monthly spend limits. Cancel any time.': '可用于任何智能体，可设置每月消费上限，随时取消。',
        'What problem is Zen solving?': 'Zen 想解决什么问题？',
        'There are so many models available, but only a few work well with coding agents. Most providers configure them differently with varying results.': '市面上的模型多如牛毛，但真正适合编程智能体的寥寥无几；各家提供商的配置方式也不同，效果参差不齐。',
        'We\'re fixing this for everyone, not just OpenCode users.': '我们要把这件事解决掉，而且不只服务 OpenCode 用户。',
        'Testing select models and consulting their teams': '挑选模型实测，并与模型团队沟通',
        'Working with providers to ensure they\'re delivered properly': '与提供商协作，确保模型正常可用',
        'Benchmarking all model-provider combinations we recommend': '对我们推荐的每一种「模型 + 提供商」组合做基准测试',
        'How Zen works': 'Zen 怎么用',
        'While we suggest you use Zen with OpenCode, you can use Zen with any agent.': '我们建议把 Zen 配合 OpenCode 使用，不过任何智能体都能用 Zen。',
        'Sign up and add $20 balance': '注册并充值 $20',
        'follow the': '按照',
        'setup instructions': '安装说明',
        'Use Zen with transparent pricing': '价格透明地用 Zen',
        'pay per request': '按请求计费',
        'with zero markups': '零加价',
        'Auto-top up': '自动充值',
        'when your balance reaches $5 we\'ll automatically add $20': '余额降到 $5 时，自动为你充值 $20',
        'Your privacy is important to us': '我们重视你的隐私',
        'All Zen models are hosted in the US. Providers follow a zero-retention policy and do not use your data for model training, with the': '所有 Zen 模型都托管在美国。提供商遵循零留存政策，不会用你的数据训练模型，但有',
        'following exceptions': '以下例外',
        // 用户评价（站点官方中文也漏译了这几句）
        'Zen has been life changing, it\'s truly a no-brainer.': 'Zen 彻底改变了我的工作方式，真的完全不用犹豫。',
        '4 out of 5 people on our team love using': '我们团队 5 个人里有 4 个都爱用',
        'Zen.': 'Zen。',
        'I can\'t recommend': '我强烈推荐',
        'Zen enough. Seriously, it\'s really good.': 'Zen，说真的，它非常好用。',
        'Zen I know all the models are tested and perfect for coding agents.': 'Zen，我知道这里的模型都经过测试，非常适合编程智能体。',
        'I wish I was still at Nvidia.': '真希望我还在英伟达。',
        'ex-CEO, Terminal Products': '终端产品线前 CEO',
        'ex-Founder, SEED, PM, Melt, Pop, Dapt, Cadmus, and ViewPoint': 'SEED、PM、Melt、Pop、Dapt、Cadmus、ViewPoint 前创始人',
        'ex-Hero, AWS': 'AWS 前 Hero',
        'ex-Head of Design, Laravel': 'Laravel 前设计负责人',
        'ex-Intern, Nvidia (4 times)': '英伟达前实习生（4 次）',
        // FAQ
        'What is OpenCode Zen?': 'OpenCode Zen 是什么？',
        'Zen is a curated set of AI models tested and benchmarked for coding agents created by the team behind OpenCode.': 'Zen 是 OpenCode 团队打造的一组精选 AI 模型，都针对编程智能体做过实测和基准测试。',
        'What makes Zen more accurate?': 'Zen 为什么更准？',
        'Zen only provides models that have been specifically tested and benchmarked for coding agents. You wouldn\'t use a butter knife to cut steak, don\'t use poor models for coding.': 'Zen 只提供专门针对编程智能体实测和跑过分榜的模型。切牛排不会拿黄油刀，写代码也别将就不合适的模型。',
        'Is Zen cheaper?': 'Zen 更便宜吗？',
        'Zen is not for profit. Zen passes through the costs from the model providers to you. The higher Zen\'s usage the more OpenCode can negotiate better rates and pass those to you.': 'Zen 不以盈利为目的，只是把模型提供商的成本原样转给你。Zen 的用量越大，OpenCode 越能谈下更好的价格，并把优惠让给你。',
        'How much does Zen cost?': 'Zen 怎么收费？',
        'charges per request': '按请求计费',
        'with zero markups, so you pay exactly what the model provider charges.': '，零加价，你付的就是模型提供商收取的费用。',
        'Your total cost depends on usage, and you can set monthly spend limits in your': '总费用取决于用量，你还可以在',
        'account': '账户里设置每月消费上限',
        'To cover costs, OpenCode adds only a small payment processing fee of $1.23 per $20 balance top-up.': '为了覆盖成本，OpenCode 只在每次充值 $20 时收取 $1.23 的支付手续费。',
        'Can I set spend limits?': '可以设置消费上限吗？',
        'Yes, you can set monthly spending limits in your account.': '可以，你能在账户里设置每月消费上限。',
        'Can I cancel?': '可以取消吗？',
        'Yes, you can disable billing at any time and use your remaining balance.': '可以，随时都能关闭计费，并把剩余余额用完。',
        'Can I use Zen with other coding agents?': 'Zen 能配合其他编程智能体用吗？',
        'While Zen works great with OpenCode, you can use Zen with any agent. Follow the setup instructions in your preferred coding agent.': 'Zen 配合 OpenCode 效果最好，但任何智能体都能用。按你所选编程智能体里的说明配置即可。',
        'Can I get a refund?': '可以退款吗？',
        'You may qualify for a refund if the charge was made within the last 14 days and you have not used the credits from that purchase.': '如果扣款发生在最近 14 天内，且你还没用过这笔购买的额度，就可以申请退款。',
        'to request a refund.': '即可申请退款。',

        /* ---------- Go ---------- */
        'OpenCode Go | Low cost coding models for everyone': 'OpenCode Go | 人人可用的低成本编程模型',
        'Low cost coding models for everyone': '人人可用的低成本编程模型',
        'Step 5 Preview is now available in Go with 4× usage for a limited time.': 'Step 5 Preview 已上线 Go，限时 4 倍用量。',
        'Go brings agentic coding to programmers around the world. Offering generous limits and reliable access to the most capable open-source models, so you can build with powerful agents without worrying about cost or availability.': 'Go 把智能体编程带给全世界的程序员：额度充裕、能稳定用上最强的开源模型，让你放心用强大的智能体干活，不必操心成本或可用性。',
        'Use with any agent. Top up credit if needed. Cancel any time.': '可用于任何智能体，需要时充值，随时取消。',
        'per month': '每月',
        'Curated, affordable models': '精选且价格实惠的模型',
        'Tested for agentic coding': '经过智能体编程场景测试',
        'Generous limits and reliable access': '额度充裕，访问稳定',
        'Subscribe to Go': '订阅 Go',
        'Everything included in Go': '包含 Go 的全部权益',
        'Higher limits and fewer interruptions': '额度更高，少被打断',
        'Built for larger, demanding projects': '为更大、更高要求的项目而设',
        'Subscribe to Go Plus': '订阅 Go Plus',
        'Limits': '额度',
        'Estimated requests per 5 hours and monthly usage limits by model': '各模型每 5 小时的预计请求数和每月用量额度',
        'Plans': '套餐',
        'Est. requests / 5h': '预计请求数 / 5 小时',
        'Monthly usage': '每月用量',
        'Limited Time': '限时',
        'Limited Regions': '仅限部分地区',
        'Usage limits': '用量限制',
        'What problem is Go solving?': 'Go 想解决什么问题？',
        'We\'re focused on bringing the OpenCode experience to as many people as possible. OpenCode Go is a low cost $10/month subscription. It provides generous limits and reliable access to the most capable open source models.': '我们希望让尽可能多的人用上 OpenCode。OpenCode Go 是每月 $10 的低价订阅，额度充裕，还能稳定用上最强的开源模型。',
        'Go Plus costs $40/month with higher limits.': 'Go Plus 每月 $40，额度更高。',
        'Low cost subscription pricing': '低价订阅',
        'Built for as many programmers as possible': '为尽可能多的程序员而做',
        'A curated model lineup tested for agentic coding': '经过智能体编程测试的精选模型阵容',
        'How Go works': 'Go 怎么用',
        'Go costs $10/month. You can use it with OpenCode or any agent.': 'Go 每月 $10，可以配合 OpenCode 或任何智能体使用。',
        'Create an account': '注册账号',
        '$10/month': '每月 $10',
        'with generous limits': '额度充裕',
        'Start coding': '开始写代码',
        'with reliable access to open-source models': '稳定访问开源模型',
        'What is OpenCode Go?': 'OpenCode Go 是什么？',
        'What models does Go include?': 'Go 包含哪些模型？',
        'What is the difference between free models and Go?': '免费模型和 Go 有什么区别？',
        'How much does Go cost?': 'Go 怎么收费？',
        'Is Go the same as Zen?': 'Go 和 Zen 一样吗？',
        'Can I top up credit?': '可以充值吗？',
        'Can I use Go with other coding agents?': 'Go 能配合其他编程智能体用吗？',
        'Go is a low-cost subscription that gives you reliable access to capable open-source models for agentic coding.': 'Go 是一项低价订阅，让你稳定地用上适合智能体编程的强开源模型。',
        'Go includes the models listed below, with generous limits and reliable access.': 'Go 包含下面列出的模型，额度充裕、访问稳定。',
        'No. Zen is pay-as-you-go, while Go costs $10/month, with generous limits and reliable access to a curated model lineup.': '不一样。Zen 是按量付费，Go 则是每月 $10，额度充裕，还能稳定访问精选模型阵容。',
        'Go costs': 'Go 每月',
        'with generous limits.': '，额度充裕。',
        'You can manage your subscription in your': '你可以在',
        'Cancel any time.': '里管理订阅，随时可取消。',
        'If you need more usage, you can top up credit in your account.': '如果用量不够，可以在账户里充值。',
        'Yes, you can cancel any time.': '可以，随时都能取消。',
        'Yes, you can use Go with any agent. Follow the setup instructions in your preferred coding agent.': '可以，任何智能体都能用 Go。按你所选编程智能体里的说明配置即可。',
        'Free models include Big Pickle plus promotional models available at the time, with a quota of 200 requests/day. Go offers a curated model lineup with higher request quotas enforced across rolling windows: 20% of the monthly allowance per 5 hours, 50% per week, and 100% per month. Model-specific allowances may differ (actual request counts vary by model and usage).': '免费模型包含 Big Pickle 以及当期上线的推广模型，额度为每天 200 次请求。Go 提供精选模型阵容，并在滚动时间窗内执行更高的请求额度：每 5 小时可用月额度的 20%，每周 50%，每月 100%。不同模型的具体额度可能不同（实际请求次数会随模型和使用情况变化）。',
        'You may qualify for a refund if the charge was made within the last 14 days and you have not used your Go allowance during that billing period.': '如果扣款发生在最近 14 天内，且你在该计费周期内没用过 Go 额度，就可以申请退款。',
        // 数据留存对照表
        'Data retention': '数据留存',
        'Model training': '模型训练',
        'Not ZDR': '非 ZDR',
        'Not used': '不使用',
        'Used': '使用',
        '0 days': '0 天',
        '30 days': '30 天',
        'Your prompts and completions may be used to train future Google models.': '你的提示词和模型输出可能会被用于训练未来的 Google 模型。',
        'Abuse monitoring logs are generated for all API feature usage and retained for up to 30 days.': '所有 API 功能调用都会生成滥用监控日志，最长保留 30 天。',
        'ZDR disables important API features that depend on stored data, including the stateful Responses API, Files and Collections, and the Batch API.': 'ZDR 会禁用依赖数据存储的重要 API 功能，包括有状态的 Responses API、Files and Collections 和 Batch API。',
        'Heavily discounted token pricing in exchange for permission to use your prompts and completions to train future Meta models.': '以允许用你的提示词和模型输出训练未来的 Meta 模型为条件，换取大幅折扣的 token 价格。',
        'ZDR agreement is renewed monthly. The current agreement is valid through October 31, 2026.': 'ZDR 协议按月续签，当前协议有效期至 2026 年 10 月 31 日。',

        /* ---------- 企业版 ---------- */
        'OpenCode | Enterprise solutions for your organisation': 'OpenCode | 面向组织的企业版方案',
        'Your code is yours': '代码始终是你的',
        'OpenCode operates securely inside your organization with no data or context stored and no licensing restrictions or ownership claims. Start a trial with your team, then deploy it across your organization by integrating it with your SSO and internal AI gateway.': 'OpenCode 在你的组织内部安全运行：不存储任何数据或上下文，也没有许可限制或所有权主张。可以先带团队试用，再通过对接 SSO 和内部 AI 网关在全组织部署。',
        'Let us know how we can help.': '告诉我们你需要什么帮助。',
        'Full name': '姓名',
        'Role': '职位',
        'Company': '公司',
        'Company email': '公司邮箱',
        'Phone number': '电话号码',
        'Executive Chairman': '执行董事长',
        'We need help with...': '我们需要解决……',
        'What is your company\'s current monthly inference spend (USD)?': '贵公司目前每月的推理支出是多少（美元）？',
        'Select a range (optional)': '选择区间（可选）',
        'Not spending yet': '暂无支出',
        'Under $1K': '低于 $1K',
        '$100K or more': '$100K 及以上',
        'What problem are you trying to solve?': '你想解决什么问题？',
        'Send': '发送',
        'Sending...': '发送中……',
        'Message sent, we\'ll be in touch soon.': '消息已发送，我们会尽快联系你。',
        'Form submitted successfully.': '表单提交成功。',
        'All fields are required.': '所有字段均为必填项。',
        'Internal server error.': '服务器内部错误。',
        'Invalid email format.': '邮箱格式不正确。',
        'Select a valid inference spend range.': '请选择有效的推理支出区间。',
        'What is OpenCode Enterprise?': 'OpenCode 企业版是什么？',
        'How do I get started with OpenCode Enterprise?': '如何开始使用 OpenCode 企业版？',
        'How does enterprise pricing work?': '企业版如何计费？',
        'Is my data secure with OpenCode Enterprise?': '我的数据在企业版里安全吗？',
        'Where can I find your security and compliance documentation?': '哪里能找到你们的安全与合规文档？',
        'OpenCode Enterprise is for organizations that want to ensure that their code and data never leaves their infrastructure. It can do this by using a centralized config that integrates with your SSO and internal AI gateway.': 'OpenCode 企业版面向希望代码和数据绝不离开自有基础设施的组织，通过集中式配置对接你的 SSO 和内部 AI 网关来实现。',
        'Simply start with an internal trial with your team. OpenCode by default does not store your code or context data, making it easy to get started. Then contact us to discuss pricing and implementation options.': '先带上团队做一次内部试用即可。OpenCode 默认不存储你的代码和上下文数据，上手很容易。之后联系我们，讨论价格和落地方案。',
        'We offer per-seat enterprise pricing. If you have your own LLM gateway, we do not charge for tokens used. For further details, contact us for a custom quote based on your organization\'s needs.': '企业版按席位计费。如果你有自己的 LLM 网关，我们不收取 token 使用费。更多细节请联系我们，我们会根据你组织的需求提供定制报价。',
        'Yes. OpenCode does not store your code or context data. All processing happens locally or through direct API calls to your AI provider. With central config and SSO integration, your data remains secure within your organization\'s infrastructure.': '安全。OpenCode 不存储你的代码和上下文数据，所有处理都在本地完成，或直接调用你所用 AI 提供商的 API。配合集中式配置和 SSO 集成，数据始终留在你组织的基础设施内。',
        'Our Trust Center has everything: SOC 2 Type 2 report, security policies, subprocessor list, and answers to common security questions. Visit': '我们的信任中心提供全部资料：SOC 2 Type 2 报告、安全政策、子处理者名单，以及常见安全问题的解答。请访问',
        'to review or request documents under NDA.': '查看，或申请签署 NDA 后获取文档。',

        /* ---------- 下载页 ---------- */
        'OpenCode | Download': 'OpenCode | 下载',
        'OpenCode Terminal': 'OpenCode 终端',
        'OpenCode Desktop': 'OpenCode 桌面版',
        'OpenCode Extensions': 'OpenCode 扩展',
        'OpenCode Integrations': 'OpenCode 集成',
        'Install': '安装',
        'macOS (Apple Silicon)': 'macOS（Apple 芯片）',
        'macOS (Intel)': 'macOS（Intel）',
        'Windows (x64)': 'Windows（x64）',
        'Windows (ARM64)': 'Windows（ARM64）',
        'Linux (.deb)': 'Linux（.deb）',
        'Linux (.rpm)': 'Linux（.rpm）',
        'Not necessarily, but probably. You\'ll need an AI subscription if you want to connect OpenCode to a paid provider, although you can work with': '不一定，但多半需要。如果想把 OpenCode 接到付费提供商，你需要有 AI 订阅；不过你也可以配合',
        'for free. While we encourage users to use': '免费使用。我们推荐使用',
        ', OpenCode works with all popular providers such as OpenAI, Anthropic, xAI etc.': '，同时 OpenCode 兼容 OpenAI、Anthropic、xAI 等所有主流提供商。',
        'OpenCode is 100% free to use.': 'OpenCode 完全免费。',
        'Any additional costs will come from your subscription to a model provider. While OpenCode works with any model provider, we recommend using': '额外费用只来自你对模型提供商的订阅。虽然 OpenCode 支持任何模型提供商，但我们建议使用',

        /* ---------- 品牌页 ---------- */
        'OpenCode | Brand': 'OpenCode | 品牌',
        'Brand guidelines': '品牌指南',
        'Resources and assets to help you work with the OpenCode brand.': '帮助你正确使用 OpenCode 品牌的资源与素材。',
        'Download all assets': '下载全部素材',
        'OpenCode brand guidelines': 'OpenCode 品牌指南',

        /* ---------- 数据看板 ---------- */
        'AI Model Usage Rankings | OpenCode Data': 'AI 模型使用排名 | OpenCode 数据',
        'Data home': '数据首页',
        'Data sections': '数据分区',
        'Top Models': '热门模型',
        'Leaderboard': '排行榜',
        'Session Cost': '会话成本',
        'Token Cost': 'Token 成本',
        'Cache Ratio': '缓存命中率',
        'Market Share': '市场份额',
        'Geo Breakdown': '地域分布',
        'Try OpenCode': '试用 OpenCode',
        'Open navigation': '打开导航',
        'Model Data': '模型数据',
        'Usage of models across OpenCode.': 'OpenCode 各模型的使用量。',
        'Stacked top model usage chart': '各模型用量堆叠图',
        'vs previous week': '较上周',
        'LEARN MORE': '了解更多',
        'TOP MODELS': '热门模型',
        'Unique Users': '独立用户',
        'Daily unique OpenCode users by model.': '各模型的每日 OpenCode 独立用户数。',
        'Stacked unique user chart by model': '各模型独立用户堆叠图',
        'Weekly Retention': '周留存率',
        'Weekly users returning the next week.': '下一周仍继续使用的周活跃用户比例。',
        'Weekly retention': '周留存率',
        'Average cost per session.': '每次会话的平均费用。',
        'COST / SESSION': '费用 / 会话',
        'Cost/Session': '费用/会话',
        'Tokens/Session': 'Token/会话',
        'TOKENS / SESSION': 'TOKEN / 会话',
        'SESSION COST': '会话成本',
        'Price per 1M tokens.': '每百万 token 的价格。',
        'TOKEN COST': 'TOKEN 成本',
        'Share of input tokens served from cache.': '输入 token 中命中缓存的比例。',
        'CACHE RATIO': '缓存命中率',
        'Compare token share by model author.': '按模型厂商比较 token 占比。',
        'Market share by model author': '按模型厂商统计的市场份额',
        'MARKET SHARE': '市场份额',
        'Geographic Breakdown': '地域分布',
        'GEO BREAKDOWN': '地域分布',
        'Methodology': '统计方法',
        'How this data is collected.': '数据是怎么采集的。',
        'Updates': '更新频率',
        'Aggregated every hour. Days and weeks use UTC.': '每小时聚合一次；日、周均以 UTC 为准。',
        'Tokens': 'Token',
        'Input, output, reasoning, and cached tokens for each request.': '每次请求的输入、输出、推理和缓存 token。',
        'Users and sessions': '用户与会话',
        'Approximate counts of distinct users and OpenCode sessions.': '去重用户数与 OpenCode 会话数的近似值。',
        'Cost': '费用',
        'Session cost is the average cost per OpenCode session. Token prices are list prices from the OpenCode model catalog.': '会话成本指每个 OpenCode 会话的平均费用；token 价格取自 OpenCode 模型目录的标价。',
        'Retention': '留存',
        'The share of a model\'s users in one week who use it again the next week.': '某模型一周内的用户中，下一周仍继续使用的比例。',
        'Citation': '引用',
        'Cite OpenCode Data (opencode.ai/data) with the update time shown at the top of the page.': '引用 OpenCode Data（opencode.ai/data）时，请附上页面顶部显示的更新时间。',
        'Model Comparisons': '模型对比',
        'Popular model pairs from the leaderboard.': '排行榜中热门模型的两两对比。',
        'Top two by recent usage': '近期用量前两名',
        'Leader vs challenger': '领跑者 vs 追赶者',
        'Adjacent leaderboard pair': '排行榜相邻两名',
        'Top model alternative': '热门模型的替代选择',
        'MODEL COMPARISONS': '模型对比',
        'OpenCode home': 'OpenCode 首页',
        'Terms of service': '服务条款',
        'Privacy policy': '隐私政策',
        'Be the first to know about new releases.': '第一时间了解新版本发布。',
        'All systems Operational': '所有系统运行正常',
        'tokens': 'token',
        // 国家 / 地区
        'China': '中国',
        'United States': '美国',
        'India': '印度',
        'Brazil': '巴西',
        'Germany': '德国',
        'Japan': '日本',
        'Indonesia': '印度尼西亚',
        'Singapore': '新加坡',
        'France': '法国',
        'Spain': '西班牙',
        'Netherlands': '荷兰',
        'Vietnam': '越南',
        'Russia': '俄罗斯',
        'United Kingdom': '英国',
        'Türkiye': '土耳其',

        /* ---------- 法律页（仅页面标题；正文保留英文原版） ---------- */
        'OpenCode | Privacy Policy': 'OpenCode | 隐私政策',
        'OpenCode | Terms of Service': 'OpenCode | 服务条款',
        'Privacy Policy': '隐私政策',
        'Terms of Use': '使用条款',

        /* ---------- 更新日志外壳 ---------- */
        'OpenCode | Changelog': 'OpenCode | 更新日志',
        'New updates and improvements to OpenCode': 'OpenCode 的新功能与改进',
        'No changelog entries found.': '没有找到更新日志条目。',
        'View JSON': '查看 JSON',

        /* ---------- Black 订阅页（未公开入口） ---------- */
        'OpenCode Black | Pricing': 'OpenCode Black | 定价',
        'OpenCode Black | Access all the world\'s best coding models': 'OpenCode Black | 使用全球最优秀的编程模型',
        'Access all the world\'s best coding models': '使用全球最优秀的编程模型',
        'Get access to Claude, GPT, Gemini and more with OpenCode Black subscription plans.': '通过 OpenCode Black 订阅方案使用 Claude、GPT、Gemini 等模型。',
        'Black plan enrollment is temporarily paused.': 'Black 方案暂时停止开放注册。',
        'Black 100 plan': 'Black 100 方案',
        'Black 20 plan': 'Black 20 方案',
        'Black 200 plan': 'Black 200 方案',
        'per person billed monthly': '每人每月计费',
        'Your subscription will not start immediately': '你的订阅不会立即开始',
        'You will be added to the waitlist and activated soon': '你会被加入候补名单，很快就可激活',
        'Your card will only be charged when your subscription is activated': '只有在订阅激活后才会从你的卡上扣款',
        'Usage limits apply, heavily automated use may reach limits sooner': '存在用量限制，高度自动化的使用可能更早触达上限',
        'Subscriptions are for individuals, contact Enterprise for teams': '订阅面向个人，团队请联系企业版',
        'Limits may be adjusted and plans may be discontinued in the future': '未来可能调整额度或停止相关方案',
        'Cancel your subscription at any time': '可随时取消订阅',
        'Select a workspace for this plan': '为该方案选择工作区',
        'OpenCode Black | Select Workspace': 'OpenCode Black | 选择工作区',
        'Prices shown don\'t include applicable tax': '所示价格不含适用税费',
        'Terms of Service': '服务条款',
        'Including Claude, GPT, Gemini and more': '包括 Claude、GPT、Gemini 等',

        /* ---------- 旧版落地页（temp 路由） ---------- */
        'opencode | AI coding agent built for the terminal': 'OpenCode | 专为终端打造的 AI 编程智能体',
        'The AI coding agent built for the terminal': '专为终端打造的 AI 编程智能体',
        'opencode zen': 'OpenCode Zen',
        'Native TUI': '原生 TUI',
        'A responsive, native, themeable terminal UI': '响应迅速、原生、可换主题的终端界面',
        'curated list of models': '精选模型列表',
        'provided by opencode': '由 opencode 提供',
        'Supports 75+ LLM providers through': '通过 Models.dev 支持 75+ 家 LLM 提供商',
        ', including local models': '，也支持本地模型',

        /* ---------- 文档站：外壳与侧边栏 ---------- */
        'Skip to content': '跳到正文',
        'Search': '搜索',
        'On this page': '本页目录',
        'Last updated:': '最后更新：',
        'Copy to clipboard': '复制到剪贴板',
        'Edit page': '编辑本页',
        'Found a bug? Open an issue': '发现 bug？提交 issue',
        'Select theme': '选择主题',
        'Select language': '选择语言',
        'Dark': '深色',
        'Light': '浅色',
        'Auto': '跟随系统',
        'Menu': '菜单',
        'Main': '主区域',
        'Note': '注意',
        'Tip': '提示',
        'Recommended: Use WSL': '推荐：使用 WSL',
        'OpenCode v2 is now available': 'OpenCode v2 现已发布',
        'OpenCode 2 docs': 'OpenCode 2 文档',
        'Releases': '发布版本',
        'Overview': '概览',
        'Intro': '简介',
        'Intro | OpenCode': '简介 | OpenCode',
        'Intro | AI coding agent built for the terminal': '简介 | 专为终端打造的 AI 编程智能体',
        'Config': '配置',
        'Configure': '配置',
        'Providers': '提供商',
        'Network': '网络',
        'Troubleshooting': '故障排查',
        'Usage': '使用',
        'Web': '网页端',
        'Console': '控制台',
        'Tools': '工具',
        'Rules': '规则',
        'Agents': '智能体',
        'Themes': '主题',
        'Keybinds': '快捷键',
        'Commands': '命令',
        'Formatters': '格式化工具',
        'Permissions': '权限',
        'Policies': '策略',
        'LSP Servers': 'LSP 服务器',
        'MCP servers': 'MCP 服务器',
        'ACP Support': 'ACP 支持',
        'Agent Skills': '智能体技能',
        'References': '参考',
        'Custom Tools': '自定义工具',
        'Develop': '开发',
        'Server': '服务端',
        'Plugins': '插件',
        'Ecosystem': '生态',
        'Terminal window': '终端窗口',
        'Build mode': '构建模式',
        'Plan mode': '计划模式',
        'Join our Discord community': '加入我们的 Discord 社区',
        // 文档「简介」页正文
        'Get started with OpenCode.': '开始使用 OpenCode。',
        'is an open source AI coding agent. It\'s available as a terminal-based interface, desktop app, or IDE extension.': '是一款开源 AI 编程智能体，提供终端界面、桌面应用和 IDE 扩展。',
        'OpenCode 1 and OpenCode 2 both use the': 'OpenCode 1 和 OpenCode 2 都使用',
        'command and cannot be installed side by side under their default command. See the': '命令，两者的默认命令相同，无法同时安装。请查看',
        'to migrate to V2.': '迁移到 V2。',
        'Prerequisites': '前置要求',
        'To use OpenCode in your terminal, you\'ll need:': '要在终端里使用 OpenCode，你需要：',
        'A modern terminal emulator like:': '一款现代终端模拟器，例如：',
        ', cross-platform': '，跨平台',
        ', Linux and macOS': '，支持 Linux 和 macOS',
        'Installing on Arch Linux': '在 Arch Linux 上安装',
        'Using Homebrew on macOS and Linux': '在 macOS 和 Linux 上使用 Homebrew',
        'Using NPM': '使用 NPM',
        'Using Node.js': '使用 Node.js',
        'Using Docker': '使用 Docker',
        'Using Chocolatey': '使用 Chocolatey',
        'Using Scoop': '使用 Scoop',
        'Using Mise': '使用 Mise',
        'For the best experience on Windows, we recommend using': '为了在 Windows 上获得最佳体验，我们建议使用',
        'Windows Subsystem for Linux (WSL)': '适用于 Linux 的 Windows 子系统（WSL）',
        'Support for installing OpenCode on Windows using Bun is currently in progress.': '通过 Bun 在 Windows 上安装 OpenCode 的支持正在开发中。',
        'The easiest way to install OpenCode 1 is through the install script. These installation methods provide the': '安装 OpenCode 1 最简单的方式是使用安装脚本。以下安装方式提供的是',
        'binary and can conflict with or replace an OpenCode 2 installation.': '二进制文件，可能与已安装的 OpenCode 2 冲突，甚至将其替换。',
        'We recommend using the OpenCode tap for the most up to date releases. The official': '我们建议通过 OpenCode tap 安装，以获得最新版本。官方',
        'formula is maintained by the Homebrew team and is updated less frequently.': 'formula 由 Homebrew 团队维护，更新频率较低。',
        'Initialize': '初始化',
        'Next, initialize OpenCode for the project by running the following command.': '接下来，用下面的命令为项目初始化 OpenCode。',
        'This helps OpenCode understand the project structure and the coding patterns used.': '这能帮助 OpenCode 了解项目结构和所用的编码风格。',
        'You should commit your project\'s': '建议把项目的',
        'file to Git.': '文件提交到 Git。',
        'With OpenCode you can use any LLM provider by configuring their API keys.': '在 OpenCode 里配置好 API 密钥，就能使用任何 LLM 提供商。',
        'If you are new to using LLM providers, we recommend using': '如果你还不熟悉 LLM 提供商，建议使用',
        'It\'s a curated list of models that have been tested and verified by the OpenCode team.': '这是一份由 OpenCode 团队测试验证过的精选模型清单。',
        'Sign in, add your billing details, and copy your API key.': '登录、填写账单信息，然后复制你的 API 密钥。',
        'Alternatively, you can select one of the other providers.': '你也可以选择其他提供商。',
        'Paste your API key.': '粘贴你的 API 密钥。',
        'And run OpenCode.': '然后运行 OpenCode。',
        'Now that you\'ve configured a provider, you can navigate to a project that you want to work on.': '配置好提供商后，进入你想开发的项目目录。',
        'Ask questions': '提问',
        'You can ask OpenCode to explain the codebase to you.': '可以让 OpenCode 给你讲解代码库。',
        'This is helpful if there\'s a part of the codebase that you didn\'t work on.': '如果代码库中有你没参与过的部分，这会很有用。',
        'Add features': '添加功能',
        'You can ask OpenCode to add new features to your project. Though we first recommend asking it to create a plan.': '你可以让 OpenCode 为项目添加新功能。不过我们建议先让它制定计划。',
        'Create a plan': '制定计划',
        'OpenCode has a': 'OpenCode 有一个',
        'that disables its ability to make changes and instead suggest': '它会禁用修改能力，只给出建议',
        'how': '如何',
        'it\'ll implement the feature.': '它就会实现该功能。',
        'Switch to it using the': '使用下面的方式切换过去',
        'key. You\'ll see an indicator for this in the lower right corner.': '键。右下角会出现一个指示器。',
        'Once it gives you a plan, you can give it feedback or add more details.': '拿到计划后，你可以提反馈或补充细节。',
        'Iterate on the plan': '反复打磨计划',
        'Once you feel comfortable with the plan, switch back to': '对计划满意后，切换回',
        'Build the feature': '实现功能',
        'For more straightforward changes, you can ask OpenCode to directly build it without having to review the plan first.': '对于比较直接的改动，也可以让 OpenCode 跳过计划审核直接实现。',
        'Make changes': '修改代码',
        'Let\'s say you ask OpenCode to make some changes.': '假设你让 OpenCode 改点东西。',
        'You want to give OpenCode enough details to understand what you want. It helps to talk to it like you are talking to a junior developer on your team.': '你要把需求讲清楚，让 OpenCode 明白你的意图。像对待团队里的初级工程师那样跟它沟通会很有帮助。',
        'You want to make sure you provide a good amount of detail so OpenCode makes the right changes.': '细节给得足够充分，OpenCode 才能改对地方。',
        'Give OpenCode plenty of context and examples to help it understand what you want.': '多给一些上下文和示例，帮助 OpenCode 理解你的需求。',
        'But you realize that it is not what you wanted. You': '但你发现它改的并不是你想要的。你可以',
        'can undo': '撤销',
        'the changes using the': '改动，使用',
        'Undo changes': '撤销修改',
        'multiple times to undo multiple changes.': '多次即可撤销多步修改。',
        'can redo': '重做',
        'by hitting the': '按下',
        'key again.': '键即可。',
        'And that\'s it! You are now a pro at using OpenCode.': '就这样，你已经能熟练使用 OpenCode 了。',
        'You are now ready to use OpenCode to work on your project. Feel free to ask it anything!': '现在你可以在自己的项目里使用 OpenCode 了，有任何问题尽管问它。',
        'Customize': '自定义',
        'Let\'s get started.': '让我们开始吧。',
        'API keys for the LLM providers you want to use.': '你想使用的 LLM 提供商的 API 密钥。',
        '. It provides better performance and full compatibility with OpenCode\'s features.': '。它性能更好，并完全兼容 OpenCode 的各项功能。',
        '. It\'s a curated list of models that have been tested and verified by the OpenCode team.': '。这是一份由 OpenCode 团队测试验证过的精选模型清单。',
        'This will get OpenCode to analyze your project and create an': '这样 OpenCode 会分析你的项目并生成',
        'If you are new to using an AI coding agent, here are some examples that might help.': '如果你刚接触 AI 编程智能体，下面这些示例也许有帮助。',
        'Use the': '使用',
        'You can run': '你可以运行',
        'OpenCode can scan any images you give it and add them to the prompt. You can do this by dragging and dropping an image into the terminal.': 'OpenCode 能识别你提供的图片并加入提示词：把图片拖进终端即可。',
        ', or playing around with the': '，或者只是随便试试',
        'OpenCode TUI with the opencode theme': '使用 opencode 主题的 OpenCode 终端界面',
        'To make it your own, we recommend': '想让它更贴合你的习惯，我们建议',
        'picking a theme': '挑选主题',
        'customizing the keybinds': '自定义快捷键',
        'configuring code formatters': '配置代码格式化工具',
        'creating custom commands': '创建自定义命令',
        'Now let\'s describe what we want it to do.': '现在来描述我们想让它做什么。',
        'OpenCode will now revert the changes you made and show your original message again.': 'OpenCode 会还原刚才的改动，并重新显示你最初的消息。',
        'You can also grab the binary from the': '你也可以从以下位置获取二进制文件：',
        'You can also install it with the following commands:': '也可以用下面的命令安装：',
        'command.': '命令。',
        'file in the project root.': '文件放在项目根目录。',
        'key to fuzzy search for files in the project.': '键可以在项目中模糊搜索文件。',
        'Drag and drop images into the terminal to add them to the prompt.': '把图片拖进终端，即可加入提示词。',
        'From here you can tweak the prompt and ask OpenCode to try again.': '你可以在这里调整提示词，让 OpenCode 再试一次。',
        'And asking it to make the changes.': '再让它动手修改。',
        'Or you': '或者你',
        'command in the TUI, select opencode, and head to': '命令，在 TUI 里选择 opencode，然后前往',
        'OpenCode config': 'OpenCode 配置',
        'Run the': '运行'
    };

    /* ---------- 页面补充词条（仅对同名的多义词做上下文限定） ---------- */
    const PAGE_I18N = {
        '/zen': {
            'With': '用'
        }
    };

    /* =========================== 正则规则 =========================== */

    const MONTHS = {
        JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
        JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
        January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
        July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
        Jan: 1, Feb: 2, Mar: 3, Apr: 4, Jun: 6, Jul: 7, Aug: 8, Sep: 9,
        Oct: 10, Nov: 11, Dec: 12
    };
    const MONTH_ABBR = '(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)';
    const MONTH_WORD = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
    const MONTH_SHORT = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';

    const zhMonth = (name) => String(MONTHS[name]);

    function to24Hour(hour, minute, period) {
        let h = parseInt(hour, 10) % 12;
        if (period === 'PM') h += 12;
        return (h < 10 ? '0' : '') + h + ':' + minute;
    }

    // [正则, 替换（字符串或函数）]
    const REGEXP = [
        // 文档站页面标题：<页面名> | OpenCode
        [/^(.+?) \| OpenCode$/, (m, page) => (I18N[page] || page) + ' | OpenCode'],
        // 图表编号：Fig 1. -> 图 1.
        [/^Fig (\d+)\.$/, '图 $1.'],
        // Go 页数据标签
        [/^(\d+)× usage$/, '$1 倍用量'],
        [/^View all (\d+) models$/, '查看全部 $1 个模型'],
        [/^(\d+)x more usage than Black 20$/, '用量是 Black 20 的 $1 倍'],
        [/^Workspace (\d+)$/, '工作区 $1'],
        // 数据看板：GitHub 星标按钮
        [/^Star OpenCode on GitHub \((\w+) stars?\)$/, '在 GitHub 上为 OpenCode 加星（$1）'],
        // 更新时间：Updated Oct 16, 03:18 PM UTC
        [new RegExp('^Updated (' + MONTH_ABBR + ') (\\d{1,2}), (\\d{1,2}):(\\d{2}) (AM|PM) UTC$'),
            (m, mo, d, hh, mm, ap) => '更新于 ' + zhMonth(mo) + '月' + d + '日 ' + to24Hour(hh, mm, ap) + ' UTC'],
        [/^Updated (.*)$/, '更新于 $1'],
        // 12 小时制时间 -> 24 小时制（数据页拆分渲染）
        [/^(\d{1,2}):(\d{2}) (AM|PM) UTC$/, (m, hh, mm, ap) => to24Hour(hh, mm, ap) + ' UTC'],
        // 完整日期
        [new RegExp('^(' + MONTH_WORD + ') (\\d{1,2}), (\\d{4})$'),
            (m, mo, d, y) => y + '年' + zhMonth(mo) + '月' + d + '日'],
        [new RegExp('^(' + MONTH_SHORT + ') (\\d{1,2}), (\\d{4})$'),
            (m, mo, d, y) => y + '年' + zhMonth(mo) + '月' + d + '日'],
        [new RegExp('^(' + MONTH_ABBR + ') (\\d{1,2}) (\\d{4})$'),
            (m, mo, d, y) => y + '年' + zhMonth(mo) + '月' + d + '日'],
        [new RegExp('^Effective date: (' + MONTH_SHORT + ') (\\d{1,2}), (\\d{4})$'),
            (m, mo, d, y) => '生效日期：' + y + '年' + zhMonth(mo) + '月' + d + '日'],
        // 图表坐标轴与提示
        [new RegExp('^(' + MONTH_ABBR + ') (\\d{1,2})$'),
            (m, mo, d) => zhMonth(mo) + '月' + d + '日'],
        [new RegExp('^(' + MONTH_ABBR + ') (\\d{1,2}) ([\\d.]+[TKM]?) total$'),
            (m, mo, d, total) => zhMonth(mo) + '月' + d + '日 共 ' + total],
        [new RegExp('^(' + MONTH_ABBR + ') (\\d{1,2}) ([\\d.]+[TKM]?) model users$'),
            (m, mo, d, n) => zhMonth(mo) + '月' + d + '日 ' + n + ' 名模型用户'],
        [new RegExp('^(' + MONTH_ABBR + ') (\\d{1,2}) ([\\d.]+[TKM]?)$'),
            (m, mo, d, n) => zhMonth(mo) + '月' + d + '日 ' + n],
        // 周留存数据行：mimo-v2.6-flash, 80.3% weekly retention, 2.8K eligible user-weeks
        [/^(.+?), ([\d.]+)% weekly retention, ([\d.]+K?) eligible user-weeks$/,
            '$1：周留存 $2%，有效用户周 $3'],
        // 数据看板自动生成的摘要句
        [/^As of (.*?), (.+?) led OpenCode usage over the past 7 days with (.+?) tokens, followed by (.+?) \((.+?)\) and (.+?) \((.+?)\)\.$/,
            (m, day, first, t1, second, t2, third, t3) =>
                '截至 ' + day + '，过去 7 天内 ' + first + ' 以 ' + t1 + ' token 领跑 OpenCode 使用量，其次是 ' + second + '（' + t2 + '）和 ' + third + '（' + t3 + '）。'],
        [/^See which models are winning real usage, how the mix is shifting, and what that means for cost\.$/,
            '看看哪些模型真正赢得了用量、格局如何变化，以及这对成本意味着什么。']
    ];

    /* =========================== 运行环境 =========================== */

    const store = {
        get(key, fallback) {
            try {
                if (typeof GM_getValue === 'function') return GM_getValue(key, fallback);
                const raw = localStorage.getItem(CONFIG.STORE_KEY);
                return raw === null ? fallback : raw === 'true';
            } catch (e) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; }
                localStorage.setItem(CONFIG.STORE_KEY, String(value));
            } catch (e) { /* 存储不可用时忽略 */ }
        }
    };

    const State = {
        enabled: store.get(CONFIG.STORE_KEY, true) !== false,
        pageDict: null,
        lastUrl: location.href,
        observer: null
    };

    function pickPageDict() {
        const path = location.pathname.replace(/^\/(zh|zht|ko|de|es|fr|it|da|ja|pl|ru|uk|ar|no|br|th|tr)(?=\/|$)/, '') || '/';
        for (const prefix of Object.keys(PAGE_I18N)) {
            if (path === prefix || path.indexOf(prefix + '/') === 0) return PAGE_I18N[prefix];
        }
        return null;
    }

    /* =========================== 翻译核心 =========================== */

    const HAS_CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
    const HAS_LATIN = /[A-Za-z]/;

    /**
     * 归一化待匹配文本：
     *   1. SSR/MDX 渲染出的文本节点内部常含换行与缩进，需折叠为单个空格；
     *   2. 站点文案混用直引号与弯引号（’ “ ”），统一后再查词典。
     */
    function normalizeKey(raw) {
        return raw
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201c\u201d]/g, '"');
    }

    /** 翻译一段文本，返回替换后的字符串；无需翻译时返回 null */
    function translateText(raw) {
        if (!raw) return null;
        const key = normalizeKey(raw);
        if (!key || !HAS_LATIN.test(key) || HAS_CJK.test(key)) return null;

        let value = I18N[key];
        if (value === undefined && State.pageDict) value = State.pageDict[key];
        if (value === undefined) {
            for (let i = 0; i < REGEXP.length; i++) {
                const rule = REGEXP[i];
                if (rule[0].test(key)) { value = key.replace(rule[0], rule[1]); break; }
            }
        }
        if (value === undefined || value === key) return null;

        const lead = raw.match(/^\s*/)[0];
        const trail = raw.match(/\s*$/)[0];
        return lead + value + trail;
    }

    function handleTextNode(node) {
        const out = translateText(node.nodeValue);
        if (out === null) return;
        node.nodeValue = out;
    }

    function handleAttributes(el) {
        for (let i = 0; i < CONFIG.ATTRS.length; i++) {
            const name = CONFIG.ATTRS[i];
            if (!el.hasAttribute || !el.hasAttribute(name)) continue;
            const out = translateText(el.getAttribute(name));
            if (out !== null) el.setAttribute(name, out);
        }
        if (el.tagName === 'INPUT') {
            const type = (el.getAttribute('type') || '').toLowerCase();
            if (type === 'submit' || type === 'button') {
                const out = translateText(el.value);
                if (out !== null) el.value = out;
            }
        }
    }

    function shouldSkip(el) {
        if (el.nodeType !== 1) return false;
        try {
            return el.matches(CONFIG.IGNORE_SELECTOR);
        } catch (e) {
            return false;
        }
    }

    /** 扫描一个节点及其子树 */
    function scanNode(root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) { handleTextNode(root); return; }
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (shouldSkip(root)) return;

        handleAttributes(root);
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        return shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) handleTextNode(node);
            else handleAttributes(node);
        }
    }

    function translateTitle() {
        const out = translateText(document.title);
        if (out !== null) document.title = out;
    }

    function scanAll() {
        if (!State.enabled) return;
        if (document.body) scanNode(document.body);
        translateTitle();
    }

    /* =========================== 增量与调度 =========================== */

    const pending = new Set();
    let flushTimer = null;

    function queueNode(node) {
        if (!node) return;
        pending.add(node);
        if (flushTimer === null) {
            flushTimer = setTimeout(flushPending, CONFIG.FLUSH_DELAY);
        }
    }

    function flushPending() {
        flushTimer = null;
        if (!State.enabled) { pending.clear(); return; }
        const nodes = Array.from(pending);
        pending.clear();
        for (let i = 0; i < nodes.length; i++) scanNode(nodes[i]);
        translateTitle();
    }

    function scheduleScans() {
        if (!State.enabled) return;
        CONFIG.SCAN_DELAYS.forEach((delay) => setTimeout(scanAll, delay));
    }

    function onMutation(mutations) {
        if (!State.enabled) return;
        for (let i = 0; i < mutations.length; i++) {
            const m = mutations[i];
            if (m.type === 'characterData') { queueNode(m.target); continue; }
            if (m.type === 'attributes') { queueNode(m.target); continue; }
            for (let j = 0; j < m.addedNodes.length; j++) queueNode(m.addedNodes[j]);
        }
        checkUrlChange();
    }

    function setupObserver() {
        if (State.observer) return;
        const target = document.documentElement;
        if (!target) return;
        State.observer = new MutationObserver(onMutation);
        State.observer.observe(target, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: CONFIG.ATTRS.concat(['value'])
        });
    }

    function checkUrlChange() {
        if (location.href === State.lastUrl) return;
        State.lastUrl = location.href;
        State.pageDict = pickPageDict();
        scheduleScans();
    }

    function setupUrlWatch() {
        window.addEventListener('popstate', checkUrlChange);
        window.addEventListener('hashchange', checkUrlChange);
        // 单页应用路由变化不一定触发事件，兜底轮询
        setInterval(checkUrlChange, 700);
    }

    /* =========================== 菜单 =========================== */

    // 站点语言标记：营销页用 Cookie（oc_locale），文档站用 URL 段（/docs/zh-cn/...）
    const LOCALE_SEGMENTS = ['en', 'zh', 'zht', 'ko', 'de', 'es', 'fr', 'it', 'da', 'ja', 'pl', 'ru', 'uk', 'ar', 'no', 'br', 'th', 'tr'];
    const DOCS_SEGMENTS = ['en', 'zh-cn', 'zh-tw', 'ar', 'bs', 'da', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nb', 'pl', 'pt-br', 'ru', 'th', 'tr', 'uk'];

    function setSiteLocale(locale) {
        if (locale === 'en') {
            document.cookie = CONFIG.LOCALE_COOKIE + '=; Path=/; Max-Age=0; SameSite=Lax';
        } else {
            document.cookie = CONFIG.LOCALE_COOKIE + '=' + encodeURIComponent(locale) +
                '; Path=/; Max-Age=31536000; SameSite=Lax';
        }
        // 路径处理：先剥掉已有的语言标记，再按目标语言重建文档站路径
        const segs = location.pathname.split('/').filter(Boolean);
        if (segs.length && LOCALE_SEGMENTS.indexOf(segs[0]) >= 0) segs.shift();
        if (segs[0] === 'docs') {
            if (segs[1] && DOCS_SEGMENTS.indexOf(segs[1]) >= 0) segs.splice(1, 1);
            if (locale !== 'en') segs.splice(1, 0, locale === 'zh' ? 'zh-cn' : locale);
        }
        location.href = '/' + segs.join('/') + location.search + location.hash;
    }

    function registerMenus() {
        if (typeof GM_registerMenuCommand !== 'function') return;
        GM_registerMenuCommand((State.enabled ? '✅' : '⛔️') + ' 汉化：' + (State.enabled ? '已启用（点击停用）' : '已停用（点击启用）'), () => {
            State.enabled = !State.enabled;
            store.set(CONFIG.STORE_KEY, State.enabled);
            if (State.enabled) { scheduleScans(); }
            location.reload();
        });
        GM_registerMenuCommand('🇨🇳 切换到站点官方简体中文（整站中文，含文档正文）', () => setSiteLocale('zh'));
        GM_registerMenuCommand('🇺🇸 恢复站点英文（仅保留本插件翻译）', () => setSiteLocale('en'));
        GM_registerMenuCommand('ℹ️ 关于本插件', () => {
            const text = [
                'OpenCode 中文化插件 v1.0.0',
                '',
                '词典式汉化，词条均为人工翻译：',
                '· 覆盖导航、页脚、首页、Zen、Go、企业版、下载、品牌、数据看板、',
                '  更新日志外壳、文档站外壳与侧边栏、404 页面；',
                '· 不翻译代码块、命令、产品名与模型名；',
                '· 文档正文长段落、隐私政策与用户协议正文保持英文，',
                '  需要整站中文时请用菜单切换到站点官方简体中文。'
            ].join('\n');
            if (typeof GM_notification === 'function') {
                GM_notification({ title: 'OpenCode 中文化插件', text: text });
            } else {
                alert(text);
            }
        });
    }

    /* =========================== 启动 =========================== */

    function boot() {
        State.pageDict = pickPageDict();
        if (State.enabled) {
            scanAll();
            scheduleScans();
        }
        setupObserver();
        setupUrlWatch();
        window.addEventListener('load', () => {
            if (State.enabled) scheduleScans();
        });
    }

    registerMenus();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
