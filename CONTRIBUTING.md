# 为 OpenCodeReview 做贡献

感谢您对为 OpenCodeReview 做贡献的兴趣！每一份贡献都很重要——无论是修复错别字、报告 Bug，还是实现新功能。

[简体中文版](CONTRIBUTING.zh-CN.md) | [日本語版](CONTRIBUTING.ja-JP.md) | [한국어](CONTRIBUTING.ko-KR.md) | [Русский](CONTRIBUTING.ru-RU.md)

## 行为准则

参与本项目即表示您同意维护一个尊重他人且包容的环境。请在所有互动中保持友善和建设性。

## 贡献方式

除了编写代码之外，还有很多贡献方式：

- **报告 Bug** — 发现了问题？请提交一个 Issue，并附上复现步骤。
- **建议功能** — 有改进的想法？您可以在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 中发起讨论，或提交一个 [功能请求](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue。
- **改进文档** — 修复错别字、澄清说明或添加示例。您也可以提交一个 [文档 Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml) 来报告问题。
- **审查 Pull Request** — 帮助我们审查其他贡献者的代码。
- **编写代码** — 修复 Bug、添加功能或改进性能。

## 开始入门

### 前置要求

- [Go 1.25+](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 环境搭建

```bash
# 1. 在 GitHub 上 Fork 该仓库

# 2. 克隆您的 Fork
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review

# 3. 添加上游远程仓库（用于同步主仓库的更新）
git remote add upstream https://github.com/alibaba/open-code-review.git

# 4. 构建项目
make build

# 5. 运行测试
make test
```

如果一切顺利，您就可以开始贡献了。

> **注意：** `upstream` 远程仓库对贡献者是只读的——它用于从主仓库拉取最新更改。您不能直接推送到 upstream。所有提交都必须推送到您的 Fork（`origin`），并通过 Pull Request 提交。

### 行尾符

本项目通过 `.gitattributes` 强制使用 LF 行尾符。请配置 Git 自动规范化行尾符：

```bash
git config core.autocrlf input
```

这可以确保在提交时将任何 CRLF 转换为 LF，避免 CI 中出现行尾符问题。

## 开发工作流

### 分支管理

从 `main` 分支创建功能分支：

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

使用前缀来指示更改类型：

| 前缀         | 用途                               |
| ----------- | ------------------------------------- |
| `feat/`     | 新功能                           |
| `fix/`      | Bug 修复                               |
| `docs/`     | 仅文档                    |
| `refactor/` | 代码重构（无行为变更） |
| `test/`     | 添加或更新测试              |
| `chore/`    | 构建、CI 或工具变更         |

### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

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

每个源文件（`.go`、`.sh`、`.js`、`.mjs`、`.ts`、`.tsx`）都必须包含 SPDX 许可证头。创建新文件后，运行：

```bash
make license-add
```

这将自动添加所需的许可证头。CI 将拒绝缺少许可证头的 PR。

### 代码质量

在提交更改之前，请确保它们通过所有检查：

```bash
# 格式化、Lint 并验证许可证头
make check

# 使用竞态检测运行测试
make test

# 构建成功
make build
```

### 项目结构

```
├── cmd/opencodereview/   # CLI 入口点
├── internal/
│   ├── agent/            # 审查 Agent 逻辑
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

## 为文档做贡献

文档是 OpenCodeReview 的关键组成部分。我们欢迎对 README 文件、内联代码注释、配置示例以及任何面向用户的文本进行改进。

### 什么算作文档贡献

- 修复错别字、语法错误或失效链接
- 澄清令人困惑的解释或补充缺失的上下文
- 为命令或配置选项添加使用示例
- 更新过时的内容（例如，在功能变更之后）
- 翻译或改进本地化文档（`README.zh-CN.md`、`README.ja-JP.md`、`README.ko-KR.md`、`README.ru-RU.md`、`CONTRIBUTING.zh-CN.md`、`CONTRIBUTING.ja-JP.md`、`CONTRIBUTING.ko-KR.md`、`CONTRIBUTING.ru-RU.md`）

### 文档工作流

1. 如果您发现问题但不打算自己修复，请提交一个 [文档 Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
2. 如果您想修复它，请 Fork 仓库，进行更改，并提交一个带有 `docs/` 分支前缀的 PR（例如，`docs/fix-config-example`）。
3. 仅文档的 PR 不需要测试更改，但请验证您包含的任何命令或代码片段都是准确的。

### 文档文件

| 文件                    | 用途                              |
| ----------------------- | ------------------------------------ |
| `README.md`             | 主要项目文档（英文） |
| `README.zh-CN.md`       | 中文翻译                  |
| `README.ja-JP.md`       | 日文翻译                 |
| `README.ko-KR.md`       | 韩文翻译                   |
| `README.ru-RU.md`       | 俄文翻译                  |
| `CONTRIBUTING.md`       | 贡献指南（英文）         |
| `CONTRIBUTING.zh-CN.md` | 贡献指南（中文）         |
| `CONTRIBUTING.ja-JP.md` | 贡献指南（日文）        |
| `CONTRIBUTING.ko-KR.md` | 贡献指南（韩文）          |
| `CONTRIBUTING.ru-RU.md` | 贡献指南（俄文）         |

## 提交更改

### 提交 Issue

在进行重大更改之前，请先提交一个 Issue 来讨论方案。这可以避免重复工作，并确保您的贡献与项目方向一致。

报告 Bug 时，请包含：

1. OpenCodeReview 版本（`ocr version`）
2. 操作系统和架构
3. 复现步骤
4. 预期行为与实际行为
5. 相关日志或错误信息

### Pull Request 流程

1. **保持 PR 聚焦** — 每个 PR 只包含一个逻辑更改。如果您有多个独立的更改，请分别提交 PR。
2. **编写测试** — 为任何行为变更添加或更新测试。
3. **更新文档** — 如果您的更改影响面向用户的行为，请更新相关文档。
4. **签署 CLA** — 所有贡献者必须在 PR 合并之前签署贡献者许可协议（见下文）。
5. **填写 PR 模板** — 描述您的更改内容和原因。

### PR 标题格式

使用与提交信息相同的 Conventional Commits 格式：

```
feat(agent): add support for custom tool definitions
```

### 审查流程

- 维护者将审查您的 PR，通常会在几个工作日内完成。
- 我们可能会要求更改——这是正常且协作性的，而非对抗性的。
- 一旦获得批准，维护者将合并您的 PR。

## 加速 PR 审查的技巧

希望您的 PR 能快速获得审查和合并？以下做法会有所帮助：

- **尽早签署 CLA** — 许多首次贡献者因为错过了 CLA 机器人的评论而被阻塞。请在机器人提示您时立即签署贡献者许可协议——没有它，您的 PR 无法合并。
- **确保所有 CI 检查通过** — 检查失败的 PR 将不会被审查。在推送之前，请在本地运行 `make test` 和 `make build` 以尽早发现问题。
- **保持更改聚焦且精简** — 一个做好一件事的 PR 远比混合了无关更改的 PR 更容易审查。较小的 PR 审查速度更快，并且不太可能需要多轮修订。
- **编写清晰准确的描述** — 解释*更改了什么*以及*为什么*。描述必须反映实际的 diff——当两者不匹配时，审查者会失去信任。如果在开发过程中范围发生了变化，请在请求审查之前更新描述。
- **为行为变更包含测试** — 没有测试的新功能或 Bug 修复会引发疑问。测试可以证明正确性，并帮助审查者理解预期行为。
- **遵循现有代码模式** — 匹配周围代码的风格、命名约定和架构。一致性可以降低审查者的认知负担，并避免仅涉及风格的审查评论。
- **及时响应反馈** — 当审查者要求更改时，请快速处理以缩短审查周期。如果您不同意，请解释您的理由，而不是忽略评论。

## 贡献者许可协议（CLA）

我们要求所有贡献者在合并您的贡献之前签署阿里巴巴开源贡献者许可协议。这确保了项目可以在其许可证条款下分发。

当您提交第一个 PR 时，CLA 机器人将发布一条包含说明的评论。只需点击链接进行电子签署——只需一分钟。

## 首次贡献者

刚接触这个项目？请查找带有以下标签的 Issue：

- [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue) — 小型、范围明确的任务，非常适合入门。
- [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted) — 我们欢迎社区帮助的 Issue。

一些不错的入门领域：

- 改进错误消息和 CLI 输出
- 为未测试的代码路径编写测试
- 文档改进

## 社区

- **Bug 报告** — [GitHub Issues](https://github.com/alibaba/open-code-review/issues)
- **功能建议** — [GitHub Discussions (Ideas)](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 或 [功能请求 Issue](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml)
- **问题与帮助** — 如果您对使用 OpenCodeReview 有任何疑问，欢迎在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions) 中提问

## 许可证

通过为 OpenCodeReview 做贡献，您同意您的贡献将根据 [Apache License 2.0](LICENSE) 进行许可。