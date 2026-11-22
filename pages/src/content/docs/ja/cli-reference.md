---
title: CLI 参考
sidebar:
  order: 6
---

各 `ocr` 子命令、参数及退出行为的完整参考。

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

所有命令均可用，可放在子命令前后
（`ocr --color=never review` 与 `ocr review --color=never` 等价）。

| 标志 | 默认值 | 说明 |
|---|---|---|
| `--color <auto\|always\|never>` | `auto` | 输出 ANSI 颜色的条件。`auto` 仅在 stdout 为终端时着色，管道或重定向时输出纯文本。`always` 即使通过管道也保持着色（便于 `\| less -R` 等场景）。 |

stdout 非终端时，文本输出始终为纯文本，可安全管道：

```bash
ocr review --commit HEAD | gh issue comment 123 --body-file -
```

`TERM=dumb` 时也会禁用颜色。

## 命令列表

| 命令 | 别名 | 作用 |
|---|---|---|
| `ocr review` | `ocr r` | 执行代码审查并输出评论。 |
| `ocr scan` | `ocr s` | 无需 Git diff，扫描整个文件。 |
| `ocr rules check <file>` | — | 显示某文件路径应用了哪些规则及其来源。 |
| `ocr config set <key> <value>` | — | 将配置值持久化到 `~/.opencodereview/config.json`。 |
| `ocr config unset <key>` | — | 清除已保存的配置值（`provider`、`max_tokens`、`effort`、`custom_providers.<name>`、`mcp_servers.<name>`）。 |
| `ocr config provider` | — | 交互式 provider 配置 TUI。 |
| `ocr config model` | — | 交互式 model 选择 TUI。 |
| `ocr llm test` | — | 发送简短 chat 请求，验证配置的端点。 |
| `ocr llm providers` | — | 列出所有内置 LLM provider。 |
| `ocr session list` | `ocr sessions list`, `ocr session ls` | 列出已保存的审查会话。 |
| `ocr session show <id>` | `ocr sessions show <id>` | 显示单个会话及按文件的检查点。 |
| `ocr session comments <id>` | `ocr sessions comments <id>` | 显示单个会话中记录的审查评论。 |
| `ocr session compare <before> <after>` | `ocr session diff <before> <after>` | 比较两个会话的发现：新增、持续、已解决、未审查。 |
| `ocr session export [id]` | — | 将单个会话导出为自包含的 HTML 文件。 |
| `ocr session rm <id>` | `ocr session delete <id>`, `ocr session remove <id>` | 删除单个已保存的审查会话。 |
| `ocr viewer` | — | 启动历史审查会话的本地 Web UI（`localhost:5483`）。 |
| `ocr version` | — | 输出版本、commit、平台、构建日期、GitHub URL。 |

`ocr` 和 `ocr -h` 输出顶层用法。各子命令也接受 `-h` / `--help`。

## `ocr review`

主命令。解析 Git diff，将语义相关的文件分组，为每组派发子代理，收集并输出审查评论。
`review` 和 `scan` 的最终报告（文本、JSON、SARIF 任一格式）中，发现按严重程度从低到高排列（`low`、`medium`、`high`、`critical`）。
未指定严重程度或无法识别严重程度值的发现显示在 `low` 之前。相同严重程度的发现按收集顺序排列，但由于并行处理，该顺序每次运行可能不同。

### 概要

```text
ocr review [flags]
ocr r      [flags]   (alias)
```

不传任何参数时，OCR 以**工作区模式**运行，审查当前目录仓库中所有 staged + unstaged + untracked 的变更。

### 参数

| 参数 | 短选项 | 默认值 | 说明 |
|---|---|---|---|
| `--repo <path>` | — | 当前目录 | Git 仓库根目录。 |
| `--from <ref>` | — | — | diff 起始 ref（如 `main`）。 |
| `--to <ref>` | — | — | diff 结束 ref（如 `feature-branch`）。设置后 OCR 计算 `merge-base(from, to)..to`。仅指定 `--from` 而省略 `--to` 时默认为 `HEAD`（仅审查已提交的变更，相当于 `git diff <from>...HEAD`）。 |
| `--commit <sha>` | `-c` | — | 审查单个 commit（与其父提交的差异）。 |
| `--preview` | `-p` | `false` | 执行过滤流水线但跳过 LLM。输出文件列表和排除原因。支持 `--format json`。不支持 `--format sarif`（预览没有可输出的已完成发现）。 |
| `--no-filter` | — | `false` | 保留所有审查评论，跳过每个子任务的 `REVIEW_FILTER_TASK` LLM 后处理调用。子任务审查单个文件或一组相关文件。 |
| `--resume <session-id>` | — | — | 从之前兼容的范围、单 commit 或工作区审查会话恢复。 |
| `--format <fmt>` | `-f` | `text` | `text`（人类可读）、`json`（机器可读的评论数组）或 `sarif`（用于 GitHub Code Scanning 的 SARIF 2.1.0 报告）。 |
| `--output <path>` | `-o` | 标准输出 | 将审查结果写入 UTF-8 文件（`-` 表示标准输出）。首次写入时延迟创建，运行失败不会修改已有文件。文本格式会自动去除 ANSI 颜色代码。 |
| `--audience <who>` | — | `human` | `human` 流式输出进度行（`--format` 为 `json`/`sarif` 时输出到 stderr，stdout 保持为可解析的单一文档）。`agent` 完全抑制进度行，仅输出最终摘要 / JSON。 |
| `--background <text>` | `-b` | — | 注入 plan + main prompt 的任意需求 / 业务上下文。 |
| `--background-file <path>` | `-B` | — | 用作审查背景的 Markdown 文件路径。同时指定 `--background` 时两者合并。 |
| `--exclude <patterns>` | — | — | 要排除的 gitignore 格式模式（逗号分隔）。与 `rule.json` 的 excludes 合并。 |
| `--concurrency <n>` | — | `8` | 并行审查的子任务最大数。 |
| `--timeout <minutes>` | — | `15` | 每个子任务的时限，包括 LLM 调用、工具执行、重试等待。`0` 禁用任务期限，但不禁用请求超时。请求级超时由 `OCR_LLM_TIMEOUT` 或 provider 的 `timeout_sec` 独立设置，单位为秒（默认 `300`）。随 effort 的审查轮数线性缩放（如 low/medium/high 对应 15/30/45 分钟）。 |
| `--rule <path>` | — | — | 自定义 JSON 审查规则文件路径。覆盖项目级和全局的 `rule.json`。 |
| `--max-tools <n>` | — | 模板默认值 | 每个子任务的最大工具调用次数。`0` 使用模板默认值（`100`）。1〜49 会被提升为 `50`。解析后的正值直接作为上限应用。 |
| `--max-tokens <n>` | — | 配置或模板默认值 | 同时应用于 Review 和 Analysis 的每个子任务 prompt（输入）token 上限。模板默认值为 `200000`。仅覆盖本次运行的已保存 `max_tokens` 配置。不改变输出上限（参见 `MAX_COMPLETION_TOKENS`）。 |
| `--analysis` | — | 关闭 | 与单 commit 或 commit 范围审查（`--commit` 或 `--from`）并行，分析行为变化及其影响。输出格式仅支持 `text` 和 `json`。不能用于工作区未提交的变更，也不能与 `--preview` 或 `--resume` 并用。Analysis 调查最多 300 轮，不受 `--max-tools` 影响。预算耗尽时，仅额外允许最多 1 轮用于提交报告。Analysis 失败或跳过不影响 Review 的退出状态。 |
| `--analysis-max-tokens-budget <n>` | — | `0`（无限制） | 仅对 Analysis 的输入输出 token 总数设置软上限。与 Review 并行时，Analysis 可额外执行 1 次模型请求。使用量和执行状态可在 JSON 输出的 `analysis_meta.usage` 和 `analysis_meta.execution_status` 中查看。 |
| `--max-tokens-budget <n>` | — | `0`（无限制） | 限制整个审查的输入 + 输出 token 使用量。在每轮 LLM 之前检查：已超预算的子任务获得 1 次最终轮提交发现，并报告为 `failed(budget)`。后续子任务不再分配，CLI 输出已获得的结果。 |
| `--effort <level>` | — | 配置或 `medium` | 审查力度预设：`low` = main 循环 1 轮，`medium` = 2 轮（默认），`high` = 3 轮。轮数越多召回率越高，但时间和 token 也越多。可通过 `ocr config set effort <level>` 持久化。 |
| `--provider <name>` | — | — | 为本次运行选择已配置的 provider。可使用 `providers` 和 `custom_providers` 中的名称。 |
| `--model <name>` | — | — | 覆盖本次运行解析的 LLM model（如 `claude-opus-4-6`）。 |
| `--max-git-procs <n>` | — | `16` | Review 和 Analysis 合计可同时运行的 Git 子进程数上限。 |

> 模式参数互斥：要么传 `--from`/`--to`，要么传 `--commit`，要么都不传（工作区模式）。
> 混用会直接报错。
> `--resume` 支持范围、单 commit、工作区审查，不能与 `--preview` 并用。

### 运行级 LLM 选择

`review` 和 `scan` 都接受 `--provider` 和 `--model`。
这些覆盖仅作用于当前调用，不修改已保存配置：

```bash
ocr review --provider anthropic --model claude-opus-4-6 --format json
ocr scan --provider openai --model gpt-5.4 --format json
```

显式 `--provider` 会优先于常规来源解析，从已保存的 `providers` 或
`custom_providers` 中选择条目。未指定 `--provider` 时，OCR 保持传统
来源顺序：已保存配置、完整的 `OCR_LLM_*` 环境配置、完整的 Claude Code
环境配置、shell rc 文件。`--model` 覆盖所选来源内的 model，但不改变
来源顺序。不完整的策略不会与其他策略混合，而是回退到下一个。
所选内置 provider 的凭据仍可从对应环境变量获取。

内置 provider 的 `--model` 也接受 `ocr config model` 选择候选项之外的模型。
指定既不在内置列表也不在 `providers.<name>.models` 中的模型时，OCR 会在
stderr 输出警告，验证交由 provider 处理。自定义 provider 仍适用
传统的 `--model` 验证规则。

### 模式

#### 工作区模式（默认）

```bash
ocr review
```

OCR 通过两个 git 命令组装工作树变更：

- `git diff HEAD` 获取已跟踪的变更（staged + unstaged 合并与 `HEAD` 比较。为空时回退到 `git diff --staged`）
- `git ls-files --others --exclude-standard` 获取 untracked 文件，从磁盘读取并作为整文件新增处理

这通常正是提交前想确认的内容。如需更小的范围，请选择性地 stage。

#### 范围模式

```bash
ocr review --from main --to feature-branch
```

OCR 计算 `merge-base(main, feature-branch)..feature-branch`，因此只显示 feature 分支*引入的* diff。不包含切分支后进入 `main` 的无关变更。

#### Commit 模式

```bash
ocr review --commit abc123
ocr review -c abc123
```

审查 `git show abc123` 生成的 diff（即该 commit 引入的变更）。

单 commit 或 commit 范围审查中，Review 和 Analysis 都按目标 commit（`--commit` 指定的 commit，或 `--to` 的解析目标）根目录的 `.gitignore` 筛选变更列表，不使用当前工作树的规则。Analysis 可能读取列表中排除的文件作为调查参考。如需禁止读取，请使用 `--exclude`。

指定 `--analysis` 时，`ocr viewer` 中一个会话 ID 打开一个报告，可在 **Review** 和 **Analysis** 标签页之间切换。**Analysis** 标签页显示执行状态、涉及的变更文件数（非读取的文件数）、模型自评、引用的依据。点击正文中的引用编号可查看对应依据。打开 **Evidence** 可查看所有调查记录，无论是否被引用。

打开 **Conversations** 可查看记录的每个 Analysis 请求的模型响应、工具调用及其结果。此对话记录不包含在 HTML 导出中。报告的 Markdown、结果元数据、依据、执行日志保存在 `~/.opencodereview/sessions/<encoded-repo>/<session-id>/analysis/`。依据和日志可能包含源代码。分析未完成时，最终状态可能未被记录。

### 恢复中断的审查

每次 `ocr review` 运行都会在 `~/.opencodereview/sessions/` 下保存本地
会话日志。正常结束的文本输出专注于审查结果，不显示 session ID。
已保存的会话可通过 `ocr session list/show` 查看，
`--format json` 的机器可读输出包含 `session_id`。范围或单 commit
审查中断时，列出已保存会话，从与相同审查目标匹配的会话恢复：

```bash
ocr session list
ocr session show <session-id>
ocr session comments <session-id>
ocr review --from main --to feature-branch --resume <session-id>
ocr review --commit abc123 --resume <session-id>
ocr review --resume <session-id>   # 工作区（无模式参数）
```

恢复是刻意严格的。仅当本次运行与父会话审查相同目标时，
才复用检查点：

- 工作区审查仅在被审查的工作树未变化时才能恢复。基础 commit 和未提交的变更都必须一致。
  与范围或单 commit 审查不同，没有可固定的 commit，因此恢复运行期间的
  编辑不受保护。同一性通过选择、解析后的 diff 判定，而非工作树的
  字节级快照。仅对未跟踪文件末尾换行的增删或 LF/CRLF 行尾变更
  会归一化为相同 diff，因此可恢复；实质性内容变更会改变 diff，因而被拒绝
- 审查模式必须一致：不能将范围会话作为单 commit 恢复
- 解析后的输入必须一致。不比较 ref 的*写法*
  （`abc1234` 与 `abc1234def` 指向同一 commit），但若同一 ref 解析为不同
  diff，或规则、过滤器改变了所选文件集合，则拒绝整个恢复而非部分复用
- provider 或 model 的变更必须通过 `--provider` / `--model` 显式指定。
  通过配置文件或环境变量的变更会被拒绝
- 父运行必须具有 run manifest。输入将与之比对
  验证。文件 dispatch 开始后，Ctrl-C 会正常取消审查并写出 manifest，
  因此已完成的 checkpoint 可在恢复时复用。未能正常结束的进程和早于
  run manifest 的会话没有 manifest
- 仅复用父 manifest 已确定结果的文件。manifest 未证实或无法读取的
  检查点只会导致该文件重新审查，不影响其他文件
- `--preview` 与 `--resume` 不能并用

被拒绝的恢复不留下任何东西：不创建会话和 manifest，也不调用 LLM。

### 输出

#### Text（默认，`--audience human`）

审查运行期间流式输出进度行，随后为每条评论输出一个块（包含 `path:start-end` 的暗色 Unicode 分隔头、100 列折行的评论正文