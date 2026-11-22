---
title: CLI 参考
sidebar:
  order: 6
---

`ocr` 所有子命令和标志的完整参考，以及退出行为。

## 通用用法

```text
OpenCodeReview - AI-Powered Code Review CLI

Usage:
  ocr [command]

Commands:
  review, r    Start a code review
  rules        Inspect and debug review rules
  config       Manage configuration settings
  llm          LLM utility commands
  viewer       Start the WebUI session viewer
  session, sessions  List and inspect saved review sessions
  version      Show version information

Examples:
  ocr review --from master --to dev        Review diff range
  ocr review --commit abc123               Review a single commit
  ocr review --background "Focus on auth" --background-file ./docs/requirements.md  Review with context
  ocr review -B ./docs/requirements.md                                              Review with context file
  ocr config provider                      Interactive provider setup
  ocr config model                         Interactive model selection
  ocr config set llm.model opus-4-6        Set a config value
  ocr llm test                             Test LLM connectivity
  ocr llm providers                        List built-in providers
  ocr session list                         List saved review sessions
  ocr version                              Show version info

Use "ocr review -h" for more information about review.
Use "ocr rules -h" for more information about rules.
Use "ocr config" for more information about config.
Use "ocr llm" for more information about LLM utilities.
Use "ocr session -h" for more information about session inspection.

GitHub: https://github.com/alibaba/open-code-review
```

## 全局标志

在任何命令中均可用，且可放在子命令之前或之后
（`ocr --color=never review` 与 `ocr review --color=never` 等价）。

| 标志 | 默认值 | 用途 |
|---|---|---|
| `--color <auto\|always\|never>` | `auto` | 何时输出 ANSI 颜色。`auto` 仅在 stdout 为终端时着色，因此通过管道或重定向时输出纯文本。`always` 通过管道时也保留颜色（便于 `\| less -R`）。 |

如果 stdout 不是终端，文本输出始终为纯文本，因此可以安全地通过管道传递：

```bash
ocr review --commit HEAD | gh issue comment 123 --body-file -
```

`TERM=dumb` 也会禁用颜色。

## 命令概览

| 命令 | 别名 | 用途 |
|---|---|---|
| `ocr review` | `ocr r` | 启动代码审查并输出评论。 |
| `ocr rules check <file>` | — | 显示指定文件路径应用了哪条规则及其来源。 |
| `ocr config set <key> <value>` | — | 将配置值保存到 `~/.opencodereview/config.json`。 |
| `ocr config unset <key>` | — | 重置已保存的配置值（`provider`、`max_tokens`、`effort`、`custom_providers.<name>`、`mcp_servers.<name>`）。 |
| `ocr config provider` | — | 交互式 TUI 配置提供商。 |
| `ocr config model` | — | 交互式 TUI 选择模型。 |
| `ocr llm test` | — | 发送一个小请求到聊天以测试配置的端点。 |
| `ocr llm providers` | — | 列出所有内置 LLM 提供商。 |
| `ocr session list` | `ocr sessions list`、`ocr session ls` | 列出已保存的审查会话。 |
| `ocr session show <id>` | `ocr sessions show <id>` | 显示单个会话及每个文件的检查点。 |
| `ocr session comments <id>` | `ocr sessions comments <id>` | 输出单个会话中记录的审查评论。 |
| `ocr session compare <before> <after>` | `ocr session diff <before> <after>` | 比较两个会话的发现：新增、保留、已解决、未检查。 |
| `ocr session export [id]` | — | 将单个会话导出为独立 HTML 文件。 |
| `ocr session rm <id>` | `ocr session delete <id>`、`ocr session remove <id>` | 删除单个已保存的审查会话。 |
| `ocr viewer` | — | 启动本地 Web 界面查看历史审查会话（`localhost:5483`）。 |
| `ocr version` | — | 输出版本、提交、平台、构建日期和 GitHub URL。 |

`ocr` 和 `ocr -h` 输出顶层帮助。每个子命令也接受 `-h` / `--help`。

## `ocr review`

主命令。确定 Git diff，将语义相关的文件合并为组，每组启动一个子代理，收集审查评论并输出。
在最终报告中，`review` 和 `scan` 的发现按严重程度升序排列，适用于所有三种格式（文本、JSON 和 SARIF）：`low`、`medium`、`high`、`critical`。未指定或无法识别严重程度的发现排在 `low` 之前。相同严重程度时保持发现收集顺序，由于并行处理，该顺序可能因运行而异。

### 语法

```text
ocr review [flags]
ocr r      [flags]   (alias)
```

如果未传递标志，OCR 以**工作区模式**运行——检查当前目录仓库中所有已索引、未索引和未跟踪的更改。

### 标志

| 标志 | 短形式 | 默认值 | 描述 |
|---|---|---|---|
| `--repo <path>` | — | 当前目录 | Git 仓库根目录。 |
| `--from <ref>` | — | — | diff 起始的源引用（例如 `main`）。 |
| `--to <ref>` | — | — | diff 结束的目标引用（例如 `feature-branch`）。如果指定，OCR 计算 `merge-base(from, to)..to`。如果只指定 `--from` 而没有 `--to`，目标 ref 默认为 `HEAD`（仅审查已提交的更改，如 `git diff <from>...HEAD`）。 |
| `--commit <sha>` | `-c` | — | 审查单个提交（与父提交比较）。 |
| `--preview` | `-p` | `false` | 运行过滤流水线但跳过 LLM。输出文件列表和排除原因。支持 `--format json`；不支持 `--format sarif`（预览中没有可输出的已完成发现）。 |
| `--no-filter` | — | `false` | 保留所有审查评论，跳过每个子任务的 `REVIEW_FILTER_TASK` LLM 后处理调用。子任务检查单个文件或一组相关文件。 |
| `--resume <session-id>` | — | — | 恢复之前兼容的范围、提交或工作区审查会话。 |
| `--format <fmt>` | `-f` | `text` | `text`（人类可读）、`json`（机器可读的评论数组）或 `sarif`（用于 GitHub Code Scanning 的 SARIF 2.1.0 报告）。 |
| `--output <path>` | `-o` | stdout | 将审查结果写入 UTF-8 文件（`-` 表示 stdout）。文件在首次写入时惰性创建，因此失败的运行不会影响现有文件。文本格式中 ANSI 颜色代码自动移除。 |
| `--audience <who>` | — | `human` | `human` 输出进度（当 `--format` 为 `json`/`sarif` 时输出到 stderr，以保持 stdout 为单一可解析文档）；`agent` 完全抑制进度输出，仅打印最终摘要 / JSON。 |
| `--background <text>` | `-b` | — | 添加到规划提示和主任务提示中的可选需求 / 业务上下文。 |
| `--background-file <path>` | `-B` | — | 包含审查上下文的 Markdown 文件路径。如果同时指定 `--background`，两个来源都会使用。 |
| `--exclude <patterns>` | — | — | 逗号分隔的 gitignore 风格排除模式；与 `rule.json` 中的 excludes 合并。 |
| `--concurrency <n>` | — | `8` | 并行检查的最大子任务数。 |
| `--timeout <minutes>` | — | `15` | 每个子任务的时间预算，包括 LLM 调用、工具和重试等待。`0` 禁用任务截止时间，但不包括请求超时。独立请求超时通过 `OCR_LLM_TIMEOUT` 或提供商的 `timeout_sec` 设置，单位为秒（默认 `300`）。按 effort 检查轮数线性缩放（例如 low/medium/high 对应 15/30/45 分钟）。 |
| `--rule <path>` | — | — | 自定义审查规则 JSON 文件路径。覆盖项目和全局 `rule.json`。 |
| `--max-tools <n>` | — | 模板值 | 每个子任务的最大工具调用轮数。`0` 使用模板值（`100`）；1–49 的值提升为 `50`；最终正值精确设定上限。 |
| `--max-tokens <n>` | — | 配置值或模板值 | 限制 Review 和 Analysis 中每个子任务提示的输入 token 数。模板默认值为 `200000`。仅对当前运行覆盖已保存的 `max_tokens` 设置。不改变输出 token 限制（参见 `MAX_COMPLETION_TOKENS`）。 |
| `--analysis` | — | 关闭 | 在审查单个提交或提交范围（`--commit` 或 `--from`）的同时，并行运行行为变更及其影响的分析。仅支持 `text` 和 `json` 格式。不适用于工作区未提交更改的审查；也不兼容 `--preview` 和 `--resume`。研究最多 300 轮，与 `--max-tools` 无关。如果预算耗尽，可能还有一轮仅用于提交报告。Analysis 失败或跳过不改变 Review 的退出码。 |
| `--analysis-max-tokens-budget <n>` | — | `0`（无限制） | 仅为 Analysis 设置输入和输出 token 总数的软限制。与 Review 并行时，分析可能执行一次额外的模型请求。token 消耗和执行状态可在 JSON 输出的 `analysis_meta.usage` 和 `analysis_meta.execution_status` 字段中查看。 |
| `--max-tokens-budget <n>` | — | `0`（无限制） | 限制审查的输入 + 输出 token 总数。在每轮 LLM 之前检查：已超出预算的子任务获得最后一轮以提交发现，并标记为 `failed(budget)`；不再启动新子任务，CLI 输出已获得的结果。 |
| `--effort <level>` | — | 配置值或 `medium` | 审查力度预设：`low` = 1 轮主循环，`medium` = 2 轮（默认），`high` = 3 轮。更多轮次意味着更高的发现完整性，但更多时间和 token。可通过 `ocr config set effort <level>` 保存。 |
| `--provider <name>` | — | — | 为本次运行选择已配置的提供商。支持 `providers` 和 `custom_providers` 中的名称。 |
| `--model <name>` | — | — | 为本次审查覆盖选定的 LLM 模型（例如 `claude-opus-4-6`）。 |
| `--max-git-procs <n>` | — | `16` | Review 和 Analysis 共用的同时运行的 Git 子进程上限。 |

> 模式标志互斥：传递 `--from`/`--to`、`--commit`，或都不传递（工作区模式）。
> 组合使用会导致错误。`--resume` 适用于范围、提交和工作区审查，不兼容 `--preview`。

### 为单次运行选择 LLM

`review` 和 `scan` 命令接受 `--provider` 和 `--model` 用于当前运行，不修改已保存的配置。`--provider` 从 `providers` 或 `custom_providers` 中选择条目；`--model` 覆盖所选来源的模型。

对于内置提供商，`--model` 接受 `ocr config model` 建议列表之外的模型。如果模型既不在内置列表中也不在 `providers.<name>.models` 中，OCR 在 stderr 输出警告并交由提供商检查。对于用户自定义提供商，`--model` 的检查规则不变。

### 模式

#### 工作区模式（默认）

```bash
ocr review
```

OCR 通过两个 Git 命令生成工作树更改：

- 已跟踪更改——通过 `git diff HEAD`（相对于 `HEAD` 的已索引和未索引更改；如果结果为空，OCR 使用 `git diff --staged`）；
- 未跟踪文件——通过 `git ls-files --others --exclude-standard`：从磁盘读取并视为完整新增文件。

这通常是提交前所需的。如果需要更窄的范围，请选择性地将文件添加到索引。

#### 范围模式

```bash
ocr review --from main --to feature-branch
```

OCR 计算 `merge-base(main, feature-branch)..feature-branch`，因此你只看到功能分支*引入*的 diff，而不包括 `main` 在其创建后产生的无关更改。

#### 提交模式

```bash
ocr review --commit abc123
ocr review -c abc123
```

检查 `git show abc123` 获得的 diff（即该单个提交引入的更改）。

审查提交或提交范围时，Review 和 Analysis 都会从更改列表中排除与目标提交（通过 `--commit` 指定或由 `--to` 确定）的根 `.gitignore` 规则匹配的路径，而非工作树。Analysis 仍可读取因此被排除的文件以获取上下文。要禁止读取，请使用 `--exclude`。

使用 `--analysis` 标志时，同一会话 ID 在 `ocr viewer` 中打开包含 **Review** 和 **Analysis** 选项卡的统一报告。**Analysis** 选项卡显示执行状态、分析范围内的更改文件数（而非读取的文件数）、模型自评以及报告引用的材料。点击文本中的引用编号可查看对应材料。展开 **Evidence** 可查看所有观察结果，包括报告中未引用的。

在 **Conversations** 部分，可展开每个记录的 Analysis 请求，查看模型响应、工具调用及其结果。此对话日志不包含在 HTML 导出中。Markdown 格式的报告、结果元数据、研究材料和执行日志存储在 `~/.opencodereview/sessions/<encoded-repo>/<session-id>/analysis/`。材料和日志可能包含源代码。如果分析未完成，可能没有最终状态。

### 恢复中断的审查

每次 `ocr review` 运行都会在 `~/.opencodereview/sessions/` 目录中保存本地会话日志。成功的文本输出专注于审查结果，不显示会话 ID；要查找已保存的会话，请使用 `ocr session list/show`，要在机器可读输出中获取 `session_id`，请使用 `--format json`。如果审查被中断，列出已保存的会话并恢复与同一审查目标匹配的会话：

```bash
ocr session list
ocr session show <session-id>
ocr session comments <session-id>
ocr review --from main --to feature-branch --resume <session-id>
ocr review --commit abc123 --resume <session-id>
ocr review --resume <session-id>   # 工作区（无模式标志）
```

恢复有意严格。仅当新运行检查的内容与父运行完全相同时才复用检查点：

- 工作区审查仅在工树未更改时可恢复：基础提交和未提交更改必须匹配。与范围或提交审查不同，这里没有可固定的内容，因此恢复运行期间的编辑不受保护。身份基于选定和解析的 diff 计算，而非工作树的逐字节快照；未跟踪文件的尾部换行符添加或删除，或 LF/CRLF 行尾切换，会规范化为同一 diff 并允许恢复，而内容的实质性更改会改变 diff 并被拒绝；
- 审查模式必须匹配：范围会话不能作为提交审查恢复；
- 解析的输入必须匹配。ref 的*写法*不比较（`abc1234` 和 `abc1234def` 指向同一提交），但如果相同 ref 现在产生不同 diff，或规则或过滤器改变了选定文件集，恢复会被整体拒绝，而非部分复用；
- provider 或 model 的变更必须通过 `--provider` / `--model` 显式请求；来自配置或环境的变更会被拒绝；
- 父运行必须有 run manifest——输入正是通过它验证的。在文件分发开始后，Ctrl-C 会正确取消审查并写入 manifest，因此已完成的 checkpoint 可在恢复时使用。未正确关闭而终止的进程和早于 run manifest 的会话没有 manifest；
- 仅复用 manifest 父运行已确定命运的文件。manifest 未确认或无法读取的检查点仅使该文件失去其检查点——它只是被重新检查；
- `--preview` 和 `--resume` 不能一起使用。

被拒绝的恢复不留下任何东西：没有会话、没有 manifest、没有 LLM 调用。

### 输出

#### 文本（默认，`--audience human`）

审查期间输出进度行，然后为每条评论打印单独块（Unicode 字符的暗色标题，含 `path:start-end`，评论文本在 100 列处换行，如有则显示建议替换的彩色内联 diff）。最后在 stdout 输出运行摘要：

```
[ocr] 17 file(s) changed, reviewing 9 in /path/to/repo
[ocr] Skipping image.png — filtered by path/extension rules
[ocr]   ▶ file_read "src/foo.go"
[ocr]   ✔ file_read (12ms)
[ocr] Plan completed for src/foo.go
…

─── src/foo.go:42-47 ───
Concurrent map access without a lock — wrap with sync.RWMutex.

- m[k] = v
+ mu.Lock(); defer mu.Unlock(); m[k] = v

…
[ocr] Summary: 9 file(s) reviewed, 14 comment(s), ~21344 token(s) used (input: ~18012, output: ~3332), 1m12s elapsed
```

#### 文本（代理，`--audience agent`）

评论输出相同