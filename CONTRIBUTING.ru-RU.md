# 参与 OpenCodeReview 开发

感谢您对 OpenCodeReview 发展的关注！任何贡献都很重要——无论是修正一个拼写错误、报告一个 Bug，还是添加一项新功能。

[English](CONTRIBUTING.md) | [简体中文版](CONTRIBUTING.zh-CN.md) | [日本語版](CONTRIBUTING.ja-JP.md) | [한국어](CONTRIBUTING.ko-KR.md) | Русский

## 行为准则

参与本项目即表示您同意维护一个互相尊重且包容的氛围。请在任何互动中保持友善和建设性。

## 如何贡献

除了编写代码，还有很多方式可以做出贡献：

- **报告 Bug** — 发现问题了？请提交一个包含复现步骤的 Issue。
- **提出改进建议** — 有想法？在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 中发起讨论，或提交一个 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue。
- **改进文档** — 修正拼写错误、澄清表述、添加示例。如需报告问题，也可以提交一个 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
- **审查 Pull Request** — 帮助我们审查其他贡献者的代码。
- **编写代码** — 修复 Bug、添加功能、提升性能。

## 入门指南

### 环境要求

- [Go 1.25+](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 环境搭建

```bash
# 1. 在 GitHub 上 Fork 本仓库

# 2. 克隆您的 Fork
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review

# 3. 添加上游 remote（用于与主仓库同步）
git remote add upstream https://github.com/alibaba/open-code-review.git

# 4. 构建项目
make build

# 5. 运行测试
make test
```

如果一切顺利——您就可以开始贡献了。

> **注意：** 对于贡献者来说，`upstream` remote 是只读的——它用于从主仓库拉取最新变更。不能直接推送到 upstream。所有更改都应推送到您的 Fork（`origin`），并通过 Pull Request 提交。

## 开发流程

### 分支

从 `main` 分支创建功能分支：

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

请使用表示变更类型的前缀：

| 前缀        | 用途                                  |
| ----------- | ------------------------------------- |
| `feat/`     | 新功能                                |
| `fix/`      | Bug 修复                              |
| `docs/`     | 仅文档变更                            |
| `refactor/` | 重构（不改变行为）                    |
| `test/`     | 添加或更新测试                        |
| `chore/`    | 构建、CI 或工具链相关                 |

### 提交信息

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <简短描述>

[可选的正文]
```

示例：

```
feat(agent): add support for custom tool definitions
fix(llm): handle timeout errors in Anthropic API calls
docs(README): update configuration examples
```

### 许可证头

每个源文件（`.go`、`.sh`、`.js`、`.mjs`、`.ts`、`.tsx`）都必须包含 SPDX 许可证头。创建新文件后，请执行：

```bash
make license-add
```

该命令会自动添加所需的许可证头。CI 会拒绝缺少许可证头的 PR。

### 代码质量

在提交更改之前，请确保所有检查都能通过：

```bash
# 格式化、Lint 和许可证头检查
make check

# 带竞态检测器的测试
make test

# 构建成功
make build
```

### 项目结构

```
├── cmd/opencodereview/   # CLI 入口点
├── internal/
│   ├── agent/            # 审查代理逻辑
│   ├── config/           # 配置管理
│   ├── diff/             # Git Diff 解析
│   ├── llm/              # LLM API 客户端（Anthropic 和 OpenAI）
│   ├── model/            # 数据模型
│   ├── session/          # 审查会话管理
│   ├── tool/             # 内置工具（file_read、code_search 等）
│   ├── telemetry/        # OpenTelemetry 集成
│   └── viewer/           # WebUI 会话查看器
├── pages/                # WebUI 前端
├── scripts/              # 构建和安装脚本
└── bin/                  # NPM 包装
```

## 文档贡献

文档是 OpenCodeReview 至关重要的组成部分。我们欢迎对 README 文件、代码注释、配置示例以及任何面向用户的文本进行改进。

### 哪些算作文档贡献

- 修正拼写错误、语法错误和失效链接
- 澄清令人困惑的解释，补充缺失的上下文
- 添加命令和配置参数的使用示例
- 更新过时的内容（例如功能变更后）
- 翻译和改进本地化文档（`README.zh-CN.md`、`README.ja-JP.md`、`README.ko-KR.md`、`README.ru-RU.md`、`CONTRIBUTING.zh-CN.md`、`CONTRIBUTING.ja-JP.md`、`CONTRIBUTING.ko-KR.md`、`CONTRIBUTING.ru-RU.md`）

### 文档工作流程

1. 如果您发现问题但不想自行修复，请提交一个 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
2. 如果您想自行修复——请 Fork，进行更改，并提交一个分支前缀为 `docs/` 的 PR（例如 `docs/fix-config-example`）。
3. 仅涉及文档的 PR 不需要修改测试，但请验证所有引用的命令和代码片段的准确性。

### 文档文件

| 文件                     | 用途                                        |
| ------------------------ | ------------------------------------------- |
| `README.md`              | 项目主文档（英文）                          |
| `README.zh-CN.md`        | 中文翻译                                    |
| `README.ja-JP.md`        | 日文翻译                                    |
| `README.ko-KR.md`        | 韩文翻译                                    |
| `README.ru-RU.md`        | 俄文翻译                                    |
| `CONTRIBUTING.md`        | 贡献者指南（英文）                          |
| `CONTRIBUTING.zh-CN.md`  | 贡献者指南（中文）                          |
| `CONTRIBUTING.ja-JP.md`  | 贡献者指南（日文）                          |
| `CONTRIBUTING.ko-KR.md`  | 贡献者指南（韩文）                          |
| `CONTRIBUTING.ru-RU.md`  | 贡献者指南（俄文）                          |

## 提交更改

### 提交 Issue

在着手进行重大更改之前，请先提交一个 Issue 并讨论方案。这可以避免重复工作，并确保您的贡献与项目的发展方向一致。

报告 Bug 时，请提供：

1. OpenCodeReview 版本（`ocr version`）
2. 操作系统和架构
3. 复现步骤
4. 预期行为和实际行为
5. 相关的日志或错误信息

### Pull Request 流程

1. **保持 PR 聚焦** — 每个 PR 只包含一个逻辑变更。多个独立更改最好分别提交 PR。
2. **编写测试** — 任何行为变更都应添加或更新测试。
3. **更新文档** — 如果更改影响用户可见行为，请更新相应文档。
4. **签署 CLA** — 在 PR 被接受之前，所有贡献者都必须签署贡献者许可协议（见下文）。
5. **填写 PR 模板** — 描述您的更改做了什么以及为什么需要。

### PR 标题格式

请使用与提交信息相同的 Conventional Commits 格式：

```
feat(agent): add support for custom tool definitions
```

### 审查流程

- 维护者会查看您的 PR——通常需要几个工作日。
- 我们可能会要求您进行修改——这是正常的协作过程，而不是对抗。
- 获得批准后，维护者会合并您的 PR。

## 如何加快 PR 的审查速度

希望您的 PR 能更快地被审查和接受？以下做法会有所帮助：

- **提前签署 CLA** — 许多新手贡献者因为忽略了 CLA 机器人的评论而卡住。请在机器人提示时立即签署贡献者许可协议——没有签署 CLA 的 PR 无法被接受。
- **确保所有 CI 检查通过** — 未通过检查的 PR 不会被审查。提交前请在本地运行 `make test` 和 `make build`，提前发现问题。
- **保持更改聚焦且精简** — 一个能把一件事做好的 PR 比混杂了无关更改的 PR 容易审查得多。小 PR 审查更快，也更少需要多轮修改。
- **撰写清晰准确的描述** — 解释*什么*发生了变化以及*为什么*。描述应与实际 diff 一致——如果两者不一致，审查者会失去信任。如果开发过程中工作量发生了变化，请在请求审查前更新描述。
- **为行为变更添加测试** — 没有测试的新功能或修复会引发疑问。测试能证明正确性，并帮助审查者理解预期行为。
- **遵循现有代码模式** — 遵循周围代码的风格、命名约定和架构。一致性可以降低审查者的认知负担，避免出现仅涉及风格的评论。
- **及时响应反馈** — 当审查者要求修改时，请快速处理以缩短审查周期。如果您不同意，请解释您的立场，而不是忽略评论。

## 贡献者许可协议（CLA）

在我们接受您的贡献之前，您需要签署阿里巴巴开源贡献者许可协议。这确保了项目可以在其许可证条款下分发。

当您提交第一个 PR 时，CLA 机器人会留下包含说明的评论。只需点击链接并在线签署协议——只需一分钟。

## 新手入门

第一次参与项目？请查找带有以下标签的 Issue：

- [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue) — 小型、定义清晰的任务，非常适合起步。
- [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted) — 我们欢迎社区帮助的任务。

适合入门的起点：

- 改进错误信息和 CLI 输出
- 为未覆盖的代码区域编写测试
- 改进文档

## 社区

- **Bug 报告** — [GitHub Issues](https://github.com/alibaba/open-code-review/issues)
- **功能建议** — [GitHub Discussions (Ideas)](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 或 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue
- **问题与帮助** — 如果您对 OpenCodeReview 的使用有疑问，请在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions) 中提问

## 许可证

通过为 OpenCodeReview 做出贡献，您同意您的贡献将根据 [Apache License 2.0](LICENSE) 的条款进行许可。