// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 alibaba/open-code-review Contributors

export const en = {
  // Navbar
  'navbar.features': '功能特性',
  'navbar.benchmark': '基准测试',
  'navbar.quickstart': '快速开始',
  'navbar.docs': '文档',
  'navbar.blog': '# 博客',
  'navbar.getStarted': '开始使用',

  // Hero
  'hero.title': 'AI 代码审查\n已在数百万个真实世界任务中验证',
  'hero.description': 'Open Code Review 带来了阿里巴巴的's battle-tested code review Agent into your workflow. Connect any LLM, keep data fully private, and get review comments developers actually adopt.',
  'hero.quickStart': '快速开始',
  'hero.learnMore': '了解更多',
  'hero.terminal': '终端',
  'hero.copied': '已复制！',
  'hero.copyFailed': '复制失败',
  'hero.installNpm': 'npm',
  'hero.installBrew': 'Homebrew',
  'hero.installMacPorts': 'MacPorts',
  'hero.installMacOS': 'macOS',
  'hero.installLinux': 'Linux',
  'hero.installWindows': 'Windows',
  'hero.installMore': '更多',
  'hero.allInstallOptions': '所有安装选项',

  // Error boundary
  'error.pageLoadFailed': '无法加载此页面。',
  'error.reload': '重新加载',

  // Highlights
  'highlights.stat1Value': '20K+',
  'highlights.stat1Label': '内部活跃用户',
  'highlights.stat1Caption': '在阿里巴巴集团内部经过实战检验',
  'highlights.stat2Value': '150K+',
  'highlights.stat2Label': 'NPM 社区下载量',
  'highlights.stat2Caption': 'Real npm 下载量 · 最近 30 天',
  'highlights.stat3Value': '3M+',
  'highlights.stat3Label': '真实世界任务',
  'highlights.stat3Caption': '截至目前的代码审查任务执行情况',
  'highlights.stat4Value': '1/9',
  'highlights.stat4Label': 'TOKEN 成本',
  'highlights.stat4Caption': 'vs. Claude Code · 1,000 个 Pull Request',
  'highlights.stat5Value': '25.10%',
  'highlights.stat5Label': 'AACR-BENCH',
  'highlights.stat5Caption': 'SEM.F1 基准测试得分',
  'usecases.sectionLabel': '用例',
  'usecases.title': 'Open Code Review 面向哪些人群？',
  'usecases.case1Title': '个体开发者',
  'usecases.case1Desc': '将 Open Code Review 嵌入到您的本地 AI 辅助开发工作流中，即可获得即时、高质量的代码审查反馈。',
  'usecases.case2Title': '平台团队',
  'usecases.case2Desc': '无缝集成到您的内部系统，全面掌控数据流和审查策略。',
  'usecases.case3Title': 'ML 研究人员',
  'usecases.case3Desc': '在强化学习训练流水线中用作代码质量验证器，为代码生成模型提供可靠的奖励信号。',

  // Features
  'features.sectionBadge': '核心功能',
  'features.title': '一个专为代码审查而构建的代理系统',
  'features.subtitle': '一个AI代理，能够读取文件、搜索代码库、交叉引用上下文，并应用细粒度规则进行深度审查。',
  'features.feat1Title': '混合架构：确定性 + 智能体',
  'features.feat1Desc': '将确定性工程（任务拆分、文件过滤、行号定位、规则路由、异步调度）与 LLM Agent 推理（风险检测、上下文探索、问题分类）解耦——工程模块处理确定性任务，Agent 处理语义任务，从而优化质量、Token 成本和速度。',
  'features.feat2Title': '精确的评论定位与反思',
  'features.feat2Desc': '一个独立的行级评论定位模块，采用三级渐进式LLM策略，将每条评论精准定位到具体的行号。另一个反思模块则能及早拦截幻觉和知识漂移问题。',
  'features.feat3Title': '多模型协议支持',
  'features.feat3Desc': '支持 Anthropic Messages API、OpenAI Chat Completions API 和 OpenAI Responses API。内置预设提供商，包括 Anthropic、OpenAI、DashScope、DeepSeek 和 Z.AI，开箱即用，同时支持自定义模型端点，用于私有部署。',
  'features.feat4Title': '动态并发处理',
  'features.feat4Desc': '动态拆分子任务以进行并行审查，支持可配置的 goroutine 工作线程（默认 8 个）。即使是大型变更集也能快速完成。',
  'features.feat5Title': '智能内存压缩',
  'features.feat5Desc': '专为代码审查而设计的内存压缩技术，采用三层分区（冻结/压缩/活跃）上下文管理，突破令牌限制，实现深度审查。',
  'features.feat6Title': '内置审查规则',
  'features.feat6Desc': '通过海量真实场景验证的审查规则，覆盖Java、TypeScript、Go、Python、Kotlin、Rust、C++、C等10余种语言，并针对NPE、线程安全、XSS、SQL注入等提供专项规则。',

  // Benchmark
  'benchmark.sectionLabel': 'OPEN BENCHMARK',
  'benchmark.title': '由80+资深工程师交叉验证',
  'benchmark.subtitle': '一个真实的CodeReview基准测试，选自50个流行的开源仓库，包含200个真实的Pull Request，覆盖10种编程语言、多样的问题类型以及不同规模的变更集。',
  'benchmark.colRank': 'RANK',
  'benchmark.colModel': '根据您提供的内容，这里只有一个单词“MODEL”，没有完整的 Markdown 文档。请提供完整的 Markdown 内容，以便我进行翻译。',
  'benchmark.colSource': '好的，请提供需要翻译的 Markdown 内容，我会根据您的要求进行翻译。',
  'benchmark.colF1': 'F1',
  'benchmark.colPrecision': '精确度',
  'benchmark.colRecall': '好的，请提供需要翻译的 Markdown 内容。您只给出了文件路径和 i18n key，但没有提供实际的文本内容。请补充完整，我将为您翻译。',
  'benchmark.colAvgTime': '平均时间',
  'benchmark.colAvgToken': '平均令牌',

  // QuickStart
  'quickstart.sectionLabel': '快速开始',
  'quickstart.title': '几分钟内快速启动',
  'quickstart.subtitle': '无需复杂配置。除了您选择的LLM提供商外，无需第三方账户。',
  'quickstart.step1Title': 'step1Title'：安装',
  'quickstart.step1Desc': '通过 npm 一键全局安装。',
  'quickstart.step1Label1': 'install',
  'quickstart.step1Label2': '确认安装',
  'quickstart.step2Title': '好的，这是将 Markdown 内容翻译为简体中文的结果：

```markdown
配置
```',
  'quickstart.step2Desc': '交互式设置您的LLM提供商，或手动配置。',
  'quickstart.step2Label1': '交互式设置（推荐）',
  'quickstart.step2Label2': '手动配置（备选方案）',
  'quickstart.step2Label3': '确认配置',
  'quickstart.step3Title': 'step3Title：运行审查',
  'quickstart.step3Desc': '开始你的第一次代码审查。',
  'quickstart.step3Label1': '根据提供的文件路径和 i18n key，以下是翻译结果：

```markdown
审查命令
```',
  'quickstart.commentReview': '# 审查当前更改',
  'quickstart.commentBranch': '# 查看分支之间的差异',
  'quickstart.commentCommit': '# 审查特定提交',
  'quickstart.copied': '复制成功！',

  // Footer
  'footer.brand': '品牌',
  'footer.copyright': '© 版权所有 2026。保留所有权利。',

  // Docs Page (keep existing)
  'docs.toc': '目录',
  'docs.install': '安装',
  'docs.config': '好的，请提供需要翻译的 Markdown 内容。您提到文件路径为 `i18n key: config'`，但尚未提供具体的文本内容。请粘贴需要翻译的 Markdown 文档，我将根据规则进行翻译。',
  'docs.review': '根据您提供的内容，这是一个非常简短的文本：“ocr review”。按照翻译规则，我将其翻译为简体中文：

---

OCR 审查

---

如果您需要翻译更完整的 Markdown 文档，请提供完整内容。',
  'docs.scan': '# OCR 扫描',
  'docs.viewer': 'OCR 查看器',
  'docs.mcp': 'MCP 服务器',
  'docs.env': 'Claude Code 集成',
  'docs.installTitle': '安装',
  'docs.installLabel': '安装',
  'docs.installVerifyLabel': '确认安装',
  'docs.configTitle': '配置与验证',
  'docs.configDesc': '通过统一的 Provider 系统管理 CLI 配置。内置多种 Provider，并支持为私有部署定制 Provider。配置存储在 <code>~/.opencodereview/config.json</code> 中。',
  'docs.configInteractive': '交互式设置（推荐）',
  'docs.configInteractiveDesc': '配置 Open Code Review 的最简单方式。从内置提供商中选择或添加自定义提供商，设置您的 API 密钥，然后选择模型。',
  'docs.configModelSelect': '模型选择',
  'docs.configModelSelectDesc': '选择提供商后，挑选要使用的模型。',
  'docs.configListProviders': '内置提供程序列表',
  'docs.configListProvidersDesc': '查看所有可用的内置 LLM 提供商。',
  'docs.configManual': '手动配置',
  'docs.configManualBuiltin': '使用内置提供者',
  'docs.configManualBuiltinDesc': '内置提供商预设了API URL和协议——只需提供API密钥即可。',
  'docs.configManualCustom': '# 使用自定义提供商',
  'docs.configManualCustomDesc': '连接到私有部署或其他兼容端点。',
  'docs.configManualCustomNote': '自定义提供程序必须填写 URL 和协议。支持的协议：anthropic、openai、openai-responses。',
  'docs.configKeys': '支持的配置键',
  'docs.configKeyProvider': '活跃提供者名称',
  'docs.configKeyProviderApiKey': '提供商 API 密钥',
  'docs.configKeyProviderModel': '模型名称',
  'docs.configKeyProviderUrl': 'API URL 覆盖',
  'docs.configKeyProviderExtraBody': '自定义请求体字段（JSON）',
  'docs.configKeyProviderExtraHeaders': '自定义 HTTP 请求头（键=值）',
  'docs.configKeyLanguage': '好的，请发送需要翻译的 Markdown 内容。',
  'docs.configKeyTelemetry': 'Telemetry',
  'docs.configVerify': '配置文件验证',
  'docs.configVerifyDesc': '配置完成后运行此命令，以测试LLM连接并确认设置正确。',
  'docs.reviewTitle': '根据您提供的内容，这是一个非常简短的文本片段，看起来是某个界面中的标题或标签。以下是翻译：

```markdown
OCR 审核
```

如果您需要翻译更完整的文档内容，请提供完整的 Markdown 文本，我将按照翻译规则进行翻译。',
  'docs.reviewDesc': '<code>ocr review</code> 是启动 AI 代码审查的核心命令。',
  'docs.reviewModes': '审查模式',
  'docs.reviewWorkspace': '工作区模式（默认）',
  'docs.reviewWorkspaceDesc': '审查当前工作区中的已暂存、未暂存及未跟踪的更改。',
  'docs.reviewBranch': '分支差异模式',
  'docs.reviewBranchDesc': '审查两个引用之间的差异（基于合并基线）。',
  'docs.reviewCommit': '单一提交模式',
  'docs.reviewCommitDesc': '审查特定提交（与其父提交的差异）。',
  'docs.reviewAdvanced': '高级用法',
  'docs.reviewBackground': '根据您提供的文件路径和i18n key（`reviewBackground`），以下是翻译内容：

```markdown
根据需求上下文进行审查
```',
  'docs.reviewBackgroundDesc': '提供需求上下文（包括重要边界），以提高审查质量。',
  'docs.reviewJson': '好的，请提供需要翻译的 Markdown 内容。我会按照您提供的翻译规则和术语表，将其准确、流畅地翻译成简体中文。',
  'docs.reviewJsonDesc': '以结构化JSON格式输出结果，以便进行程序化处理。',
  'docs.reviewAgent': 'Agent 模式',
  'docs.reviewAgentDesc': '仅输出最终摘要，不包含执行过程，适用于自动化流水线。',
  'docs.reviewPreviewLabel': 'Dry-Run 预览',
  'docs.reviewPreviewDesc': '列出将要审查的文件及其统计信息（文件数量、变更行数）——不调用 LLM，不产生费用。适用于在完整审查前检查范围。',
  'docs.reviewToggles': '审查阶段切换：--no-filter',
  'docs.reviewTogglesFilterDesc': '保留所有评审评论，并跳过按文件进行的 REVIEW_FILTER_TASK LLM 后处理调用。',
  'docs.reviewFlags': '好的，这是将 Markdown 内容翻译为简体中文的结果：

```markdown
标志参考
```',
  'docs.reviewFlagCol1': '根据您的要求，我需要翻译的内容是“Flag”。但您提供的上下文似乎不完整，且“i18n key: reviewFlagCol1”表明这是一个国际化键值，可能对应某个界面标签。

“Flag”在技术文档中通常翻译为“标记”或“标志”。考虑到这是一个列标题（Col1），可能用于表格中表示某行数据的标记状态。

翻译结果：**标记**

如果您能提供更多上下文（如完整句子或界面说明），我可以给出更精确的翻译。',
  'docs.reviewFlagCol2': '好的，请提供需要翻译的 Markdown 内容。',
  'docs.reviewFlagCol3': '默认',
  'docs.reviewFlag1Desc': '指定要审查的提交哈希值。',
  'docs.reviewFlag2Desc': '开始引用（差异来源）',
  'docs.reviewFlag3Desc': '目标引用（差异端点）',
  'docs.reviewFlag4Desc': 'Output format: text, json, or sarif',
  'docs.reviewFlag5Desc': 'Git 仓库根目录',
  'docs.reviewFlag5Default': '当前目录',
  'docs.reviewFlag6Desc': '审查规则JSON文件的路径',
  'docs.reviewFlag6Default': '内置',
  'docs.reviewFlag7Desc': '最大并发文件审查数',
  'docs.reviewFlag8Desc': '单个任务超时时间（分钟）',
  'docs.reviewFlag9Desc': '输出受众：人类（显示过程）或代理（仅摘要）',
  'docs.reviewFlag10Desc': '每个文件的最大工具调用轮数；仅当大于模板默认值时生效。',
  'docs.reviewFlag10Default': '内置',
  'docs.reviewFlag11Desc': '最大并发 Git 子进程数',
  'docs.reviewNote': '注意：<code>--from/--to</code> 和 <code>--commit</code> 不能同时使用。当指定 <code>--from</code> 时，也必须指定 <code>--to</code>。',
  'docs.scanTitle': 'OCR 扫描',
  'docs.scanDesc': '<code>ocr scan</code> 会审查整个文件而非差异内容——无需 Git 历史或有意义的差异。它适用于审计不熟悉的代码库、在迁移前扫描目录，或审查任何没有可对比差异的项目。',
  'docs.scanVsTitle': 'OCR 扫描与 OCR 审核',
  'docs.scanVsReviewLabel': '根据提供的文件路径和内容，这似乎是一个 i18n 键值对，其中键为 `scanVsReviewLabel`，值为 `ocr review`。由于内容非常简短，且没有上下文，我将直接翻译该值。

翻译结果：
```
ocr review → OCR 审查
```

如果这是完整的 Markdown 内容，则输出为：
```markdown
OCR 审查
```',
  'docs.scanVsReview': '<code>ocr review</code> 是基于差异（diff）的：它审查 Git 变更——工作区中已暂存/未暂存/未跟踪的更改、分支范围或单个提交。它需要 Git 历史来计算差异。',
  'docs.scanVsScanLabel': 'OCR 扫描',
  'docs.scanVsScan': '<code>ocr scan</code> 是基于完整文件的：它会审查完整的文件内容，而不考虑 Git 历史。它同样适用于非 Git 目录，会回退到遵循 .gitignore 规则的文件系统遍历。',
  'docs.scanUsage': '基本用法',
  'docs.scanUsageWhole': '扫描整个仓库',
  'docs.scanUsageWholeDesc': '当未提供 `--path` 参数时的默认行为。',
  'docs.scanUsagePath': '扫描特定路径',
  'docs.scanUsagePathDesc': '传入一个仓库相对目录，以缩小扫描范围。',
  'docs.scanUsageFile': '扫描特定文件',
  'docs.scanUsageFileDesc': '逗号分隔的文件路径同样适用。',
  'docs.scanUsagePreviewLabel': 'Dry-Run 预览',
  'docs.scanUsagePreviewDesc': '列出范围内的所有文件并报告统计信息（总数、可审查与排除的文件及原因、总行数）——不调用 LLM，不产生费用。在大型仓库上花费令牌之前，用于检查范围非常有用。',
  'docs.scanBatching': '扫描批处理策略',
  'docs.scanBatchingDesc': '<code>--batch</code> 标志控制文件如何分组为审查批次。扫描模板默认为 <code>by-language</code>；空值或无法识别的值将回退为 <code>none</code>。',
  'docs.scanBatchingNone': '根据您提供的内容，这看起来是一个 i18n 翻译键值对，其中 `scanBatchingNone` 是键名，`none` 是英文值。按照翻译规则，键名不翻译，值需要翻译。

翻译结果如下：

```yaml
scanBatchingNone: 无
```',
  'docs.scanBatchingNoneDesc': '每个文件都是独立的批次——不进行分组。',
  'docs.scanBatchingLang': '根据您提供的内容，这似乎是一个不完整的翻译请求。您给出的内容是：

```
（文件路径: i18n key: scanBatchingLang'）：

by-language
```

其中 `by-language` 需要翻译，但缺少完整的 Markdown 内容。请提供完整的 Markdown 文档，我将根据您的翻译规则进行翻译。

如果您希望翻译 `by-language` 这个短语，根据上下文，它可能表示“按语言”或“根据语言”。但为了准确翻译，请提供更多上下文或完整内容。',
  'docs.scanBatchingLangDesc': '文件按其（小写）文件扩展名进行分组。模板默认设置。',
  'docs.scanBatchingDir': '根据提供的文件路径和 i18n key（`scanBatchingDir`），以下是翻译结果：

```markdown
按目录
```',
  'docs.scanBatchingDirDesc': '文件根据其在仓库根目录下的第一级目录进行分组；根目录下的文件则自成一批。',
  'docs.scanToggles': '阶段切换：--no-plan、--no-dedup、--no-summary',
  'docs.scanTogglesDesc': '扫描运行在核心逐文件审查之外，还有三个可选阶段。每个阶段都可以独立禁用，以牺牲审查质量来换取更快的速度和更低的令牌成本。',
  'docs.scanTogglesPlanDesc': '跳过主审查前逐文件的 PLAN_TASK 预扫描，该预扫描用于界定关注范围。每个文件可节省一次 LLM 调用；但可能会降低审查的聚焦度。',
  'docs.scanTogglesDedupDesc': '跳过每批次的 DEDUP_TASK。保留所有原始评论，包括去重通常会合并的近似重复内容。',
  'docs.scanTogglesSummaryDesc': '跳过运行后的 PROJECT_SUMMARY_TASK——即在所有批次完成后生成的仓库级 Markdown 摘要。',
  'docs.scanBudget': 'Token 预算：--max-tokens-budget',
  'docs.scanBudgetDesc': '在调度之前，<code>ocr scan</code> 会打印一个大致的数量级令牌成本估算。<code>--max-tokens-budget</code> 限制 LLM API 报告的总输入+输出令牌使用量；一旦累计总量超过上限，调度将在开始下一批次前停止。<code>0</code>（默认值）表示无限制。',
  'docs.scanFlags': '标志参考',
  'docs.scanFlagCol1': '根据您提供的内容，这是一个非常简短的翻译任务。以下是翻译结果：

```markdown
标记
```

如果您需要翻译更完整的文档，请提供完整的 Markdown 内容，我将根据术语表和翻译规则进行翻译。',
  'docs.scanFlagCol2': '好的，请提供需要翻译的 Markdown 内容。',
  'docs.scanFlagCol3': '好的，请提供需要翻译的 Markdown 内容。您只给出了文件路径和 key，但没有提供实际的文本内容。请将 `scanFlagCol3` 对应的 Markdown 文本粘贴过来，我会按照规则进行翻译。',
  'docs.scanFlag1Desc': '以逗号分隔的、相对于仓库的目录/文件列表，用于扫描。',
  'docs.scanFlag1Default': '根据提供的术语表和翻译规则，将“Whole repo”翻译为简体中文：

- “Whole” → 整个
- “repo” → 仓库（根据术语表，repository → 仓库）

因此，翻译结果为：

**整个仓库**',
  'docs.scanFlag2Desc': '逗号分隔的 gitignore 风格模式，用于排除文件；与 rule.json 中的排除规则合并。',
  'docs.scanFlag3Desc': '预览哪些文件会被扫描，而无需运行 LLM。',
  'docs.scanFlag4Desc': '限制令牌总使用量（输入+输出）；一旦超出即停止调度（0 = 无限制）',
  'docs.scanFlag5Desc': '跳过每个文件的PLAN_TASK预扫描阶段。',
  'docs.scanFlag6Desc': '跳过每批次的DEDUP_TASK',
  'docs.scanFlag7Desc': '跳过运行后的 PROJECT_SUMMARY_TASK',
  'docs.scanFlag8Desc': '批量策略：无 | 按语言 | 按目录',
  'docs.scanFlag9Desc': '根据提供的文件路径和上下文，这看起来是一个i18n（国际化）键的翻译请求。但您没有提供需要翻译的具体Markdown内容。请提供要翻译的文本内容，我将按照翻译规则将其翻译为简体中文。',
  'docs.scanFlag10Desc': '最大并发文件扫描数',
  'docs.scanFlag11Desc': '并发任务超时时间（分钟）',
  'docs.scanFlag12Desc': '输出受众：人类（显示进度）或代理（仅显示摘要）',
  'docs.scanFlag13Desc': '扫描的可选要求/业务背景',
  'docs.scanFlag14Desc': '每个文件的最大工具调用轮数；仅当大于模板默认值时生效。',
  'docs.scanFlag14Default': '内置',
  'docs.scanFlag15Desc': '最大并发 Git 子进程数',
  'docs.scanFlag16Desc': '自定义 JSON 审查规则的路径',
  'docs.scanFlag17Desc': '自定义 JSON 工具配置的路径',
  'docs.scanFlag17Default': '内置',
  'docs.scanFlag18Desc': '扫描的仓库或目录根路径',
  'docs.scanFlag18Default': '当前目录',
  'docs.scanNote': '注意：<code>--max-tools</code> 仅提升扫描模板\'s per-file tool-call budget — it has no effect when set lower than the template default.',
  'docs.viewerTitle': 'OCR 查看器',
  'docs.viewerDesc': '启动一个WebUI会话查看器，用于在网页界面中浏览审查会话日志。',
  'docs.viewerNote': '运行后，本地HTTP服务器将启动，提供一个可视化界面，用于浏览审查会话日志。',
  'docs.mcpTitle': 'MCP 服务器',
  'docs.mcpDesc': 'Open Code Review 支持模型上下文协议（MCP）服务器，允许审查代理在代码审查过程中通过 stdio 传输使用外部工具。',
  'docs.mcpConfig': '配置 MCP 服务器',
  'docs.mcpConfigLocation': 'MCP 服务器配置存储在 ~/.opencodereview/config.json 中。',
  'docs.mcpDelete': '删除 MCP 服务器',
  'docs.mcpFields': '配置字段',
  'docs.mcpFieldCol': '字段',
  'docs.mcpRequiredCol': '必需',
  'docs.mcpDescCol': '描述',
  'docs.mcpYes': '是的',
  'docs.mcpNo': '根据提供的文件路径和 i18n key（`mcpNo'`），这看起来是一个单独的翻译键值，而不是完整的 Markdown 文档。内容仅为 "No"。

翻译结果：
```
否
```

（注：如果 "No" 是作为界面中的否定选项，也可译为 "不" 或 "否"，具体取决于上下文。此处按通用否定回答翻译为 "否"。）',
  'docs.mcpFieldCommandDesc': '启动 MCP 服务器的可执行命令。',
  'docs.mcpFieldArgsDesc': '传递给服务器的命令行参数',
  'docs.mcpFieldEnvDesc': 'KEY=VALUE 格式的环境变量',
  'docs.mcpFieldToolsDesc': '允许的工具名称；如果为空，则服务器上的所有工具均可用。',
  'docs.mcpFieldSetupDesc': '在启动服务器之前要运行的 shell 命令，例如构建索引。',
  'docs.mcpNote': '如果 MCP 工具名称与内置工具冲突，该工具将被跳过并发出警告。设置命令有 5 分钟的超时时间。',
  'docs.mcpExample': '示例：添加 CodeGraph 进行代码结构分析',
  'docs.envTitle': 'Claude Code 集成',
  'docs.envDesc': '如果您已经是 Claude Code 用户，并且配置了以下环境变量，Open Code Review 将自动识别它们——无需额外配置：',
  'docs.envNote': '您也可以使用 <code>ocr config</code> 来覆盖或补充这些设置。',
  'docs.copy': '我没有看到需要翻译的 Markdown 内容。您提到“文件路径: i18n key: copy'”，但实际内容似乎没有粘贴过来。

请提供需要翻译的 Markdown 文本，我会按照翻译规则将其翻译为简体中文。',

  // Docs Sidebar
  'docs.sidebar.gettingStarted': '开始使用',
  'docs.sidebar.userGuide': '用户指南',
  'docs.sidebar.quickstart': '快速开始',
  'docs.sidebar.installation': '安装',
  'docs.sidebar.configuration': '配置',
  'docs.sidebar.cliReference': 'CLI 参考',
  'docs.sidebar.reviewRules': '审查规则',
  'docs.sidebar.architecture': '架构',
  'docs.sidebar.tools': '工具',
  'docs.sidebar.mcp': 'MCP 服务器',
  'docs.sidebar.viewer': 'Session 查看器',
  'docs.sidebar.telemetry': '好的，请提供需要翻译的 Markdown 内容。您只给出了文件路径和 i18n key，但没有提供具体的文本内容。请补充完整内容，我将为您翻译。',
  'docs.sidebar.integrations': '集成',
  'docs.sidebar.agentSkill': 'Agent 技能',
  'docs.sidebar.claudeCode': '命令（Claude Code）',
  'docs.sidebar.delegate': '委托模式',
  'docs.sidebar.cicd': 'CI/CD',
  'docs.sidebar.contributing': '贡献',
  'docs.sidebar.faq': 'FAQ',
  'docs.search.placeholder': '搜索...',
  'docs.search.noResults': '未找到结果',
  'docs.search.hint.select': '选择',
  'docs.search.hint.open': '打开',
  'docs.search.hint.close': '关闭',

  // Blog
  'blog.title': 'title'：博客',
  'blog.allTags': '所有',
  'blog.backToList': '← 返回博客',
  'blog.toc': '目录',
  'blog.noPosts': '还没有发布任何文章。',
  'blog.noPostsForTag': '此标签下暂无文章。',
  'blog.search.placeholder': '搜索帖子...',
  'blog.search.noResults': '未找到结果',
} as const;
