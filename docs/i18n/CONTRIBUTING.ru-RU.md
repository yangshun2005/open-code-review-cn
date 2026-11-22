# 参与 OpenCodeReview 开发

感谢你对 OpenCodeReview 发展的关注！任何贡献都很重要——无论是修正错别字、报告 Bug 还是新增功能。

[English](../../CONTRIBUTING.md) | [简体中文版](CONTRIBUTING.zh-CN.md) | [日本語版](CONTRIBUTING.ja-JP.md) | [한국어](CONTRIBUTING.ko-KR.md) | Русский

## 行为准则

参与本项目即表示你同意维护尊重与包容的氛围。请在任何互动中保持友善和建设性。

## 如何提供帮助

除了编写代码，还有很多方式可以贡献：

- **报告 Bug** —— 发现了故障？请创建 Issue 并附上复现步骤。
- **提出改进建议** —— 有想法？请在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 发起讨论，或创建 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue。
- **改进文档** —— 修正错别字、澄清表述、添加示例。如需报告问题，也可创建 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
- **评审 Pull Request** —— 帮助我们审查其他贡献者的代码。
- **编写代码** —— 修复 Bug、添加功能、提升性能。

## 从何开始

### 环境要求

- [Go 1.26.10+](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 配置

```bash
# 1. 在 GitHub 上 Fork 仓库

# 2. 克隆你的 Fork
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review

# 3. 添加上游 remote（用于与主仓库同步）
git remote add upstream https://github.com/alibaba/open-code-review.git

# 4. 构建项目
make build

# 5. 运行测试
make test
```

如果一切顺利——你就可以开始贡献了。

> **注意：** 贡献者的 `upstream` remote 为只读——用于拉取主仓库的最新变更。不能直接推送到上游。所有变更都推送到你的 Fork（`origin`），并通过 Pull Request 提交。

## 开发流程

### 分支

从 `main` 创建功能分支：

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

使用表示变更类型的前缀：

| 前缀        | 用途                     |
| ----------- | ------------------------ |
| `feat/`     | 新功能                   |
| `fix/`      | Bug 修复                 |
| `docs/`     | 仅文档                   |
| `refactor/` | 重构（不改变行为）       |
| `test/`     | 添加或更新测试           |
| `chore/`    | 构建、CI 或工具链        |

### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <简短描述>

[可选正文]
```

示例：

```
feat(viewer): add session search
fix(llm): handle timeout errors in Anthropic API calls
docs(README): update configuration examples
```

`PR Commit Policy` 会检查 PR 标题和每个提交的完整信息（包括正文，不区分大小写）。不要添加 `[skip ci]`、`[ci skip]`、`[no ci]`、`[skip actions]`、`[actions skip]` 或单独一行 `skip-checks: true` / `skip-checks:true`。

如果检查未通过，请修改 PR 标题或重写工作分支中相应提交的信息。新增一个不含这些指令的提交并不能消除之前提交中的违规。PR 描述可以包含对这些指令的讨论，不会被检查。

### 许可证头

每个源文件（`.go`、`.js`、`.mjs`、`.ts`、`.tsx`、`.kt`、`.kts`、`.sh`、`.py`、`.css`）都必须包含 SPDX 许可证头。创建新文件后请执行：

```bash
make license-add
```

该命令会自动添加所需的许可证头。CI 会拒绝缺少许可证头的 PR。

### 代码质量

提交变更前，请确保通过所有检查：

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
├── acp/                  # CLI 的 ACP 适配器
├── bin/                  # NPM 包装
├── cmd/opencodereview/   # CLI 入口
├── docs/                 # 本地化 README 和 CONTRIBUTING
├── examples/             # CI/CD 集成示例
├── extensions/           # 编辑器扩展（VS Code 和 IDEA）
├── imgs/                 # Logo、基准测试和概览图片
├── internal/
│   ├── agent/            # 评审代理逻辑
│   ├── chatgptauth/      # ChatGPT 的 OAuth 和凭据管理
│   ├── config/           # 配置管理
│   ├── delegate/         # 委托模式（无 LLM）的评审规格
│   ├── diff/             # Git diff 解析
│   ├── gitcmd/           # 受限的 git 子进程执行
│   ├── llm/              # LLM API 客户端（Anthropic、Bedrock 和 OpenAI）
│   ├── llmloop/          # 子任务的通用工具调用循环
│   ├── mcp/              # MCP 服务器客户端和工具适配器
│   ├── model/            # 数据模型
│   ├── pathutil/         # 规范路径和嵌套校验
│   ├── release/          # 发布产物 URL 名称校验
│   ├── scan/             # 逐文件代码评审（ocr scan）
│   ├── session/          # 评审会话管理
│   ├── stdout/           # 可替换的 stdout writer
│   ├── suggestdiff/      # 用于渲染建议的逐行 diff
│   ├── telemetry/        # OpenTelemetry 集成
│   ├── tool/             # 内置工具（file_read、code_search 等）
│   └── viewer/           # WebUI 会话查看器
├── npm/                  # 按平台的可选二进制包
├── pages/                # 落地页
├── plugins/              # 编码代理插件
├── scripts/              # 安装、发布和检查脚本
└── skills/               # Agent skill 清单
```

## 使用 AI 开发

在开发中使用 AI 帮助完全正常，如果这样能让你更轻松地贡献，我们非常欢迎。我们不能接受的是：模型生成的代码未经阅读就进入提交，且其冗余和错误无人修正。这类变更会拖慢评审讨论，阻碍 Pull Request 推进。

如果 AI 参与了你的工作，请遵守以下规则。

### 规则：

1. **你必须在初始 Issue 或 Pull Request 中披露使用了 AI/LLM，并说明所使用的工具/模型等。**
2. 你必须理解 AI 编写的每一行代码，并知道 AI 具体做了什么。
3. 当评审者询问某项变更的原因时，你必须能够自行解释，无论该变更由你还是 AI 编写。你对维护者提问和评审意见的回复内容必须源于你自己的理解——AI/LLM 只能用于翻译或润色措辞，不能用于生成回复本身。
4. 你的 PR 中不得出现 `AI 生成 -> 修复 -> 修复 -> 修复` 这类重复循环。这可能表明你未检查 AI 生成的代码，而是让 AI 在问题出现时反复修复。
5. 在主动请求任何参与者进行评审之前，你必须先自行检查 AI/LLM 生成的所有代码、文本和其他材料。
6. 不得将提交归属于 AI/LLM，包括通过 "Assisted-by"、"Co-developed-by" 等 trailer 或类似方式。
7. 不要写过于冗长的提交信息。重要信息应写在 PR 描述中，而非折叠的提交信息里。
8. 如果你不愿或无法完成上述所有要求，请关闭你的 Issue 或 Pull Request。

谢谢！

## 文档贡献

文档是 OpenCodeReview 最重要的组成部分。我们欢迎改进 README 文件、代码注释、配置示例以及任何面向用户的文本。

### 什么算文档贡献

- 修正错别字、语法错误和失效链接
- 澄清晦涩的解释，补充缺失的上下文
- 添加命令和配置参数的使用示例
- 更新过时内容（例如功能变更后）
- 翻译和改进本地化文档（`docs/i18n/README.zh-CN.md`、`docs/i18n/README.ja-JP.md`、`docs/i18n/README.ko-KR.md`、`docs/i18n/README.ru-RU.md`、`docs/i18n/CONTRIBUTING.zh-CN.md`、`docs/i18n/CONTRIBUTING.ja-JP.md`、`docs/i18n/CONTRIBUTING.ko-KR.md`、`docs/i18n/CONTRIBUTING.ru-RU.md`）

### 文档工作流程

1. 如果你发现了问题但不打算自行修复，请创建 [Documentation Issue](https://github.com/alibaba/open-code-review/issues/new?template=docs_report.yml)。
2. 如果想自行修复——请 Fork、修改，并以 `docs/` 前缀的分支提交 PR（例如 `docs/fix-config-example`）。
3. 仅涉及文档的 PR 不需要修改测试，但请验证所有引用的命令和代码片段的准确性。

### 文档文件

| 文件                              | 用途                     |
| --------------------------------- | ------------------------ |
| `README.md`                       | 项目主文档（英文）       |
| `docs/i18n/README.zh-CN.md`       | 中文翻译                 |
| `docs/i18n/README.ja-JP.md`       | 日文翻译                 |
| `docs/i18n/README.ko-KR.md`       | 韩文翻译                 |
| `docs/i18n/README.ru-RU.md`       | 俄文翻译                 |
| `CONTRIBUTING.md`                 | 贡献者指南（英文）       |
| `docs/i18n/CONTRIBUTING.zh-CN.md` | 贡献者指南（中文）       |
| `docs/i18n/CONTRIBUTING.ja-JP.md` | 贡献者指南（日文）       |
| `docs/i18n/CONTRIBUTING.ko-KR.md` | 贡献者指南（韩文）       |
| `docs/i18n/CONTRIBUTING.ru-RU.md` | 贡献者指南（俄文）       |

## 提交变更

### 创建 Issue

在着手重大变更之前，请先创建 Issue 并讨论方案。这可以避免重复工作，并确保你的贡献与项目发展方向一致。

报告 Bug 时请提供：

1. OpenCodeReview 版本（`ocr version`）
2. 操作系统和架构
3. 复现步骤
4. 预期行为和实际行为
5. 相关日志或错误信息

### Pull Request 流程

1. **保持 PR 聚焦** —— 一个 PR 一个逻辑变更。多个独立变更最好分别提交 PR。
2. **编写测试** —— 任何行为变更都应添加或更新测试。
3. **更新文档** —— 如果变更影响用户可见行为，请更新相应文档。
4. **签署 CLA** —— PR 被接受前，所有贡献者必须签署 Contributor License Agreement（见下文）。
5. **填写 PR 模板** —— 描述你的变更做了什么以及为什么需要。

### PR 标题格式

使用与提交信息相同的 Conventional Commits 格式：

```
feat(viewer): add session search
```

### 评审流程

- 维护者会查看你的 PR——通常在几个工作日内。
- 我们可能会要求修改——这是正常的协作，而非对抗。
- 批准后，维护者将合并你的 PR。

## 如何加速 PR 的审查

希望你的 PR 更快被审查和接受？以下做法有帮助：

- **提前签署 CLA** —— 许多新手贡献者因为忽略了 CLA 机器人的评论而卡住。机器人提示后立即签署 Contributor License Agreement——未签署 CLA 的 PR 无法被接受。
- **确保所有 CI 检查通过** —— 检查未通过的 PR 不会被审查。提交前在本地运行 `make test` 和 `make build`，提前发现问题。
- **保持变更聚焦且小巧** —— 做好一件事的 PR 比混合无关变更的 PR 更容易评审。小 PR 评审更快，需要多轮修改的情况更少。
- **写清晰准确的描述** —— 解释*什么*变了以及*为什么*。描述必须与实际 diff 一致——若不一致，评审者会失去信任。如果开发过程中工作量发生变化，请在请求评审前更新描述。
- **为行为变更添加测试** —— 没有测试的新功能或修复会引发疑问。测试证明正确性，并帮助评审者理解预期行为。
- **遵循现有代码模式** —— 遵循周围代码的风格、命名约定和架构。一致性降低评审者的认知负担，避免仅涉及风格的评论。
- **及时响应反馈** —— 评审者要求修改时，尽快处理以缩短评审周期。如果你不同意，请解释你的立场，而不是忽略评论。

## 贡献者许可协议（CLA）

在我们接受你的贡献之前，必须签署 Alibaba Open Source Contributor License Agreement。这确保项目可以在其许可证条款下分发。

当你打开第一个 PR 时，CLA 机器人会留下带说明的评论。只需点击链接并电子签署协议——一分钟即可完成。

## 新手

初次参与项目？请寻找以下标签的 Issue：

- [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue) —— 小而明确的任务，非常适合入门。
- [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted) —— 我们欢迎社区帮助的任务。

适合入手的起点：

- 改进错误信息和 CLI 输出
- 为未覆盖的代码编写测试
- 改进文档

## 社区

- **Bug 报告** —— [GitHub Issues](https://github.com/alibaba/open-code-review/issues)
- **功能建议** —— [GitHub Discussions (Ideas)](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 或 [Feature Request](https://github.com/alibaba/open-code-review/issues/new?template=feature_request.yml) Issue
- **问题与帮助** —— 如果你对 OpenCodeReview 的使用有疑问，请在 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions) 中提问

## 许可证

向 OpenCodeReview 贡献即表示你同意你的贡献将按 [Apache License 2.0](../../LICENSE) 条款授权。