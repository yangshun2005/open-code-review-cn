# 为 OpenCodeReview 做贡献

感谢你有兴趣为 OpenCodeReview 做贡献！无论是修正拼写错误、报告 Bug，还是实现新功能，任何贡献都很重要。

[English Version](../../CONTRIBUTING.md) | [简体中文版](CONTRIBUTING.zh-CN.md) | [한국어](CONTRIBUTING.ko-KR.md) | [Русский](CONTRIBUTING.ru-RU.md)

## 行为准则

参与本项目即表示你同意维护一个尊重、包容的环境。在所有交流中请保持友善和建设性。

## 贡献方式

除了写代码，还有很多其他贡献方式：

- **报告 Bug** — 发现了问题？请附上复现步骤提交 Issue。
- **功能建议** — 有改进想法？可以在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 发起讨论，或提交 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue。
- **改进文档** — 修正拼写错误、澄清说明、补充示例等。也可以提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml) 报告问题。
- **审查 Pull Request** — 帮助审查其他贡献者的代码。
- **写代码** — 修复 Bug、添加功能、优化性能等。

## 入门

### 前提条件

- [Go 1.26.10+](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 环境搭建

```bash
# 1. 在 GitHub 上 Fork 仓库

# 2. 克隆你的 Fork
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review

# 3. 添加上游远程（用于从主仓库同步更新）
git remote add upstream https://github.com/alibaba/open-code-review.git

# 4. 构建项目
make build

# 5. 运行测试
make test
```

全部通过后，就可以开始贡献了。

> **注意：** `upstream` 远程对贡献者来说是只读的——用于从主仓库获取最新变更。你不能直接推送到 upstream。所有贡献都必须推送到自己的 Fork（`origin`），并通过 Pull Request 提交。

## 开发工作流

### 分支管理

从 `main` 创建功能分支：

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

请使用表示变更类型的前缀：

| 前缀        | 用途                         |
| ----------- | ---------------------------- |
| `feat/`     | 新功能                       |
| `fix/`      | Bug 修复                     |
| `docs/`     | 仅文档                       |
| `refactor/` | 代码重构（不改变行为）       |
| `test/`     | 添加或更新测试               |
| `chore/`    | 构建、CI、工具链变更         |

### 提交信息

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

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

`PR Commit Policy` 会检查所有提交信息（包括 PR 标题和正文），不区分大小写。请勿包含仅由 `[skip ci]`、`[ci skip]`、`[no ci]`、`[skip actions]`、`[actions skip]` 或 `skip-checks: true` / `skip-checks:true` 组成的行。

如果检查失败，请编辑 PR 标题，或在自己的工作分支上改写对应的提交信息。追加不含这些指令的提交并不能消除历史提交的违规。PR 描述中可以讨论这些指令，且不在检查范围内。

### 许可证头

所有源文件（`.go`、`.js`、`.mjs`、`.ts`、`.tsx`、`.kt`、`.kts`、`.sh`、`.py`、`.css`）都需要 SPDX 许可证头。创建新文件后，请执行：

```bash
make license-add
```

该命令会自动添加所需的头部。CI 会拒绝缺少头部的 PR。

### 代码质量

提交变更前，请确保通过所有检查：

```bash
# 验证格式、Lint、许可证头
make check

# 运行带竞态检测的测试
make test

# 确保构建成功
make build
```

### 项目结构

```
├── acp/                  # CLI 的 ACP 适配器
├── bin/                  # NPM 包装器
├── cmd/opencodereview/   # CLI 入口
├── docs/                 # 本地化版 README 和 CONTRIBUTING
├── examples/             # CI/CD 集成示例
├── extensions/           # 编辑器扩展（VS Code 和 IDEA）
├── imgs/                 # Logo、基准测试、亮点图片
├── internal/
│   ├── agent/            # 审查代理逻辑
│   ├── chatgptauth/      # ChatGPT 的 OAuth 与凭据管理
│   ├── config/           # 配置管理
│   ├── delegate/         # 委托模式审查规范（无 LLM）
│   ├── diff/             # Git diff 解析
│   ├── gitcmd/           # 限制并发数的 git 子进程运行器
│   ├── llm/              # LLM API 客户端（Anthropic、Bedrock、OpenAI）
│   ├── llmloop/          # 子任务共享的工具调用循环
│   ├── mcp/              # MCP 服务器客户端与工具适配器
│   ├── model/            # 数据模型
│   ├── pathutil/         # 路径规范化与包含检查
│   ├── release/          # 发布资产 URL 命名检查
│   ├── scan/             # 全文件代码审查（ocr scan）
│   ├── session/          # 审查会话管理
│   ├── stdout/           # 可切换的 stdout 写入器
│   ├── suggestdiff/      # 用于建议展示的行级 diff
│   ├── telemetry/        # OpenTelemetry 集成
│   ├── tool/             # 内置工具（file_read、code_search 等）
│   └── viewer/           # WebUI 会话查看器
├── npm/                  # 按平台划分的可选二进制包
├── pages/                # 落地页
├── plugins/              # 面向编码代理的插件
├── scripts/              # 安装、发布、检查脚本
└── skills/               # 代理技能清单
```

## AI 辅助开发

用 AI 辅助开发完全没问题，如果能让贡献更轻松，反而值得欢迎。不可接受的是：不阅读模型生成的代码就直接提交，完全不修正其冗余和错误。这类提交会拖慢审查沟通，让 Pull Request 难以推进。

如果你在开发中使用了 AI，请遵循以下规则。

### 规则：

1. **必须在初始 Issue 或 Pull Request 中披露使用了 AI/LLM，以及使用的工具/模型等信息。**
2. 必须理解 AI 写的所有代码，掌握 AI 做了什么。
3. 当审查者询问变更理由时，无论是你自己写的还是 AI 写的，都必须能自行解释。回答维护者提问和审查意见的内容必须基于你自己的理解。AI/LLM 只能用于翻译和文字润色，不得用于生成回答本身。
4. PR 中不得出现 `AI 生成 -> 修正 -> 修正 -> 修正` 这样的反复循环。这表明你可能没有审查 AI 生成的代码，而是每次出问题就让 AI 修改，反复循环。
5. 在请成员审查之前，必须亲自审查 AI/LLM 生成的所有代码、文本等内容。
6. 不得使用 "Assisted-by"、"Co-developed-by" 或类似 trailer 将提交归因于 AI/LLM。
7. 不要写冗长的提交信息。重要信息应写在 PR 描述中，而不是折叠的提交信息里。
8. 如果你不愿意或无法做到以上所有事项，请关闭 Issue 或 Pull Request。

谢谢！

## 为文档做贡献

文档是 OpenCodeReview 的重要组成部分。欢迎改进 README 文件、行内代码注释、配置示例以及其他面向用户的文本。

### 哪些属于文档贡献

- 修正拼写错误、语法错误、失效链接
- 澄清难以理解的说明，补充缺失的上下文
- 添加命令和配置选项的使用示例
- 更新过时内容（如功能变更后）
- 翻译和改进中文文档（`docs/i18n/README.zh-CN.md`、`docs/i18n/CONTRIBUTING.zh-CN.md`）

### 文档工作流

1. 如果发现问题但不打算自己修复，请提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
2. 如果想自己修复，请 Fork 仓库、进行修改，并使用 `docs/` 分支前缀（如 `docs/fix-config-example`）提交 PR。
3. 仅文档的 PR 无需修改测试，但请确保包含的命令和代码片段准确无误。

### 文档文件

| 文件                              | 用途                     |
| --------------------------------- | ------------------------ |
| `README.md`                       | 主项目文档（英文）       |
| `docs/i18n/README.zh-CN.md`       | 中文翻译                 |
| `CONTRIBUTING.md`                 | 贡献指南（英文）         |
| `docs/i18n/CONTRIBUTING.zh-CN.md` | 贡献指南（中文）         |

## 提交变更

### 提交 Issue

在着手大型变更之前，请先提交 Issue 讨论方案。这可以避免重复工作，并确保贡献与项目方向一致。

报告 Bug 时，请包含以下内容：

1. OpenCodeReview 版本（`ocr version`）
2. 操作系统和架构
3. 复现步骤
4. 预期行为与实际行为
5. 相关日志或错误信息

### Pull Request 流程

1. **保持 PR 聚焦** — 一个 PR 只包含一个逻辑变更。如果有多个独立变更，请分别提交 PR。
2. **编写测试** — 行为变更请添加或更新测试。
3. **更新文档** — 如果变更影响面向用户的行为，请更新相关文档。
4. **签署 CLA** — 所有贡献者必须在 PR 合并前签署 Contributor License Agreement（见下文）。
5. **填写 PR 模板** — 描述变更内容和原因。

### PR 标题格式

使用与提交信息相同的 Conventional Commits 格式：

```
feat(viewer): add session search
```

### 审查流程

- 维护者会审查 PR，通常在几个工作日内完成。
- 可能会要求你修改——这是正常的协作过程，并非对抗。
- 通过后，维护者会合并 PR。

## 让 PR 更快获得审查的技巧

想让 PR 快速获得审查和合并？以下做法会有帮助：

- **尽早签署 CLA** — 许多首次贡献者忽略了 CLA 机器人的评论，导致流程停滞。看到机器人提示后请立即签署 Contributor License Agreement——未签署 CLA 的 PR 无法合并。
- **通过所有 CI 检查** — CI 失败的 PR 不会被审查。推送前请在本地运行 `make test` 和 `make build`，尽早发现问题。
- **保持变更聚焦且小** — 只做一件事的 PR 比混杂无关变更的 PR 容易审查得多。小 PR 审查更快，修改往返也更少。
- **写清晰准确的描述** — 说明*改了什么*和*为什么改*。描述必须与实际 diff 一致——两者不一致会失去审查者的信任。如果开发过程中范围发生变化，请在请求审查前更新描述。
- **行为变更附带测试** — 没有测试的新功能或 Bug 修复会引发疑问。测试能证明正确性，帮助审查者理解预期行为。
- **遵循现有代码模式** — 与周围代码的风格、命名规范、架构保持一致。一致性可以降低审查者的认知负担，避免仅针对风格的审查意见。
- **快速响应反馈** — 审查者要求修改时，请迅速响应以缩短审查周期。如果有不同意见，请说明理由，而不是忽略评论。

## Contributor License Agreement（CLA）

在合并贡献之前，我们要求所有贡献者签署 Alibaba Open Source Contributor License Agreement。这确保项目能够在许可证条款下分发。

提交第一个 PR 时，CLA 机器人会发布一条包含操作步骤的评论。只需点击链接进行电子签名——不到一分钟。

## 首次贡献者

第一次参与项目？可以寻找带有以下标签的 Issue：

- [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue) — 适合入门的小型、范围明确的任务。
- [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted) — 欢迎社区协助的 Issue。

适合入门的领域：

- 改进错误信息和 CLI 输出
- 为未测试的代码路径编写测试
- 改进文档

## 社区

- **Bug 报告** — [GitHub Issues](https://github.com/alibaba/open-code-review/issues)
- **功能建议** — [GitHub Discussions (Ideas)](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 或 [Feature Request Issue](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml)
- **问题与帮助** — 如有关于 OpenCodeReview 使用的问题，欢迎在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions) 提问

## 许可证

为 OpenCodeReview 做贡献即表示你同意你的贡献在 [Apache License 2.0](../../LICENSE) 下授权。