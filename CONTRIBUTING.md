# 为 OpenCodeReview 做贡献

感谢你有兴趣为 OpenCodeReview 做贡献！每一份贡献都很重要——无论是修正拼写错误、报告 Bug，还是实现新功能。

[简体中文版](docs/i18n/CONTRIBUTING.zh-CN.md) | [日本語版](docs/i18n/CONTRIBUTING.ja-JP.md) | [한국어](docs/i18n/CONTRIBUTING.ko-KR.md) | [Русский](docs/i18n/CONTRIBUTING.ru-RU.md)

## 行为准则

参与本项目即表示你同意维护一个尊重、包容的环境。请在所有互动中保持友善和建设性。

## 贡献方式

除了写代码，还有很多方式可以贡献：

- **报告 Bug** —— 发现问题？提交 Issue 并附上复现步骤。
- **建议功能** —— 有改进想法？可以在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 发起讨论，或提交 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue。
- **改进文档** —— 修正拼写错误、澄清说明或补充示例。你也可以提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml) 报告问题。
- **审查 Pull Request** —— 帮助审查其他贡献者的代码。
- **编写代码** —— 修复 Bug、添加功能或提升性能。

## 快速开始

### 前置条件

- [Go 1.26.10+](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 环境搭建

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review

# 3. Add upstream remote (for syncing updates from the main repo)
git remote add upstream https://github.com/alibaba/open-code-review.git

# 4. Build the project
make build

# 5. Run tests
make test
```

如果全部通过，你就可以开始贡献了。

> **注意：** `upstream` 远程仓库对贡献者是只读的——它用于拉取主仓库的最新变更。你不能直接推送到 upstream。所有提交必须推送到你的 Fork（`origin`）并通过 Pull Request 提交。

### 行尾符

本项目通过 `.gitattributes` 强制使用 LF 行尾符。请配置 Git 自动规范化行尾符：

```bash
git config core.autocrlf input
```

这样提交时任何 CRLF 都会被转换为 LF，避免 CI 中出现行尾符问题。

## 开发工作流

### 分支

从 `main` 创建功能分支：

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

使用前缀标明变更类型：

| 前缀        | 用途                     |
| ----------- | ------------------------ |
| `feat/`     | 新功能                   |
| `fix/`      | Bug 修复                 |
| `docs/`     | 仅文档                   |
| `refactor/` | 代码重构（不改变行为）   |
| `test/`     | 添加或更新测试           |
| `chore/`    | 构建、CI 或工具变更      |

### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <short summary>

[optional body]
```

示例：

```
feat(viewer): add session search
fix(llm): handle timeout errors in Anthropic API calls
docs(README): update configuration examples
```

`PR Commit Policy` 会以不区分大小写的方式检查 PR 标题和每条提交的完整信息（包括正文）。不要包含 `[skip ci]`、`[ci skip]`、`[no ci]`、`[skip actions]`、`[actions skip]`，或 `skip-checks: true` / `skip-checks:true` 行。

要修复失败，请编辑 PR 标题或重写贡献分支上受影响的提交信息。新增一条干净的提交不会消除之前的违规。PR 描述可以讨论这些说明，不会被检查。

### 许可证头

每个源文件（`.go`、`.js`、`.mjs`、`.ts`、`.tsx`、`.kt`、`.kts`、`.sh`、`.py`、`.css`）都必须包含 SPDX 许可证头。创建新文件后，运行：

```bash
make license-add
```

这会自动添加所需的许可证头。缺少许可证头的 PR 会被 CI 拒绝。

### 代码质量

提交变更前，确保通过所有检查：

```bash
# Format, lint, and verify license headers
make check

# Run tests with race detection
make test

# Build successfully
make build
```

### 项目结构

```
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

我们完全欢迎使用 AI 辅助开发，也很高兴它能让你更轻松地做贡献。但我们不能接受模型生成的代码未经阅读就直接提交、冗余和错误都未清理的情况。这类提交会拖慢审查沟通，让 Pull Request 更难推进。

如果 AI 参与了你的工作，请遵循以下规则。

### 规则：

1. **你必须在最初的 Issue 或 Pull Request 中披露使用了 AI/LLM，以及所用的工具/模型。**
2. 你应当理解 AI 编写的每一行代码，并知道 AI 做了什么。
3. 当审查者询问变更原因时，你必须能自己解释，无论代码是你还是 AI 写的。回答维护者问题和审查意见的实质内容必须来自你自己的理解——你只能用 AI/LLM 翻译或润色措辞，不能让它替你生成答案。
4. 你的 PR 不应包含 `AI generated -> fixed -> fixed -> fixed` 这样的反复循环。这可能说明你没有审查 AI 生成的代码，而是让 AI 反复修复问题。
5. 在主动请求任何成员审查之前，你必须自己审查 AI/LLM 生成的所有代码、文本和其他内容。
6. 你不得将提交归属于 AI/LLM，包括通过 "Assisted-by"、"Co-developed-by" 或类似尾注。
7. 不要写过于冗长的提交信息。重要信息应放在 PR 描述中，而不是折叠的提交信息里。
8. 如果你不愿或无法做到以上所有要求，请关闭你的 Issue 或 Pull Request。

谢谢！

## 为文档做贡献

文档是 OpenCodeReview 的重要组成部分。我们欢迎改进 README 文件、代码内注释、配置示例以及任何面向用户的文本。

### 什么算文档贡献

- 修正拼写错误、语法错误或失效链接
- 澄清令人困惑的说明或补充缺失的上下文
- 为命令或配置选项添加使用示例
- 更新过时内容（例如功能变更后）
- 翻译或改进本地化文档（`docs/i18n/README.zh-CN.md`、`docs/i18n/README.ja-JP.md`、`docs/i18n/README.ko-KR.md`、`docs/i18n/README.ru-RU.md`、`docs/i18n/CONTRIBUTING.zh-CN.md`、`docs/i18n/CONTRIBUTING.ja-JP.md`、`docs/i18n/CONTRIBUTING.ko-KR.md`、`docs/i18n/CONTRIBUTING.ru-RU.md`）

### 文档工作流

1. 如果发现问题但不打算自己修复，请提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
2. 如果想修复，请 Fork 仓库、修改并提交 PR，分支前缀使用 `docs/`（例如 `docs/fix-config-example`）。
3. 仅文档的 PR 不需要修改测试，但请验证你包含的命令或代码片段准确无误。

### 文档文件

| 文件                              | 用途                     |
| --------------------------------- | ------------------------ |
| `README.md`                       | 项目主文档（英文）       |
| `docs/i18n/README.zh-CN.md`       | 中文翻译                 |
| `docs/i18n/README.ja-JP.md`       | 日文翻译                 |
| `docs/i18n/README.ko-KR.md`       | 韩文翻译                 |
| `docs/i18n/README.ru-RU.md`       | 俄文翻译                 |
| `CONTRIBUTING.md`                 | 贡献指南（英文）         |
| `docs/i18n/CONTRIBUTING.zh-CN.md` | 贡献指南（中文）         |
| `docs/i18n/CONTRIBUTING.ja-JP.md` | 贡献指南（日文）         |
| `docs/i18n/CONTRIBUTING.ko-KR.md` | 贡献指南（韩文）         |
| `docs/i18n/CONTRIBUTING.ru-RU.md` | 贡献指南（俄文）         |

## 提交变更

### 提交 Issue

在着手重大变更前，请先提交 Issue 讨论方案。这能避免重复工作，并确保你的贡献符合项目方向。

报告 Bug 时请包含：

1. OpenCodeReview 版本（`ocr version`）
2. 操作系统和架构
3. 复现步骤
4. 预期行为与实际行为
5. 相关日志或错误信息

### Pull Request 流程

1. **保持 PR 聚焦** —— 每个 PR 只做一项逻辑变更。如果有多个独立变更，请分别提交 PR。
2. **编写测试** —— 为任何行为变更添加或更新测试。
3. **更新文档** —— 如果变更影响面向用户的行为，请更新相关文档。
4. **签署 CLA** —— 所有贡献者必须在 PR 合并前签署贡献者许可协议（见下文）。
5. **填写 PR 模板** —— 描述变更内容和原因。

### PR 标题格式

使用与提交信息相同的 Conventional Commits 格式：

```
feat(viewer): add session search
```

### 审查流程

- 维护者会审查你的 PR，通常在几个工作日内。
- 我们可能会要求修改——这是正常的协作，不是对抗。
- 批准后，维护者会合并你的 PR。

## 加快 PR 审查的技巧

想让 PR 快速通过审查并合并？以下做法有帮助：

- **尽早签署 CLA** —— 许多首次贡献者因为错过 CLA 机器人的评论而被阻塞。机器人提示后请立即签署贡献者许可协议——未签署的 PR 无法合并。
- **确保所有 CI 检查通过** —— 检查失败的 PR 不会被审查。推送前在本地运行 `make test` 和 `make build`，尽早发现问题。
- **保持变更聚焦且小** —— 一个只做好一件事的 PR 远比混合无关变更的 PR 容易审查。小 PR 审查更快，也更不容易需要多轮修改。
- **写清晰准确的描述** —— 说明*什么*变了以及*为什么*。描述必须与实际 diff 一致——两者不符会让审查者失去信任。如果开发过程中范围有变，请在请求审查前更新描述。
- **为行为变更包含测试** —— 没有测试的新功能或 Bug 修复会引发疑问。测试能证明正确性，并帮助审查者理解预期行为。
- **遵循现有代码模式** —— 匹配周围代码的风格、命名约定和架构。一致性降低审查者的认知负担，避免仅针对风格的审查意见。
- **及时回应反馈** —— 审查者要求修改时，尽快处理以缩短审查周期。如果有不同意见，请解释理由，而不是忽略评论。

## 贡献者许可协议（CLA）

我们要求所有贡献者在合并贡献前签署阿里巴巴开源贡献者许可协议。这确保项目能按其许可证条款分发。

首次提交 PR 时，CLA 机器人会发布带说明的评论。按链接电子签署即可——只需一分钟。

## 首次贡献者

初次接触项目？可以寻找以下标签的 Issue：

- [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue) —— 范围明确的小任务，适合入门。
- [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted) —— 希望社区协助的 Issue。

一些好的入手方向：

- 改进错误信息和 CLI 输出
- 为未测试的代码路径编写测试
- 改进文档

## 社区

- **Bug 报告** —— [GitHub Issues](https://github.com/alibaba/open-code-review/issues)
- **功能建议** —— [GitHub Discussions (Ideas)](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 或 [Feature Request Issue](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml)
- **问题与帮助** —— 如果对使用 OpenCodeReview 有疑问，欢迎在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions) 提问

## 许可证

为 OpenCodeReview 做贡献即表示你同意你的贡献按 [Apache License 2.0](LICENSE) 许可。