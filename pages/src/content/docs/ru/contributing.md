---
title: 参与开发
sidebar:
  order: 13
---

OCR 以 Apache-2.0 许可证开源发布。我们欢迎错误报告、文档修正和代码变更。
本页是简要参考；权威版本位于
[`CONTRIBUTING.md`](https://github.com/alibaba/open-code-review/blob/main/CONTRIBUTING.md)。

## 如何为项目做贡献

做贡献不一定要会写 Go：

- **错误报告** — 创建 [GitHub Issue](https://github.com/alibaba/open-code-review/issues/new/choose)
  并附上复现步骤。
- **功能建议** — 在
  [Discussions](https://github.com/alibaba/open-code-review/discussions/categories/ideas)
  中发起讨论，或创建功能建议 Issue。
- **文档** — 修正拼写错误、补充缺失示例、修复失效链接；这类 PR 通常最快被接受。
- **审查其他 PR** — 非维护者参与者的评论有助于减轻审查者负担。
- **代码** — 错误修复、性能优化和新功能。

## 本地开发环境搭建

### 前置要求

- [Go ≥ 1.26.10](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

### 获取源代码

```bash
# Fork on GitHub, then:
git clone https://github.com/<your-username>/open-code-review.git
cd open-code-review
git remote add upstream https://github.com/alibaba/open-code-review.git

make build       # writes dist/opencodereview (dist/opencodereview.exe on Windows)
make test        # LC_ALL=C go test -v -race -count=1 ./...
```

> `upstream` 远程仓库为只读。请将变更推送到 `origin`（你的 Fork），并从那里创建 PR。

### 运行本地构建

```bash
./dist/opencodereview review --preview        # macOS / Linux
.\dist\opencodereview.exe review --preview   # Windows (PowerShell / cmd)
```

为方便起见，在 `~/bin/ocr-dev` 创建指向 `dist/opencodereview` 的符号链接，
以便从任意仓库调用 `ocr-dev`。

### Make 目标

| 目标 | 用途 |
|---|---|
| `make build` | 为当前平台构建二进制文件 → `dist/opencodereview`（Windows 下为 `dist/opencodereview.exe`）。 |
| `make build-darwin-amd64` | 交叉编译 macOS Intel 版本。 |
| `make build-darwin-arm64` | 交叉编译 macOS Apple Silicon 版本。 |
| `make build-linux-amd64` | 交叉编译 Linux x86_64 版本。 |
| `make build-linux-arm64` | 交叉编译 Linux ARM64 版本。 |
| `make build-windows-amd64` | 交叉编译 Windows x86_64 版本。 |
| `make build-windows-arm64` | 交叉编译 Windows ARM64 版本。 |
| `make build-all` | 全部六个交叉编译二进制文件（linux/darwin/windows × amd64/arm64）。 |
| `make sha256sum` | 为构建产物生成 `sha256sum.txt`。 |
| `make dist` | `clean → build-all → sha256sum`。CI 运行此目标。 |
| `make test` | 运行带竞态检测的测试。 |
| `make clean` | 删除 `dist/`。 |

## 分支与提交约定

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

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

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

**PR 标题**也使用相同格式，以便在自动生成的变更日志中整齐显示。

`PR Commit Policy` 检查 PR 标题和每个提交的完整信息（包括正文），不区分大小写。不要添加 `[skip ci]`、`[ci skip]`、`[no ci]`、
`[skip actions]`、`[actions skip]` 或单独一行
`skip-checks: true` / `skip-checks:true`。

如果检查未通过，请修改 PR 标题或重写工作分支中相应提交的信息。新增一个不含这些指令的提交并不能消除之前提交中的违规。PR 描述可以包含对这些指令的讨论，不会被检查。

## 项目结构

```
open-code-review/
├── acp/                       # Независимый адаптер ACP (Agent Client Protocol) для CLI
├── cmd/opencodereview/        # Точка входа CLI — разбор флагов и диспетчеризация
├── docs/                      # Локализованные README и руководства для участников
├── imgs/                      # Изображения и логотипы для README
├── internal/
│   ├── agent/                 # Логика агента ревью и запуск подагентов
│   ├── chatgptauth/           # ChatGPT OAuth и управление учётными данными
│   ├── config/                # Шаблоны, правила, список разрешений, встроенный JSON
│   ├── delegate/              # Генерация спецификаций ревью без вызовов LLM
│   ├── diff/                  # Разбор Git diff
│   ├── gitcmd/                # Запуск Git в дочерних процессах
│   ├── llm/                   # Клиенты LLM и определение конечных точек API
│   ├── llmloop/               # Общий цикл вызова инструментов LLM для review и scan
│   ├── mcp/                   # Клиенты MCP и адаптеры инструментов
│   ├── model/                 # Структуры данных (LlmComment, Diff, …)
│   ├── pathutil/              # Утилиты для работы с путями
│   ├── release/               # Проверки согласованности имён артефактов релиза
│   ├── scan/                  # Ревью кода полных файлов
│   ├── session/               # Запись сеансов в JSONL
│   ├── stdout/                # Вывод в stdout с возможностью отключения
│   ├── suggestdiff/           # Отображение diff предлагаемых изменений
│   ├── telemetry/             # Настройка OpenTelemetry и вспомогательные функции
│   ├── tool/                  # Реестр инструментов и реализации провайдеров
│   └── viewer/                # Встроенный HTTP UI для просмотра сеансов ревью
├── pages/                     # Главная страница сайта и документация (отдельное приложение React)
├── plugins/                   # Интеграции с агентами для программирования (Claude Code, Codex, OpenCode, …)
├── extensions/                # Расширения VS Code и IntelliJ IDEA, общий фронтенд
├── examples/                  # Примеры CI (GitHub Actions, GitLab CI)
├── skills/                    # Определения навыков для ревью и делегирования
├── scripts/                   # Скрипты установки, публикации и проверки репозитория
├── npm/                       # Необязательные пакеты зависимостей для каждой платформы
└── bin/                       # Обёртка NPM (Node)
```

大多数变更涉及 `internal/agent/`、`internal/tool/` 或
`internal/llm/`。`cmd/opencodereview/` 中的 CLI 接口刻意保持精简：它解析标志并分发命令。

## 使用 AI 开发

在开发中使用 AI 帮助完全正常，如果这样能让你更容易做贡献，我们非常欢迎。我们不能接受的是：模型生成的代码未经阅读就进入提交，且其冗余和错误无人修正。这类变更会拖慢审查讨论，阻碍 Pull Request 推进。

如果 AI 参与了你的工作，请遵守以下规则。

### 规则：

1. **你必须在初始 Issue 或 Pull Request 中披露使用了 AI/LLM，并说明所用工具/模型等。**
2. 你必须理解 AI 编写的每一行代码，并知道 AI 具体做了什么。
3. 当审查者询问某项变更的原因时，你必须能自行解释，无论该变更由你还是 AI 编写。你对维护者问题和审查意见的回复内容必须源于你自己的理解——AI/LLM 只能用于翻译或润色措辞，不能用于生成回复本身。
4. 你的 PR 中不得出现 `AI 生成 -> 修复 -> 修复 -> 修复` 这样的重复循环。这可能表明你没有检查 AI 生成的代码，而是让 AI 在问题出现时反复修复。
5. 在主动请求任何参与者进行审查之前，你必须先自行检查 AI/LLM 创建的所有代码、文本和其他材料。
6. 你不得将提交归属于 AI/LLM，包括通过 "Assisted-by"、"Co-developed-by" 或类似尾注。
7. 不要写过于冗长的提交信息。重要信息应写在 PR 描述中，而不是折叠的提交信息里。
8. 如果你不想或无法完成上述所有要求，请关闭你的 Issue 或 Pull Request。

谢谢！

## 许可证头

每个源文件（`.go`、`.js`、`.mjs`、`.ts`、`.tsx`、`.kt`、`.kts`、`.sh`、`.py`、`.css`）都必须包含 SPDX 许可证头。创建新文件后，运行：

```bash
make license-add
```

该命令会自动添加所需的许可证头。CI 会拒绝缺少许可证头的 PR。

## 代码质量检查

创建 PR 前，运行：

```bash
make check      # форматирование, линт и проверка заголовков лицензии
make test       # race-enabled, runs in CI on every push
make build      # smoke test the binary builds
```

CI 在每次推送变更时运行相同的检查集——不会有意外检查。

## 添加新工具

本节描述修改内置代理的源代码，而非运行时配置。请用测试和基准测试验证核心工具的变更。外部业务上下文请使用 [MCP 服务器](../mcp/)。

工具由两部分组成：

1. **[`internal/config/toolsconfig/tools.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/toolsconfig/tools.json)
   中的 JSON 定义**：LLM 看到的名称、描述和 JSON Schema 参数。
2. **在 `internal/tool/definitions.go` 中注册的 Go 提供者**，包含实际实现。

新工具名称要生效，两部分都必需。现有六个工具在[工具](../tools/)章节中描述；可将它们作为模板。

在相应模板的 `MAIN_TASK.tools` 数组中选择工具。review 和 scan
有各自的列表；请保持顺序，因为它会影响模型请求。要在不允许调用的情况下将工具描述传入 review 规划，请将其添加到 `PLAN_TASK.tool_references`。
定义不得包含任务归属标志，定义名称必须与目录条目名称一致。

这些列表为模型请求选择定义，并非执行沙箱。
MCP 发现以及 review 特有的完成和过滤协议保留在现有任务适配器中。其他辅助任务不使用这些目录绑定；不支持的
`tools` 和 `tool_references` 字段会被拒绝，而非忽略。

## 添加新规则模板

修改 `internal/config/rules/system_rules.json`，将新的 glob 模式
映射到规则文档，并在
`internal/config/rules/rule_docs/` 中添加相应的 Markdown 文件。每个模式使用单独的英文规则文档。`language` 参数仅在系统提示中添加以所选语言回复的指令；它不会切换规则文档文件。

## PR 工作流程

1. **大型变更先创建 Issue。** 提前商定方案，好过在代码审查时发现分歧。
2. **一个 PR 一个逻辑变更。** 如果有两个不相关的修复，请提交两个 PR。
3. **更新测试。** 行为变更需要测试覆盖；
   `make test` 必须通过。
4. **更新文档。** 如果变更涉及标志、配置键
   或审查流水线，请同时更新本文档站点（位于
   [`docs/`](https://github.com/alibaba/open-code-review)）和相应的内置帮助。
5. **填写 PR 模板。** 维护者将进行审查，通常在几个工作日内。

## 如何加速 PR 审查

希望你的 PR 更快被审查和接受？以下做法有帮助：

- **提前签署 CLA** — 许多新手贡献者因为忽略 CLA 机器人的评论而卡住。机器人一提示就立即签署贡献者许可协议——未签署 CLA 的 PR 无法被接受。
- **确保所有 CI 检查通过** — 检查未通过的 PR 不会被审查。提交前在本地运行 `make test` 和 `make build`，提前发现问题。
- **保持变更聚焦且小** — 做好一件事的 PR 比混合不相关变更的 PR 更容易审查。小 PR 审查更快，需要多轮修改的次数更少。
- **写清晰准确的描述** — 解释*什么*变了以及*为什么*。描述应与实际 diff 一致——如果两者不符，审查者会失去信任。如果开发过程中工作量发生变化，请在请求审查前更新描述。
- **为行为变更添加测试** — 没有测试的新功能或修复会引起疑问。测试证明正确性，并帮助审查者理解预期行为。
- **遵循现有代码模式** — 遵循周围代码的风格、命名约定和架构。一致性降低审查者的认知负担，避免仅涉及风格的评论。
- **及时响应反馈** — 当审查者请求变更时，尽快处理以缩短审查周期。如果你不同意，请解释你的立场，而不是忽略评论。

## 贡献者许可协议（CLA）

项目要求签署 Alibaba Open Source CLA。创建第一个 PR 时，机器人
会发布链接——以电子方式签署协议（约需一分钟）。后续 PR 无需重复签署。

## 第一次做贡献？

寻找带有
[`good first issue`](https://github.com/alibaba/open-code-review/labels/good%20first%20issue)
或 [`help wanted`](https://github.com/alibaba/open-code-review/labels/help%20wanted) 标签的任务。
它们大多规模小、自包含，且描述中有足够上下文可供入门。

## 另见

- [架构](../architecture/) — 修改 `internal/agent/` 前应了解的项目结构模型。
- [工具](../tools/) — 现有工具的样子。
- 完整贡献者指南：
  [CONTRIBUTING.md](https://github.com/alibaba/open-code-review/blob/main/CONTRIBUTING.md)