# 路线图

本文档描述了 OpenCodeReview 未来一年的规划方向。这是一份动态文档，将随着优先级的变化而更新。

欢迎通过 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions) 或 [Issues](https://github.com/alibaba/open-code-review/issues) 提供反馈。

## 当前状态（2026 年中）

OpenCodeReview 目前提供：

- 一个 CLI 工具（`ocr`），用于 AI 驱动的代码审查，采用确定性工程与代理混合架构。
- 与编码代理的集成：Claude Code（插件/技能）、Codex（插件）和 Cursor（插件）。
- 一个用于编辑器内代码审查的 VSCode 扩展。
- CI/CD 集成（GitHub Actions、GitLab CI 等）。
- 多提供商 LLM 支持（兼容 OpenAI、Anthropic、Google Gemini、Amazon Bedrock、Azure OpenAI 等）。
- MCP 服务器——通过 [Model Context Protocol](https://modelcontextprotocol.io/) 暴露 OpenCodeReview，以便任何兼容 MCP 的客户端都能调用审查能力。
- 审查规则引擎，支持按文件模式匹配。
- 多语言文档（英语、中文、日语、韩语、俄语）。

## 规划中 — 2026 年下半年

### IDE 插件

- **JetBrains 插件** — 将 AI 代码审查引入 IntelliJ IDEA、GoLand、PyCharm 及其他 JetBrains IDE，功能与现有 VSCode 扩展相同。

### 委托模式

- **订阅友好型审查** — 一种可选模式，`ocr` 不再依赖单独配置的 LLM 端点。`ocr` 不再自行调用 LLM，而是解析审查范围、应用排除规则、加载审查规则、注入背景上下文并收集差异，然后将这些内容作为结构化审查任务交给宿主编码代理（例如 Claude Code）执行，由其使用自身的代理循环和包含的订阅用量来完成——从而无需独立的 API 密钥。

### 极致模式

- **高召回率审查模式** — 一种可选模式，以增加令牌消耗和审查时间为代价，换取显著更高的 Issue 召回率。专为安全敏感或高风险变更集设计，在这些场景中，彻底性比速度更重要。

## 规划中 — 2027 年上半年

### 领域特定长期记忆

- **持久化审查知识** — 使审查引擎能够随时间积累领域特定知识（重复出现的模式、过往审查决策、项目特定约定），并将其应用于未来的审查，从而提高相关性并减少重复反馈。

## 不在规划内

以下内容明确不在可预见未来的范围内：

- **无需人工审查的自动代码修复** — OCR 是审查工具，而非自动修复工具。虽然它可以建议修复方案，但应用更改始终需要人工批准。
- **通用 AI 编码助手** — OCR 专注于代码审查。代码生成、重构或基于聊天的编码辅助等功能不在规划内。
- **自托管 LLM 捆绑** — OCR 连接外部 LLM 提供商，但本身不捆绑或托管模型。