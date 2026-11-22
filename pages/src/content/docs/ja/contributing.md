---
title: 贡献
sidebar:
  order: 13
---

OCR 是 Apache-2.0 许可的开源项目。欢迎提交 Bug 报告、文档修正和代码贡献。本页是快速参考，正式版见 [`CONTRIBUTING.md`](https://github.com/alibaba/open-code-review/blob/main/CONTRIBUTING.md)。

## 贡献方式

不写 Go 也能贡献。

- **Bug 报告**——附上复现步骤，创建 [GitHub issue](https://github.com/alibaba/open-code-review/issues/new/choose)。
- **功能请求**——在 [Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas) 发帖，或创建 feature-request issue。
- **文档**——错别字、缺失示例、失效链接——这类 PR 通常合并最快。
- **审查其他 PR**——非维护者的评论能减轻审查者负担。
- **代码**——Bug 修复、性能优化、新功能。

## 本地开发环境搭建

### 前提条件

- [Go ≥ 1.26.10](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 获取源码

```bash
# 在 GitHub 上 Fork，然后：
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review
git remote add upstream https://github.com/alibaba/open-code-review.git

make build       # 输出 dist/opencodereview（Windows 为 dist/opencodereview.exe）
make test        # LC_ALL=C go test -v -race -count=1 ./...
```

> `upstream` remote 为只读。请推送到 `origin`（你的 Fork），再从那里发起 PR。

### 运行本地构建

```bash
./dist/opencodereview review --preview        # macOS / Linux
.\dist\opencodereview.exe review --preview   # Windows (PowerShell / cmd)
```

为方便起见，可在 `~/bin/ocr-dev` 放置指向 `dist/opencodereview` 的符号链接，之后在任意仓库调用 `ocr-dev`。

### Make target

| Target | 作用 |
|---|---|
| `make build` | 为当前平台构建 → `dist/opencodereview`（Windows 为 `dist/opencodereview.exe`）。 |
| `make build-darwin-amd64` | 交叉编译 macOS Intel 版本。 |
| `make build-darwin-arm64` | 交叉编译 macOS Apple Silicon 版本。 |
| `make build-linux-amd64` | 交叉编译 Linux x86_64 版本。 |
| `make build-linux-arm64` | 交叉编译 Linux ARM64 版本。 |
| `make build-windows-amd64` | 交叉编译 Windows x86_64 版本。 |
| `make build-windows-arm64` | 交叉编译 Windows ARM64 版本。 |
| `make build-all` | 全部 6 个交叉编译二进制（linux/darwin/windows × amd64/arm64）。 |
| `make sha256sum` | 为构建产物生成 `sha256sum.txt`。 |
| `make dist` | `clean → build-all → sha256sum`，即 CI 执行的内容。 |
| `make test` | 启用 race 检测运行测试。 |
| `make clean` | 删除 `dist/`。 |

## 分支与提交规范

### 分支前缀

| 前缀 | 用途 |
|---|---|
| `feat/` | 新功能 |
| `fix/` | Bug 修复 |
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

采用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <short summary>

[optional body explaining the why]
```

示例：

```
feat(viewer): add session search
fix(llm): handle timeout errors in Anthropic API calls
docs(readme): clarify endpoint resolution priority
refactor(viewer): extract task-card rendering into helper
```

**PR 标题**也使用相同格式，生成的 changelog 会更整齐。

`PR Commit Policy` 会检查所有提交信息（含 PR 标题和正文），不区分大小写。请勿包含仅含 `[skip ci]`、`[ci skip]`、`[no ci]`、`[skip actions]`、`[actions skip]` 或 `skip-checks: true` / `skip-checks:true` 的行。

检查失败时，请编辑 PR 标题，或在自己的工作分支上改写对应提交信息。追加不含这些指令的提交无法消除历史提交的违规。PR 描述中可以讨论这些指令，不受检查。

## 项目结构

```
open-code-review/
├── acp/                       # 面向 CLI 的独立 ACP（Agent Client Protocol）适配器
├── cmd/opencodereview/        # CLI 入口——参数解析、分发
├── docs/                      # 各语言 README 与贡献指南
├── imgs/                      # README 用图片与 Logo
├── internal/
│   ├── agent/                 # 审查 Agent 逻辑、子 Agent 分发
│   ├── chatgptauth/           # ChatGPT OAuth 与凭证管理
│   ├── config/                # 模板、规则、白名单、内嵌 JSON
│   ├── delegate/              # 不调用 LLM 的审查规格生成
│   ├── diff/                  # Git diff 解析
│   ├── gitcmd/                # Git 子进程运行器
│   ├── llm/                   # LLM 客户端与端点解析
│   ├── llmloop/               # Review 与 Scan 共享的 LLM 工具调用循环
│   ├── mcp/                   # MCP 客户端与工具适配器
│   ├── model/                 # 数据结构（LlmComment、Diff……）
│   ├── pathutil/              # 路径工具
│   ├── release/               # 发布产物命名一致性检查
│   ├── scan/                  # 全文件代码审查
│   ├── session/               # JSONL 会话写入器
│   ├── stdout/                # 可静音的 stdout writer
│   ├── suggestdiff/           # 建议 diff 渲染
│   ├── telemetry/             # OpenTelemetry 配置 + 辅助函数
│   ├── tool/                  # 工具注册表 + provider 实现
│   └── viewer/                # 浏览审查会话的内嵌 HTTP UI
├── pages/                     # 官网落地页与文档（独立 React app）
├── plugins/                   # 与编码 Agent 的集成（Claude Code、Codex、OpenCode 等）
├── extensions/                # VS Code 与 IntelliJ IDEA 扩展、共享前端
├── examples/                  # CI 配方（GitHub Actions、GitLab CI）
├── skills/                    # 审查与委派技能定义
├── scripts/                   # 安装、发布、仓库检查脚本
├── npm/                       # 各平台 optional dependency 包
└── bin/                       # NPM wrapper（Node）
```

大多数贡献涉及 `internal/agent/`、`internal/tool/`、`internal/llm/`。`cmd/opencodereview/` 的 CLI 层刻意保持轻薄——只负责参数解析和命令分发。

## AI 辅助开发

用 AI 辅助开发完全没问题，如果能让贡献更轻松，反而值得欢迎。不能接受的是：不读模型生成的代码就提交，且不修正其冗余和错误。这类提交会拖慢审查沟通，让 Pull Request 难以推进。

使用 AI 开发时，请遵循以下规则。

### 规则：

1. **必须在初始 Issue 或 Pull Request 中披露使用了 AI/LLM，以及所用工具/模型等信息。**
2. 必须理解 AI 写的所有代码，掌握 AI 做了什么。
3. 审查者询问变更理由时，无论代码是你写的还是 AI 写的，都必须自己解释。回答维护者提问和审查意见的内容必须基于你自己的理解。AI/LLM 只能用于翻译和文字润色，不得让其生成回答本身。
4. PR 中不得出现 `AI 生成 -> 修正 -> 修正 -> 修正` 这类反复循环。这表明可能未审查 AI 生成的代码，一有问题就让 AI 修改，反复循环。
5. 请成员审查前，必须自己审查 AI/LLM 生成的所有代码、文本等内容。
6. 不得使用 "Assisted-by"、"Co-developed-by" 或类似 trailer 将提交归属给 AI/LLM。
7. 不要写冗长的提交信息。重要信息应写在 PR 描述中，而非折叠的提交信息里。
8. 不愿或无法做到以上所有事项时，请关闭 Issue 或 Pull Request。

谢谢！

## 许可证头

所有源文件（`.go`、`.js`、`.mjs`、`.ts`、`.tsx`、`.kt`、`.kts`、`.sh`、`.py`、`.css`）都需要 SPDX 许可证头。创建新文件后，请执行：

```bash
make license-add
```

该命令会自动添加所需头。CI 会拒绝缺少头的 PR。

## 代码质量检查

发起 PR 前：

```bash
make check      # 校验格式、lint、许可证头
make test       # 启用 race，CI 每次 push 都会执行
make build      # 二进制可构建的冒烟测试
```

CI 每次 push 都执行同一套检查，不会出现意外结果。

## 添加新工具

本节涉及内置 Agent 的源码修改，而非运行时配置。核心工具变更需要测试和基准验证。外部业务上下文请使用 [MCP 服务器](../mcp/)。

工具由两部分组成。

1. [`internal/config/toolsconfig/tools.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/toolsconfig/tools.json) 中的 **JSON 定义**：name、description，以及 LLM 看到的 JSON-schema 参数。
2. 在 `internal/tool/definitions.go` 中注册的 **Go provider**（含实际实现）。

两者齐备，新工具名才能生效。现有 6 个工具见[工具](../tools/)，可作为模板。

将工具加入所适用模板的 `MAIN_TASK.tools` 数组。review 和 scan 有各自的列表，顺序会影响发给模型的请求，请保持稳定。若 review 计划中不允许调用、只传递说明，则加入 `PLAN_TASK.tool_references`。工具定义中不要包含任务归属标志，定义名须与目录项名一致。

这些列表只决定请求中包含哪些定义，并非执行沙箱。MCP 发现和 review 特有的完成/过滤协议由现有任务适配器负责。其他辅助任务不使用这些目录绑定，不支持的 `tools` 或 `tool_references` 字段会被拒绝，而非忽略。

## 添加新规则模式

编辑 `internal/config/rules/system_rules.json`，将新 glob 映射到规则文档，并在 `internal/config/rules/rule_docs/` 下添加对应 markdown。规则文档按模式一文件保存（英文）。`language` 配置只是在 system prompt 中加一行"用该语言回答"的指令，不会切换 rule-doc 文件。

## PR 流程

1. **大改动先建 issue。** 提前对齐方向，好过代码审查时才发现分歧。
2. **一个 PR 一个逻辑变更。** 有两个无关修复，就发两个 PR。
3. **更新测试。** 行为变更需要测试覆盖——`make test` 必须通过。
4. **更新文档。** 变更影响参数、config key 或审查流水线时，同时更新本文档站（[`docs/`](https://github.com/alibaba/open-code-review) 内）和相关内联帮助。
5. **填写 PR 模板。** 维护者会审查，通常在几个工作日内。

## 让 PR 更快被审查的技巧

想让 PR 快速被审查和合并？以下做法有帮助：

- **尽早签署 CLA**——许多首次贡献者忽略 CLA bot 的评论，流程因此停滞。看到 bot 就立即签署 Contributor License Agreement——未签 CLA 的 PR 无法合并。
- **通过所有 CI 检查**——CI 失败的 PR 不会被审查。推送前在本地运行 `make test` 和 `make build`，尽早发现问题。
- **保持变更聚焦且小**——只做一件事的 PR 比混杂无关变更的 PR 好审查得多。小 PR 审查快，来回修改也少。
- **写清晰准确的描述**——说明*改了什么*和*为什么改*。描述必须与实际 diff 一致——不一致会失去审查者信任。开发中范围变化时，请在请求审查前更新描述。
- **行为变更附带测试**——没有测试的新功能或 Bug 修复会引发疑问。测试能证明正确性，帮助审查者理解预期行为。
- **遵循现有代码模式**——匹配周围代码的风格、命名和架构。一致性降低审查者认知负担，避免仅针对风格的审查意见。
- **快速响应反馈**——审查者要求修改时尽快处理，缩短审查周期。有不同意见时，说明理由，而非无视评论。

## 贡献者许可协议（CLA）

本项目需要 Alibaba Open Source CLA。首次发起 PR 时 bot 会贴出链接——请电子签署（约 1 分钟）。之后的 PR 无需重新签署。

## 第一次贡献？

请寻找带 [`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue) 或 [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted) 标签的 issue。大多规模小、自成一体，issue 描述中有足够上下文可着手。

## 相关条目

- [架构](../architecture/)——修改 `internal/agent/` 前需要的心智模型。
- [工具](../tools/)——现有工具是什么样。
- 完整贡献指南：[CONTRIBUTING.md](https://github.com/alibaba/open-code-review/blob/main/CONTRIBUTING.md)