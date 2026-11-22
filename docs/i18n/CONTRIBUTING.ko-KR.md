# OpenCodeReview 贡献指南

感谢您为 OpenCodeReview 做出贡献。无论是修正错别字、报告 bug，还是实现新功能，所有贡献都对项目有帮助。

[English](../../CONTRIBUTING.md) | [简体中文版](CONTRIBUTING.zh-CN.md) | [日本語版](CONTRIBUTING.ja-JP.md) | [한국어](CONTRIBUTING.ko-KR.md) | [Русский](CONTRIBUTING.ru-RU.md)

## Code of Conduct

参与本项目的所有人都应相互尊重，维护包容的环境。请在一切互动中保持友善和建设性的态度。

## 贡献方式

除了编写代码，您还可以通过多种方式做出贡献。

- **Bug 报告**：遇到问题时，请附上复现步骤提交 Issue。
- **功能建议**：有改进想法时，可在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 发起讨论，或提交 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue。
- **文档改进**：欢迎修正错别字、补充说明、添加示例。如需报告文档问题，请提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
- **Pull Request 评审**：评审其他贡献者的代码同样很有价值。
- **编写代码**：可以贡献 bug 修复、功能新增、性能改进等。

## 开始之前

### 前置条件

- [Go 1.26.10+](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 环境搭建

```bash
# 1. 在 GitHub 上 Fork 仓库

# 2. 克隆 Fork
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review

# 3. 添加上游远程仓库，以便获取主仓库的更新
git remote add upstream https://github.com/alibaba/open-code-review.git

# 4. 构建项目
make build

# 5. 运行测试
make test
```

以上流程全部通过后，即可开始贡献。

> **注意：** 贡献者对 `upstream` 远程仓库只有只读权限。它用于获取主仓库的最新变更，不能直接 push。所有贡献都应 push 到 Fork（`origin`），再通过 Pull Request 提交。

## 开发工作流

### 分支

从 `main` 创建功能分支。

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

使用前缀标明变更类型。

| 前缀 | 用途 |
|--------|---------|
| `feat/` | 新功能 |
| `fix/` | bug 修复 |
| `docs/` | 仅文档变更 |
| `refactor/` | 不改变行为的代码重构 |
| `test/` | 新增或修改测试 |
| `chore/` | 构建、CI、工具链变更 |

### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式。

```text
<type>(<scope>): <short summary>

[optional body]
```

示例：

```text
feat(viewer): add session search
fix(llm): handle timeout errors in Anthropic API calls
docs(README): update configuration examples
```

`PR Commit Policy` 会以不区分大小写的方式检查所有提交信息，包括 PR 标题和正文。
请勿包含仅由 `[skip ci]`、`[ci skip]`、`[no ci]`、`[skip actions]`、`[actions skip]` 或
`skip-checks: true` / `skip-checks:true` 组成的行。

检查失败时，请修改 PR 标题，或在您的贡献分支上重写对应提交信息。
追加一条不含这些指令的新提交，并不能解决此前提交的违规问题。
PR 描述中可以讨论这些指令，且不在检查范围内。

### 许可证头

所有源文件（`.go`、`.js`、`.mjs`、`.ts`、`.tsx`、`.kt`、`.kts`、`.sh`、`.py`、`.css`）都需要 SPDX 许可证头。创建新文件后，请运行：

```bash
make license-add
```

该命令会自动添加所需的许可证头。CI 会拒绝缺少许可证头的 PR。

### 代码质量

提交变更前，请确认所有检查均已通过。

```bash
# 格式、lint、许可证头校验
make check

# 带竞态检测运行测试
make test

# 确认构建成功
make build
```

### 项目结构

```text
.
├── acp/                  # ACP adapter for the CLI
├── bin/                  # NPM wrapper
├── cmd/opencodereview/   # CLI entry point
├── docs/                 # Localized README and CONTRIBUTING
├── examples/             # CI/CD integration examples
├── extensions/           # Editor extensions (VS Code and IDEA)
├── imgs/                 # Logo, benchmark, and highlight images
├── internal/
│   ├── agent/            # Review agent logic
│   ├── chatgptauth/      # ChatGPT OAuth and credential management
│   ├── config/           # Configuration management
│   ├── delegate/         # Delegation-mode review specs (no LLM)
│   ├── diff/             # Git diff parsing
│   ├── gitcmd/           # Bounded git subprocess runner
│   ├── llm/              # LLM API client (Anthropic, Bedrock & OpenAI)
│   ├── llmloop/          # Shared per-subtask tool-use loop
│   ├── mcp/              # MCP server client and tool adapter
│   ├── model/            # Data models
│   ├── pathutil/         # Canonical paths and containment checks
│   ├── release/          # Release asset URL naming checks
│   ├── scan/             # Full-file code review (ocr scan)
│   ├── session/          # Review session management
│   ├── stdout/           # Swappable stdout writer
│   ├── suggestdiff/      # Line-level diffs for suggestion rendering
│   ├── telemetry/        # OpenTelemetry integration
│   ├── tool/             # Built-in tools (file_read, code_search, etc.)
│   └── viewer/           # WebUI session viewer
├── npm/                  # Per-platform optional binary packages
├── pages/                # Landing page
├── plugins/              # Coding agent plugins
├── scripts/              # Install, publish, and check scripts
└── skills/               # Agent skill manifests
```

## AI 辅助开发

借助 AI 辅助开发本身完全没有问题，如果它能让贡献更轻松，反而值得欢迎。不可接受的是：未经阅读就直接提交模型生成的代码，且完全不清理其中的重复和错误。这类提交会拖慢评审讨论，让 Pull Request 难以推进。

如果开发过程中使用了 AI，请遵循以下规则。

### 规则：

1. **在初始 Issue 或 Pull Request 中说明使用了 AI/LLM，并公开所用工具/模型等信息。**
2. 理解 AI 编写的所有代码，清楚 AI 做了什么。
3. 评审者询问变更原因时，无论代码由您还是 AI 编写，您都必须能自行解释。对维护者提问和评审意见的回复内容必须出自您本人的理解。AI/LLM 只能用于翻译或润色语句，不得用于生成回复本身。
4. PR 中不得出现 `AI 生成 -> 修改 -> 修改 -> 修改` 这类反复循环。这可能意味着您未审查 AI 生成的代码，而是每次出问题都让 AI 自行修改。
5. 在主动邀请成员评审之前，请先自行审查 AI/LLM 生成的所有内容，包括代码、文本等。
6. 不得将提交归属于 AI/LLM，包括使用 'Assisted-by'、'Co-developed-by' 或类似尾注。
7. 不要写冗长啰嗦的提交信息。重要信息应放在 PR 描述中，而非折叠的提交信息里。
8. 如果不想或无法做到以上所有事项，请关闭 Issue 或 Pull Request。

谢谢！

## 文档贡献

文档是 OpenCodeReview 的重要组成部分。欢迎改进 README、行内代码注释、配置示例以及所有面向用户的文本。

### 属于文档贡献的工作

- 修正错别字、语法错误、失效链接
- 澄清令人困惑的说明，或补充缺失的上下文
- 添加命令或配置选项的使用示例
- 在功能变更后更新过时内容
- 翻译或改进本地化文档（`docs/i18n/README.zh-CN.md`、`docs/i18n/README.ja-JP.md`、`docs/i18n/README.ko-KR.md`、`docs/i18n/CONTRIBUTING.zh-CN.md`、`docs/i18n/CONTRIBUTING.ja-JP.md`、`docs/i18n/CONTRIBUTING.ko-KR.md`）

### 文档工作流

1. 发现问题但不打算自行修复时，请提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
2. 如需自行修复，请 Fork 仓库、完成修改，并使用 `docs/` 分支前缀提交 PR，例如 `docs/fix-config-example`。
3. 仅修改文档的 PR 无需修改测试，但请确认所包含的命令和代码片段准确无误。

### 文档文件

| 文件 | 用途 |
|------|---------|
| `README.md` | 项目主文档（英文） |
| `docs/i18n/README.zh-CN.md` | 中文翻译 |
| `docs/i18n/README.ja-JP.md` | 日文翻译 |
| `docs/i18n/README.ko-KR.md` | 韩文翻译 |
| `CONTRIBUTING.md` | 贡献指南（英文） |
| `docs/i18n/CONTRIBUTING.zh-CN.md` | 贡献指南（中文） |
| `docs/i18n/CONTRIBUTING.ja-JP.md` | 贡献指南（日文） |
| `docs/i18n/CONTRIBUTING.ko-KR.md` | 贡献指南（韩文） |

## 提交变更

### 提交 Issue

开始较大变更前，请先提交 Issue 讨论方案。这样可以减少重复工作，并确认贡献方向与项目一致。

报告 bug 时，请包含以下信息。

1. OpenCodeReview 版本（`ocr version`）
2. 操作系统与架构
3. 复现步骤
4. 预期行为与实际行为
5. 相关日志或错误信息

### Pull Request 流程

1. **保持 PR 聚焦**：一个 PR 只包含一个逻辑变更。若有多个相互独立的变更，请分别提交 PR。
2. **编写测试**：行为变更需新增或更新测试。
3. **更新文档**：用户可见行为发生变化时，请更新相关文档。
4. **签署 CLA**：所有贡献者必须在 PR 合并前签署 Contributor License Agreement。
5. **填写 PR 模板**：说明变更内容与原因。

### PR 标题格式

使用与提交信息相同的 Conventional Commits 格式。

```text
feat(viewer): add session search
```

### 评审流程

- 维护者通常会在几天内评审 PR。
- 可能会要求修改。这是正常且协作性的过程。
- 通过后，维护者会合并 PR。

## 如何让 PR 更快通过评审

希望 PR 快速通过评审并合并？以下做法有帮助：

- **尽快签署 CLA** — 许多首次贡献者因忽略 CLA bot 的评论而受阻。bot 提示后请立即签署 Contributor License Agreement — 未签署 CLA 的 PR 无法合并。
- **让所有 CI 检查通过** — CI 失败的 PR 不会被评审。push 前请在本地运行 `make test` 和 `make build`，提前发现问题。
- **保持变更聚焦且小** — 只做一件事的 PR 比混杂无关变更的 PR 容易评审得多。PR 越小，评审越快，需要多轮修改的可能性也越小。
- **编写清晰准确的描述** — 说明*改了什么*以及*为什么*改。描述必须与实际 diff 一致 — 两者不符会失去评审者的信任。开发过程中范围若有变化，请在请求评审前更新描述。
- **行为变更附带测试** — 没有测试的新功能或 bug 修复会引发质疑。测试能证明正确性，并帮助评审者理解预期行为。
- **遵循现有代码模式** — 与周边代码的风格、命名规范、架构保持一致。一致性可降低评审者的认知负担，避免风格相关的评审意见。
- **及时响应反馈** — 评审者要求修改时请尽快处理，缩短评审周期。如有不同意见，请说明理由，不要忽略评论。

## Contributor License Agreement (CLA)

所有贡献者都必须签署 Alibaba Open Source Contributor License Agreement。这是确保项目能按许可证条款分发的必要程序。

提交首个 PR 后，CLA bot 会留下提示评论。按链接完成电子签署即可，通常约需 1 分钟。

## 首次贡献者

如果是第一次贡献，可以查找带有以下标签的 Issue。

- [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue)：适合入门、范围明确的小任务
- [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted)：欢迎社区协助的 Issue

适合入门的领域：

- 改进错误信息和 CLI 输出
- 为测试不足的代码路径补充测试
- 改进文档

## 社区

- **Bug 报告**：[GitHub Issues](https://github.com/alibaba/open-code-review/issues)
- **功能建议**：[GitHub Discussions (Ideas)](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 或 [Feature Request Issue](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml)
- **问题与帮助**：OpenCodeReview 使用相关问题可发布到 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions)。

## 许可证

为 OpenCodeReview 做出贡献，即表示您同意该贡献按 [Apache License 2.0](../../LICENSE) 授权。