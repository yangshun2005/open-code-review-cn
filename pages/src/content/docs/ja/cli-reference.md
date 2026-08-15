---
title: CLI 参考
sidebar:
  order: 6
---

这是关于每个 `ocr` 子命令、参数以及退出行为的完整参考。

## 全局用法

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

## 命令列表

| 命令 | 别名 | 作用 |
|---|---|---|
| `ocr review` | `ocr r` | 执行代码审查并输出评论。 |
| `ocr scan` | `ocr s` | 无需 Git diff，扫描整个文件。 |
| `ocr rules check <file>` | — | 显示哪些规则适用于某个文件路径及其来源。 |
| `ocr config set <key> <value>` | — | 将配置值持久化到 `~/.opencodereview/config.json`。 |
| `ocr config unset custom_providers.<name>` | — | 删除自定义提供商（如果当前正在使用，也会清除有效的 `provider`/`model`）。 |
| `ocr config provider` | — | 交互式提供商配置 TUI。 |
| `ocr config model` | — | 交互式模型选择 TUI。 |
| `ocr llm test` | — | 发送简短的聊天请求以验证配置的端点。 |
| `ocr llm providers` | — | 列出所有内置的 LLM 提供商。 |
| `ocr session list` | `ocr sessions list`, `ocr session ls` | 列出已保存的审查会话。 |
| `ocr session show <id>` | `ocr sessions show <id>` | 显示单个会话及按文件划分的检查点。 |
| `ocr session comments <id>` | `ocr sessions comments <id>` | 显示单个会话中记录的审查评论。 |
| `ocr viewer` | — | 为历史审查会话启动本地 Web UI（`localhost:5483`）。 |
| `ocr version` | — | 输出版本、提交、平台、构建日期和 GitHub URL。 |

`ocr` 和 `ocr -h` 输出顶层用法。每个子命令也接受 `-h` / `--help`。

## `ocr review`

这是主命令。它解析 Git diff，分派按文件划分的子代理，并收集和输出审查评论。

### 概述

```text
ocr review [flags]
ocr r      [flags]   (alias)
```

如果不传递任何参数，OCR 将以**工作区模式**运行。它会审查当前目录仓库中所有暂存 + 未暂存 + 未跟踪的更改。

### 参数

| 参数 | 短选项 | 默认值 | 描述 |
|---|---|---|---|
| `--repo <path>` | — | 当前目录 | Git 仓库根目录。 |
| `--from <ref>` | — | — | diff 的起始引用（例如：`main`）。 |
| `--to <ref>` | — | — | diff 的结束引用（例如：`feature-branch`）。设置后，OCR 将计算 `merge-base(from, to)..to`。 |
| `--commit <sha>` | `-c` | — | 审查单个提交（与其父提交的差异）。 |
| `--preview` | `-p` | `false` | 运行过滤流水线但跳过 LLM。输出文件列表和排除原因。支持 `--format json`。不支持 `--format sarif`（预览没有已完成的发现可输出）。 |
| `--no-filter` | — | `false` | 保留所有审查评论，并跳过每个文件的 `REVIEW_FILTER_TASK` LLM 后处理调用。 |
| `--resume <session-id>` | — | — | 从先前兼容的范围或单提交审查会话恢复。 |
| `--format <fmt>` | `-f` | `text` | `text`（人类可读格式）、`json`（机器可读的评论数组）或 `sarif`（用于 GitHub 代码扫描的 SARIF 2.1.0 报告）。 |
| `--audience <who>` | — | `human` | `human` 流式输出进度行。`agent` 使标准输出静音，仅输出最终摘要 / JSON。 |
| `--background <text>` | `-b` | — | 注入到计划和主提示中的可选需求 / 业务上下文。 |
| `--background-file <path>` | `-B` | — | 用作审查背景的 Markdown 文件路径。如果同时指定了 `--background`，则两者合并。 |
| `--exclude <patterns>` | — | — | 要排除的 gitignore 格式模式（逗号分隔）。与 `rule.json` 中的排除项合并。 |
| `--concurrency <n>` | — | `8` | 并行审查的最大文件数。 |
| `--timeout <minutes>` | — | `10` | 每个文件的截止时间。`0` 禁用超时。 |
| `--rule <path>` | — | — | 自定义 JSON 审查规则文件的路径。覆盖项目级和全局的 `rule.json`。 |
| `--max-tools <n>` | — | 模板默认值 | 每个文件的最大工具调用次数。`0` 使用模板默认值（`30`）。1-9 会被提升到 `10`。所有 `≥ 10` 的值都会覆盖模板默认值（即使小于 `30`）。 |
| `--max-tokens <n>` | — | 配置或模板默认值 | 每个文件的提示词令牌上限。覆盖此运行中已保存的 `max_tokens` 设置。 |
| `--max-tokens-budget <n>` | — | `0`（无限制） | 限制整个审查的输入 + 输出令牌使用量。超过预算将停止分配处理，但部分结果仍会发布。 |
| `--provider <name>` | — | — | 为此运行选择已配置的提供商。可以使用 `providers` 和 `custom_providers` 中的名称。 |
| `--model <name>` | — | — | 为此运行覆盖已解析的 LLM 模型（例如：`claude-opus-4-6`）。 |
| `--max-git-procs <n>` | — | `16` | 并行 git 子进程的最大数量。 |
| `--tools <path>` | — | 内置 | 自定义 JSON 工具配置文件的路径。覆盖内置的工具定义。 |

> 模式参数是互斥的：要么传递 `--from`/`--to`，要么传递 `--commit`，要么都不传递（工作区模式）。
> 混合使用将直接导致错误。
> `--resume` 仅支持范围或单提交审查，且不能与 `--preview` 一起使用。

### 每次运行的 LLM 选择

`review` 和 `scan` 都接受 `--provider` 和 `--model`。
这些覆盖仅适用于当前调用，不会更改已保存的设置：

```bash
ocr review --provider anthropic --model claude-opus-4-6 --format json
ocr scan --provider openai --model gpt-5.4 --format json
```

显式的 `--provider` 会优先于常规来源解析，从已保存的 `providers` 或
`custom_providers` 中选择条目。如果未指定 `--provider`，OCR 将保持传统的
来源顺序：已保存的设置、完整的 `OCR_LLM_*` 环境配置、完整的 Claude Code
环境配置、shell rc 文件。`--model` 覆盖所选来源中的模型，但
不会改变来源顺序。不完整的策略不会与其他策略混合，而是回退到下一个。
所选内置提供商的凭据仍从相应的环境变量中获取。

### 模式

#### 工作区模式（默认）

```bash
ocr review
```

OCR 从两个 git 命令组装工作树更改：

- `git diff HEAD` 获取已跟踪的更改（将暂存 + 未暂存合并与 `HEAD` 比较。如果为空，则回退到 `git diff --staged`）
- `git ls-files --others --exclude-standard` 获取未跟踪文件，并从磁盘读取，将其视为完整的新增文件

这通常正是你在提交前想要检查的内容。如果需要更小的范围，请有选择地暂存。

#### 范围模式

```bash
ocr review --from main --to feature-branch
```

OCR 计算 `merge-base(main, feature-branch)..feature-branch`，因此只显示功能分支*引入*的 diff。分支创建后进入 `main` 的无关更改不包含在内。

#### 提交模式

```bash
ocr review --commit abc123
ocr review -c abc123
```

审查 `git show abc123` 生成的 diff（即该提交引入的更改）。

### 恢复中断的审查

所有 `ocr review` 运行都会在 `~/.opencodereview/sessions/` 下保存本地
会话日志。正常完成的文本输出专注于审查结果，不显示会话 ID。
已保存的会话可以通过 `ocr session list/show` 查看，
`--format json` 会在机器可读输出中包含 `session_id`。如果范围或单提交
审查被中断，可以列出已保存的会话，并从匹配相同审查目标的会话恢复：

```bash
ocr session list
ocr session show <session-id>
ocr session comments <session-id>
ocr review --from main --to feature-branch --resume <session-id>
ocr review --commit abc123 --resume <session-id>
```

恢复是有意严格的。仅当本次运行审查与父级相同的目标时，
检查点才会被重用：

- 工作区审查无法恢复
- 审查模式必须匹配：范围会话不能作为单次提交恢复
- 解析后的输入必须匹配。我们不比较引用的*表示形式*
  （`abc1234` 和 `abc1234def` 指向同一提交），但如果相同的引用解析为不同的
  diff，或者规则或过滤器改变了所选文件集，则拒绝整个恢复，而不是部分重用
- 提供商或模型的更改必须通过 `--provider` / `--model` 显式指定。
  通过配置文件或环境变量的更改将被拒绝
- 父级运行必须具有运行清单。输入将与此进行验证。
  文件分发开始后，Ctrl-C 会正常取消审查并写出清单，因此已完成的检查点可以在恢复时
  重用。未正常终止的进程和早于运行清单的会话没有清单
- 仅重用父级清单确认了结果的文件。清单未支持或无法读取的检查点
  只会导致该文件被再次审查，不会影响其他文件
- `--preview` 和 `--resume` 不能同时使用

被拒绝的恢复不会留下任何内容：不创建会话或清单，也不调用 LLM。

### 输出

#### 文本（默认，`--audience human`）

审查运行期间流式输出进度行，然后为每条评论输出一个块（包含 `path:start-end` 的暗色 Unicode 分隔标题、100 列换行的评论正文，以及（如果存在）建议替换的彩色内联 diff）。运行结束时，在标准输出末尾输出摘要：

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

评论输出相同，但进度行通过内部可静音的标准输出写入器被抑制（[`internal/stdout`](https://github.com/alibaba/open-code-review/blob/main/internal/stdout/stdout.go)）。在 CI / 流水线中传递给另一个代理时使用。

#### JSON

```bash
ocr review --format json --audience agent
```

```json
{
  "status": "success",
  "llm": {
    "provider": "anthropic",
    "model": "claude-opus-4-6"
  },
  "summary": {
    "files_reviewed": 9,
    "comments": 1,
    "total_tokens": 21344,
    "input_tokens": 18012,
    "output_tokens": 3332,
    "elapsed": "1m12s"
  },
  "comments": [
    {
      "path": "src/foo.go",
      "content": "Concurrent map access without a lock — wrap with sync.RWMutex.",
      "start_line": 42,
      "end_line": 47,
      "existing_code": "m[k] = v",
      "suggestion_code": "mu.Lock(); defer mu.Unlock(); m[k] = v",
      "thinking": "Looking at line 42, the map …"
    }
  ]
}
```

顶层字段：

| 字段 | 描述 |
|---|---|
| `status` | `success`、`completed_with_warnings`、`completed_with_errors` 或 `skipped`。 |
| `llm` | 已解析的 LLM 标识。始终包含规范化的 `model`，仅当提供商是命名配置的提供商时才包含 `provider`。 |
| `message` | 可选。人类可读的摘要（例如：`"No comments generated. Looks good to me."`）。 |
| `summary` | 可选。运行聚合：`files_reviewed`、`comments`、`total_tokens`、`input_tokens`、`output_tokens`、`cache_read_tokens`（omitempty）、`cache_write_tokens`（omitempty）、`elapsed`。`skipped` 运行时省略。 |
| `comments` | 始终存在，但可能为空。每个评论的字段如上例所示。 |
| `warnings` | 可选。当一个或多个子代理失败时存在。每个条目描述受影响的文件和错误。 |
| `session_id` | 可选。包含在持久化的审查运行中。在重试兼容的范围或单提交审查时，可传递给 `ocr review --resume <session-id>`。 |
| `resume` | 可选。在恢复的运行中存在，包含 `resumed_from`、`reused_files`、`rerun_files`、`previous_model`、`current_model`。 |

如果没有文件需要审查，JSON 模式会发出 `skipped` 外壳，以便调用方区分“无更改”和“无发现”：

```json
{
  "status": "skipped",
  "message": "No supported files changed.",
  "llm": {
    "provider": "anthropic",
    "model": "claude-opus-4-6"
  },
  "comments": []
}
```

### 退出代码

| 代码 | 含义 |
|---|---|
| `0` | 审查已完成（可能零评论或存在非致命警告）。 |
| `1` | 致命错误。参数错误、无法解析 LLM 端点、所有按文件的子代理均失败等。错误文本输出到 stderr。 |

非致命警告（单个子代理失败、某个文件超过令牌阈值等）会内联输出。在 JSON 模式下，会添加到 `warnings` 数组中。

## `ocr scan`

无需 Git diff 的整个文件审查。从工作树中读取每个文件的当前内容并发送给 LLM。适用于不熟悉的代码库或没有有意义 diff 的目录审计。

```text
ocr scan [flags]
ocr s      [flags]   (alias)
```

如果不传递 `--path`，则扫描整个仓库。

### 参数

| 参数 | 短选项 | 默认值 | 描述 |
|---|---|---|---|
| `--path <list>` | - | 整个仓库 | 要扫描的仓库相对目录或文件（逗号分隔，例如：`internal/agent`、`internal/llm/client.go`）。 |
| `--exclude <patterns>` | - | - | 要排除的 gitignore 格式模式（逗号分隔，例如：`**/generated/*,*.pb.go`）。与 `rule.json` 中的排除项合并。 |
| `--preview` | `-p` | `false` | 在不调用 LLM 的情况下枚举和过滤文件。输出文件列表、审查/排除计数、总行数以及每个文件的排除原因。支持 `--format json`。不支持 `--format sarif`。 |

```bash
ocr scan --preview                              # 查看要扫描的内容
ocr scan --path internal/agent                  # 扫描单个目录
ocr scan --path internal/agent,internal/llm/client.go
ocr scan --exclude '**/generated/*,*.pb.go'
```

完整标志列表请参阅 `ocr scan -h`。

## `ocr session`

列出并检查保存在 `~/.opencodereview/sessions/` 下的本地审查会话日志。
用于查找会话 ID、检查按文件的检查点状态，以及恢复中断的范围或单提交
审查。

```text
ocr session <sub-command>
ocr sessions <sub-command>   (alias)

Sub-commands:
  list, ls        List
```