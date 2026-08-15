# OpenCodeReview 贡献指南

感谢您对 OpenCodeReview 的贡献。无论是修正拼写错误、报告 Bug，还是实现新功能，所有贡献都对项目有所帮助。

[English](CONTRIBUTING.md) | [简体中文版](CONTRIBUTING.zh-CN.md) | [日本語版](CONTRIBUTING.ja-JP.md) | 한국어 | [Русский](CONTRIBUTING.ru-RU.md)

## 行为准则

参与本项目的所有人员都应相互尊重并保持包容的环境。请在所有的互动中保持友善和建设性的态度。

## 贡献方式

除了编写代码，您还可以通过多种方式做出贡献。

- **报告 Bug**：如果发现问题，请附上复现步骤并提交 Issue。
- **功能建议**：如果您有改进想法，可以在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 中发起讨论，或提交 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue。
- **文档改进**：我们欢迎修正拼写错误、补充说明、添加示例。如需报告文档问题，请提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
- **Pull Request 审查**：审查其他贡献者的代码也是极大的帮助。
- **编写代码**：您可以贡献 Bug 修复、功能添加、性能改进等。

## 开始之前

### 前提条件

- [Go 1.25+](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 环境搭建

```bash
# 1. 在 GitHub 上 Fork 该仓库

# 2. 克隆您的 Fork
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review

# 3. 添加上游远程仓库，以便获取主仓库的更新
git remote add upstream https://github.com/alibaba/open-code-review.git

# 4. 构建项目
make build

# 5. 运行测试
make test
```

如果所有步骤都通过，您就可以开始贡献了。

> **注意：** `upstream` 远程仓库对贡献者是只读的。它用于获取主仓库的最新更改，您不能直接推送。所有贡献都应推送到您的 Fork（`origin`），然后通过 Pull Request 提交。

## 开发工作流

### 分支管理

从 `main` 分支创建功能分支。

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

使用前缀来表示更改类型。

| 前缀 | 用途 |
|--------|---------|
| `feat/` | 新功能 |
| `fix/` | Bug 修复 |
| `docs/` | 仅包含文档更改 |
| `refactor/` | 代码重构（行为不变） |
| `test/` | 添加或修改测试 |
| `chore/` | 构建、CI、工具链更改 |

### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式。

```text
<type>(<scope>): <short summary>

[optional body]
```

示例：

```text
feat(agent): add support for custom tool definitions
fix(llm): handle timeout errors in Anthropic API calls
docs(README): update configuration examples
```

### 许可证头

所有源文件（`.go`、`.sh`、`.js`、`.mjs`、`.ts`、`.tsx`）都需要 SPDX 许可证头。创建新文件后，请运行：

```bash
make license-add
```

该命令会自动添加所需的头。CI 会拒绝缺少许可证头的 PR。

### 代码质量

在提交更改之前，请确保所有检查都通过。

```bash
# 格式、Lint、许可证头验证
make check

# 带竞态检测运行测试
make test

# 确认构建成功
make build
```

### 项目结构

```text
.
├── cmd/opencodereview/   # CLI 入口点
├── internal/
│   ├── agent/            # 审查代理逻辑
│   ├── config/           # 配置管理
│   ├── diff/             # Git diff 解析
│   ├── llm/              # LLM API 客户端（Anthropic 和 OpenAI）
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

文档是 OpenCodeReview 的重要组成部分。我们欢迎对 README、内联代码注释、配置示例以及所有用户可见文本的改进。

### 属于文档贡献的工作

- 修正拼写错误、语法错误、失效链接
- 澄清令人困惑的说明或补充缺失的上下文
- 添加命令或配置选项的使用示例
- 功能变更后更新过时的内容
- 翻译或改进本地化文档（`README.zh-CN.md`、`README.ja-JP.md`、`README.ko-KR.md`、`CONTRIBUTING.zh-CN.md`、`CONTRIBUTING.ja-JP.md`、`CONTRIBUTING.ko-KR.md`）

### 文档工作流

1. 如果您发现问题但不打算直接修复，请提交 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
2. 如果您想直接修复，请 Fork 仓库、进行更改，并使用 `docs/` 分支前缀提交 PR。例如：`docs/fix-config-example`。
3. 仅包含文档更改的 PR 不需要测试更改，但请确保包含的命令和代码片段准确无误。

### 文档文件

| 文件 | 用途 |
|------|---------|
| `README.md` | 主要项目文档（英文） |
| `README.zh-CN.md` | 中文翻译 |
| `README.ja-JP.md` | 日文翻译 |
| `README.ko-KR.md` | 韩文翻译 |
| `CONTRIBUTING.md` | 贡献指南（英文） |
| `CONTRIBUTING.zh-CN.md` | 贡献指南（中文） |
| `CONTRIBUTING.ja-JP.md` | 贡献指南（日文） |
| `CONTRIBUTING.ko-KR.md` | 贡献指南（韩文） |

## 提交更改

### 提交 Issue

在开始大型更改之前，请先提交 Issue 讨论您的方法。这样可以减少重复工作，并确保贡献方向与项目一致。

报告 Bug 时，请包含以下信息：

1. OpenCodeReview 版本（`ocr version`）
2. 操作系统和架构
3. 复现步骤
4. 预期行为和实际行为
5. 相关日志或错误信息

### Pull Request 流程

1. **保持 PR 聚焦**：一个 PR 只包含一个逻辑更改。如果有多个独立的更改，请分别提交 PR。
2. **编写测试**：行为更改需要添加或更新测试。
3. **更新文档**：如果用户可见的行为发生变化，请更新相关文档。
4. **签署 CLA**：所有贡献者必须在 PR 合并前签署贡献者许可协议。
5. **填写 PR 模板**：说明更改内容和原因。

### PR 标题格式

使用与提交信息相同的 Conventional Commits 格式。

```text
feat(agent): add support for custom tool definitions
```

### 审查流程

- 维护者通常会在几天内审查 PR。
- 可能会要求更改。这是正常且协作的过程。
- 批准后，维护者会合并 PR。

## 如何让 PR 更快获得审查

希望您的 PR 能快速获得审查和合并？以下几点会有所帮助：

- **尽快签署 CLA** — 许多首次贡献者因错过 CLA 机器人的评论而导致流程受阻。当机器人提示时，请立即签署贡献者许可协议 — 未签署 CLA 的 PR 无法合并。
- **通过所有 CI 检查** — CI 失败的 PR 不会被审查。推送前请在本地运行 `make test` 和 `make build`，提前发现问题。
- **保持更改聚焦且精简** — 只做一件事的 PR 比混杂无关更改的 PR 更容易审查。PR 越小，审查越快，需要多轮修改的可能性也越小。
- **撰写清晰准确的描述** — 说明更改了*什么*以及*为什么*更改。描述必须与实际 diff 一致 — 如果两者不符，会失去审查者的信任。如果开发过程中范围发生变化，请在请求审查前更新描述。
- **行为更改包含测试** — 没有测试的新功能或 Bug 修复会引发质疑。测试能证明正确性，并帮助审查者理解预期行为。
- **遵循现有代码模式** — 与周围代码的风格、命名约定和架构保持一致。一致性可以降低审查者的认知负担，并避免与风格相关的审查评论。
- **及时响应反馈** — 当审查者要求更改时，请快速处理以保持审查周期短。如果不同意，请说明理由，而不是忽略评论。

## 贡献者许可协议（CLA）

所有贡献者都必须签署阿里巴巴开源贡献者许可协议。这是为了确保项目能够按照许可条款进行分发。

当您提交第一个 PR 时，CLA 机器人会留下引导评论。按照链接进行电子签名即可，通常只需约 1 分钟。

## 首次贡献者

如果您是第一次贡献，可以查找带有以下标签的 Issue：

- [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue)：适合入门的小型、范围明确的任务
- [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted)：欢迎社区帮助的 Issue

适合入门的领域：

- 改进错误信息和 CLI 输出
- 为测试不足的代码路径编写测试
- 改进文档

## 社区

- **Bug 报告**：[GitHub Issues](https://github.com/alibaba/open-code-review/issues)
- **功能建议**：[GitHub Discussions (Ideas)](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 或 [Feature Request Issue](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml)
- **问题与帮助**：与 OpenCodeReview 使用相关的问题可以发布到 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions)。

## 许可证

向 OpenCodeReview 贡献，即表示您同意该贡献根据 [Apache License 2.0](LICENSE) 获得许可。