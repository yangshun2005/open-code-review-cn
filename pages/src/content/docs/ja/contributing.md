---
title: 贡献指南
sidebar:
  order: 13
---

OCR 是一个基于 Apache-2.0 许可证的开源项目。我们欢迎错误报告、文档修正和代码贡献。本页面是快速参考。正式版本请参阅
[`CONTRIBUTING.md`](https://github.com/alibaba/open-code-review/blob/main/CONTRIBUTING.md)。

## 贡献方式

即使不编写 Go 代码，您也可以做出贡献。

- **错误报告**——请附上复现步骤并创建
  [GitHub Issue](https://github.com/alibaba/open-code-review/issues/new/choose)。
- **功能请求**——
  请发布到 [Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas)
  或创建 feature-request Issue。
- **文档**——修正错别字、补充缺失的示例、修复失效链接——这类 PR 通常合并速度最快。
- **审阅其他 PR**——来自非维护者的评论有助于减轻审阅者的负担。
- **代码**——错误修复、性能改进、新功能。

## 搭建本地开发环境

### 前提条件

- [Go ≥ 1.25](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 获取源代码

```bash
# 先在 GitHub 上 Fork，然后：
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review
git remote add upstream https://github.com/alibaba/open-code-review.git

make build       # 生成 dist/opencodereview
make test        # LC_ALL=C go test -v -race -count=1 ./...
```

> `upstream` 远程仓库是只读的。请推送到 `origin`（您的 Fork），并从那里发起 PR。

### 运行本地构建

```bash
./dist/opencodereview review --preview
```

为了方便，您可以在 `~/bin/ocr-dev` 创建一个指向 `dist/opencodereview` 的符号链接，
这样就可以在任何仓库中直接调用 `ocr-dev`。

### Make 目标

| 目标 | 作用 |
|---|---|
| `make build` | 为当前平台构建 → `dist/opencodereview`。 |
| `make build-darwin-amd64` | 为 macOS Intel 交叉编译。 |
| `make build-darwin-arm64` | 为 macOS Apple Silicon 交叉编译。 |
| `make build-linux-amd64` | 为 Linux x86_64 交叉编译。 |
| `make build-linux-arm64` | 为 Linux ARM64 交叉编译。 |
| `make build-windows-amd64` | 为 Windows x86_64 交叉编译。 |
| `make build-windows-arm64` | 为 Windows ARM64 交叉编译。 |
| `make build-all` | 生成全部 6 个交叉编译二进制文件（linux/darwin/windows × amd64/arm64）。 |
| `make sha256sum` | 为构建产物生成 `sha256sum.txt`。 |
| `make dist` | 执行 `clean → build-all → sha256sum`。CI 会运行此目标。 |
| `make test` | 启用 race 检测运行测试。 |
| `make clean` | 删除 `dist/` 目录。 |

## 分支与提交规范

### 分支前缀

| 前缀 | 用途 |
|---|---|
| `feat/` | 新功能 |
| `fix/` | 错误修复 |
| `docs/` | 仅文档 |
| `refactor/` | 不改变行为的重构 |
| `test/` | 仅测试变更 |
| `chore/` | 构建 / CI / 工具 |

```bash
git checkout main
git pull upstream main
git checkout -b feat/anthropic-streaming
```

### 提交信息

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <short summary>

[optional body explaining the why]
```

示例：

```
feat(agent): add support for custom tool definitions
fix(llm): handle timeout errors in Anthropic API calls
docs(readme): clarify endpoint resolution priority
refactor(viewer): extract task-card rendering into helper
```

**PR 标题**也请使用相同格式，这样生成的变更日志会显得井井有条。

## 项目结构

```
open-code-review/
├── cmd/opencodereview/        # CLI 入口点——参数解析、分发
├── internal/
│   ├── agent/                 # 审阅代理逻辑、子代理分发
│   ├── config/                # 模板、规则、白名单、嵌入式 JSON
│   ├── diff/                  # Git diff 解析，三种模式
│   ├── gitcmd/                # Git 子进程运行器
│   ├── llm/                   # LLM 客户端（Anthropic 和 OpenAI）、端点解析
│   ├── model/                 # 数据结构（LlmComment、Diff……）
│   ├── pathutil/              # 路径工具
│   ├── release/               # 发布说明生成
│   ├── session/               # JSONL 会话写入器
│   ├── stdout/                # 可静音的 stdout 写入器
│   ├── suggestdiff/           # 建议 diff 的渲染
│   ├── telemetry/             # OpenTelemetry 配置 + 辅助函数
│   ├── tool/                  # 工具注册表 + provider 实现
│   └── viewer/                # 嵌入式 HTTP UI
├── pages/                     # WebUI 营销页面（独立的 React 应用）
├── plugins/                   # Claude Code 斜杠命令
├── extensions/                # 编辑器扩展（VS Code）
├── examples/                  # CI 配方（GitHub Actions、GitLab CI）
├── skills/                    # Agent SDK 技能清单
├── scripts/                   # NPM postinstall + 跨平台构建脚本
├── npm/                       # 各平台的 optional dependency 包
└── bin/                       # NPM 包装器（Node）
```

大多数贡献会涉及 `internal/agent/`、`internal/tool/` 和 `internal/llm/`。
`cmd/opencodereview/` 中的 CLI 层有意保持精简——它只负责解析参数，然后分发到 agent 包。

## 许可证头

所有源文件（`.go`、`.sh`、`.js`、`.mjs`、`.ts`、`.tsx`）都必须包含 SPDX 许可证头。创建新文件后，请运行：

```bash
make license-add
```

此命令会自动添加所需的许可证头。CI 会拒绝缺少许可证头的 PR。

## 代码质量检查

在提交 PR 之前：

```bash
make check      # 格式、lint、许可证头验证
make test       # 启用 race 检测，CI 在每次推送时都会运行
make build      # 冒烟测试，确保二进制文件可以构建
```

CI 在每次推送时都会运行相同的一组检查，因此不会出现意外结果。

## 添加新工具

工具由两部分组成：

1. [`internal/config/toolsconfig/tools.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/toolsconfig/tools.json)
   中的 **JSON 定义**：name、description 以及 LLM 可见的 JSON-schema 参数。
2. 在 `internal/tool/definitions.go` 中注册的 **Go provider**（包含实际实现）。

只有两者都具备，新的工具名称才能生效。现有的 6 个工具参见[工具](../tools/)，可作为模板使用。

## 添加新规则模式

编辑 `internal/config/rules/system_rules.json` 以将新的 glob 映射到规则文档，并在 `internal/config/rules/rule_docs/` 下添加相应的 markdown 文件。规则文档按模式保存为单个文件（英文）。`language` 设置只是在系统提示中添加一行“用该语言回复”的指令，并不会切换规则文档文件。

## PR 流程

1. **重大变更请先创建 Issue。** 事先对齐方向，总比在代码审查中才发现分歧要好。
2. **一个 PR 只包含一个逻辑变更。** 如果有两个不相关的修改，请提交两个 PR。
3. **请更新测试。** 行为变更需要测试覆盖——`make test` 必须通过。
4. **请更新文档。** 如果变更影响参数、配置键或审阅流水线，请同时更新本文档站点（[`docs/`](https://github.com/alibaba/open-code-review) 内）和相关的内联帮助。
5. **请填写 PR 模板。** 维护者会进行审阅，通常会在几个工作日内完成。

## 让 PR 更快获得审阅的技巧

希望您的 PR 能快速获得审阅和合并？以下实践会有所帮助：

- **尽早签署 CLA** — 许多首次贡献者会忽略 CLA 机器人的评论，导致流程停滞。当机器人出现时，请立即签署贡献者许可协议——未签署 CLA 的 PR 无法合并。
- **通过所有 CI 检查** — CI 失败的 PR 不会被审阅。在推送前，请在本地运行 `make test` 和 `make build`，尽早发现问题。
- **保持变更聚焦且精简** — 只做一件事的 PR 远比混杂了无关变更的 PR 更容易审阅。小的 PR 审阅更快，修改往返也更少。
- **撰写清晰准确的描述** — 请说明*更改了什么*以及*为什么更改*。描述必须与实际 diff 一致——两者不一致会失去审阅者的信任。如果开发过程中范围发生变化，请在请求审阅前更新描述。
- **为行为变更包含测试** — 没有测试的新功能或错误修复会引发疑问。测试能证明正确性，并帮助审阅者理解预期行为。
- **遵循现有代码模式** — 请遵循周围代码的风格、命名约定和架构。一致性可以降低审阅者的认知负担，并避免仅涉及风格的审阅评论。
- **快速响应反馈** — 如果审阅者要求修改，请快速响应以保持审阅周期短暂。如果意见不同，请解释原因，而不是忽略评论。

## 贡献者许可协议（CLA）

本项目需要签署 Alibaba Open Source CLA。当您第一次提交 PR 时，机器人会提供链接——请进行电子签名（大约需要 1 分钟）。后续 PR 无需重新签署。

## 这是您的首次贡献吗？

请查找带有 [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue)
或 [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted)
标签的 Issue。这些 Issue 大多规模较小且独立，Issue 描述中包含了足够的上下文供您着手。

## 相关链接

- [架构](../architecture/)——在修改 `internal/agent/` 之前需要了解的心智模型。
- [工具](../tools/)——了解现有工具的样子。
- 完整的贡献指南：
  [CONTRIBUTING.md](https://github.com/alibaba/open-code-review/blob/main/CONTRIBUTING.md)