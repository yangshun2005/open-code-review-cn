# 为 OpenCodeReview 做贡献

感谢您有兴趣为 OpenCodeReview 做贡献！无论是修正拼写错误、报告 Bug，还是实现新功能，每一份贡献都至关重要。

[English Version](CONTRIBUTING.md) | [简体中文版](CONTRIBUTING.zh-CN.md) | [한국어](CONTRIBUTING.ko-KR.md) | [Русский](CONTRIBUTING.ru-RU.md)

## 行为准则

参与本项目即表示您同意维护一个尊重他人、包容友善的环境。在所有互动中，请保持友善和建设性。

## 贡献方式

除了编写代码之外，还有多种贡献方式：

- **报告 Bug** — 发现了问题？请附上复现步骤并提交 Issue。
- **功能建议** — 有改进想法？可以在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 中发起讨论，或提交 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue。
- **改进文档** — 修正拼写错误、澄清说明、补充示例等。您也可以通过 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml) 报告文档问题。
- **审查 Pull Request** — 帮助其他贡献者进行代码审查。
- **编写代码** — 修复 Bug、添加功能、提升性能等。

## 开始之前

### 环境要求

- [Go 1.25+](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 环境搭建

```bash
# 1. 在 GitHub 上 Fork 仓库

# 2. 克隆您的 Fork
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review

# 3. 添加上游 remote（用于同步主仓库的更新）
git remote add upstream https://github.com/alibaba/open-code-review.git

# 4. 构建项目
make build

# 5. 运行测试
make test
```

如果全部通过，您就可以开始贡献了。

> **注意：** `upstream` remote 对贡献者是只读的 — 它用于从主仓库获取最新变更。您不能直接推送到 upstream。所有贡献都需要推送到您自己的 Fork（`origin`），并通过 Pull Request 提交。

## 开发工作流

### 分支管理

从 `main` 分支创建功能分支：

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

请使用能够表明变更类型的前缀：

| 前缀        | 用途                                    |
| ----------- | --------------------------------------- |
| `feat/`     | 新功能                                  |
| `fix/`      | Bug 修复                                |
| `docs/`     | 仅文档变更                              |
| `refactor/` | 代码重构（不改变行为）                  |
| `test/`     | 添加或更新测试                          |
| `chore/`    | 构建、CI、工具链相关变更                |

### 提交信息

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <short summary>

[optional body]
```

示例：

```
feat(agent): add support for custom tool definitions
fix(llm): handle timeout errors in Anthropic API calls
docs(README): update configuration examples
```

### 许可证头

所有源文件（`.go`、`.sh`、`.js`、`.mjs`、`.ts`、`.tsx`）都必须包含 SPDX 许可证头。创建新文件后，请运行：

```bash
make license-add
```

该命令会自动添加所需的许可证头。CI 会拒绝缺少许可证头的 PR。

### 代码质量

在提交变更之前，请确保所有检查都能通过：

```bash
# 格式化、Lint、许可证头验证
make check

# 使用竞态检测运行测试
make test

# 确保构建成功
make build
```

### 项目结构

```
├── cmd/opencodereview/   # CLI 入口点
├── internal/
│   ├── agent/            # 审查 Agent 逻辑
│   ├── config/           # 配置管理
│   ├── diff/             # Git diff 解析
│   ├── llm/              # LLM API 客户端（Anthropic & OpenAI）
│   ├── model/            # 数据模型
│   ├── session/          # 审查会话管理
│   ├── tool/             # 内置工具（file_read、code_search 等）
│   ├── telemetry/        # OpenTelemetry 集成
│   └── viewer/           # WebUI 会话查看器
├── pages/                # WebUI 前端
├── scripts/              # 构建和安装脚本
└── bin/                  # NPM 包装器
```

## 文档贡献

文档是 OpenCodeReview 的重要组成部分。我们欢迎对 README 文件、内联代码注释、配置示例以及其他面向用户的文本进行改进。

### 文档贡献包括

- 修正拼写错误、语法错误或失效链接
- 澄清难以理解的说明或补充缺失的上下文
- 添加命令或配置选项的使用示例
- 更新过时的内容（例如功能变更后）
- 翻译或改进中文文档（`README.zh-CN.md`、`CONTRIBUTING.zh-CN.md`）

### 文档工作流

1. 如果您发现问题但自己不打算修复，请提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
2. 如果您想自行修复，请 Fork 仓库、进行修改，并使用 `docs/` 分支前缀（例如 `docs/fix-config-example`）提交 PR。
3. 纯文档 PR 不需要测试变更，但请确保包含的命令和代码片段准确无误。

### 文档文件

| 文件                    | 用途                                       |
| ----------------------- | ------------------------------------------ |
| `README.md`             | 主要项目文档（英文）                        |
| `README.zh-CN.md`       | 中文翻译                                   |
| `CONTRIBUTING.md`       | 贡献指南（英文）                            |
| `CONTRIBUTING.zh-CN.md` | 贡献指南（中文）                            |

## 提交变更

### 提交 Issue

在着手进行重大变更之前，请先提交 Issue 讨论您的方案。这样可以避免重复工作，并确保您的贡献与项目方向一致。

报告 Bug 时，请包含以下信息：

1. OpenCodeReview 版本（`ocr version`）
2. 操作系统和架构
3. 复现步骤
4. 预期行为和实际行为
5. 相关日志或错误信息

### Pull Request 流程

1. **PR 应聚焦** — 一个 PR 只包含一个逻辑变更。如果有多个独立变更，请分别提交 PR。
2. **编写测试** — 行为变更需要添加或更新测试。
3. **更新文档** — 如果变更影响面向用户的行为，请更新相关文档。
4. **签署 CLA** — 所有贡献者必须在 PR 合并前签署 Contributor License Agreement（见下文）。
5. **填写 PR 模板** — 描述变更内容和原因。

### PR 标题格式

请使用与提交信息相同的 Conventional Commits 格式：

```
feat(agent): add support for custom tool definitions
```

### 审查流程

- 维护者会审查 PR，通常需要几个工作日。
- 可能会要求您进行修改 — 这是正常的协作流程，并非针对个人。
- 获得批准后，维护者会合并 PR。

## 让 PR 更快获得审查的提示

希望您的 PR 能快速获得审查和合并？以下实践会有所帮助：

- **尽早签署 CLA** — 许多首次贡献者会忽略 CLA 机器人的评论，导致流程停滞。看到机器人提示后，请立即签署 Contributor License Agreement — 未签署 CLA 的 PR 无法合并。
- **确保所有 CI 检查通过** — CI 失败的 PR 不会被审查。推送前请在本地运行 `make test` 和 `make build`，尽早发现问题。
- **保持变更聚焦且精简** — 只做一件事的 PR 远比混杂了无关变更的 PR 更容易审查。小 PR 审查更快，修改往返也更少。
- **撰写清晰准确的描述** — 说明*做了什么*以及*为什么*。描述必须与实际 diff 一致 — 两者不一致会失去审查者的信任。如果开发过程中范围发生变化，请在请求审查前更新描述。
- **行为变更包含测试** — 没有测试的新功能或 Bug 修复会引发疑问。测试能够证明正确性，并帮助审查者理解预期行为。
- **遵循现有代码模式** — 与周围代码的风格、命名约定和架构保持一致。一致性可以降低审查者的认知负担，避免纯风格类的审查意见。
- **快速响应反馈** — 当审查者要求修改时，请快速响应以保持审查周期简短。如果不同意，请说明理由，而不是忽略评论。

## Contributor License Agreement（CLA）

在合并贡献之前，我们要求所有贡献者签署 Alibaba Open Source Contributor License Agreement。这可以确保项目能够在许可条款下进行分发。

当您提交第一个 PR 时，CLA 机器人会发布包含操作步骤的评论。点击链接完成电子签名即可 — 整个过程不到一分钟。

## 首次贡献者

刚接触这个项目？可以寻找带有以下标签的 Issue：

- [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue) — 范围明确的小任务，非常适合入门。
- [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted) — 欢迎社区协助的 Issue。

适合入门的领域：

- 改进错误信息或 CLI 输出
- 为未覆盖的代码路径编写测试
- 改进文档

## 社区

- **报告 Bug** — [GitHub Issues](https://github.com/alibaba/open-code-review/issues)
- **功能建议** — [GitHub Discussions (Ideas)](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 或 [Feature Request Issue](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml)
- **提问和帮助** — 如果您对 OpenCodeReview 的使用有任何疑问，欢迎在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions) 中提问

## 许可证

为 OpenCodeReview 做出贡献，即表示您同意您的贡献将依据 [Apache License 2.0](LICENSE) 进行许可。