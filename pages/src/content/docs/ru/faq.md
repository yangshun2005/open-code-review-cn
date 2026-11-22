---
title: 常见问题
sidebar:
  order: 14
---

常见错误、意外行为以及"这是正常现象吗？"类问题。如果这里没有你的问题，请创建
[GitHub Issue](https://github.com/alibaba/open-code-review/issues)，附上执行步骤和完整输出。

## 配置与启动

### `no valid LLM endpoint configured`

```
no valid LLM endpoint configured; one of OCR_LLM_URL/OCR_LLM_TOKEN/OCR_LLM_MODEL,
~/.opencodereview/config.json, or ANTHROPIC_BASE_URL/ANTHROPIC_AUTH_TOKEN/
ANTHROPIC_MODEL must be set
```

OCR 走完了整个端点解析链（[配置](../configuration/#reuse-existing-environment-variables)），
但没有找到完整的 `(URL, token, model)` 组合。执行以下任一操作：

- 运行 `ocr config set llm.url …` / `llm.auth_token …` / `llm.model …`，
  填充 `~/.opencodereview/config.json`，**或**
- 导出 `OCR_LLM_URL` / `OCR_LLM_TOKEN` / `OCR_LLM_MODEL`，**或**
- 如果已在使用 Claude Code，导出 `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` /
  `ANTHROPIC_MODEL`。

然后运行 `ocr llm test` 验证连接，再重新启动评审。

### `ocr llm test` 显示错误的来源

OCR 使用**第一个**完整组合，而非最后一个。因此，如果配置文件包含全部三个 llm.* 键，
环境变量会被忽略。要让环境变量优先，请删除配置键（删除文件或手动删除），
或用 `ocr config set` 切换到新值。

### `ocr llm test` 返回 401 / 403

Token 缺少所需权限范围、已过期，或选错了提供商。Anthropic 和 OpenAI 使用不同的
认证头和 URL 格式——请确认 `llm.use_anthropic` 的值与 URL 匹配：

- Anthropic：URL 以 `/v1/messages` 结尾，`use_anthropic=true`。
- OpenAI / OpenAI 兼容 API：URL 以 `/v1/chat/completions` 结尾，`use_anthropic=false`。

### `not a git repository`

`ocr review` 在当前目录执行 `git diff`（对未跟踪文件执行 `git ls-files`）。
如果不在 Git 工作树内，程序会立即退出。用 `cd` 进入仓库，或传入 `--repo /path/to/repo`。

### "No tool calls parsed"（本地模型 / Ollama）

```
[ocr] No tool calls parsed for src/foo.go, retrying...
[ocr] Max tool requests reached for src/foo.go.
```

如果每次评审都在 `No tool calls parsed` 后循环重试，最终以 "Max tool requests reached"
结束且不产生评论，问题出在模型而非配置。OCR 完全通过工具调用来驱动评审，因此
**模型必须支持原生工具调用（function calling）**。仅在文本输出中*描述*工具调用
（或在 `<think>` 块内描述）的模型无法配合 OCR 工作，无论提示词如何设置；常见例子是
`deepseek-r1`。原生支持工具的模型（如 `qwen3`）可正常工作。使用 Ollama 时请选择
带工具支持标记的模型：<https://ollama.com/search?c=tools>。

不经过 OCR 直接测试本地模型：

```bash
curl http://127.0.0.1:11434/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "qwen3:32b",
  "messages": [{"role": "user", "content": "The code below has a bug, use the report_bug tool to report it.\n\nfunc add(a, b int) int {\n  return a - b\n}"}],
  "tools": [{"type": "function", "function": {"name": "report_bug", "description": "Report a bug in the code",
    "parameters": {"type": "object", "properties": {"line": {"type": "integer"}, "description": {"type": "string"}}, "required": ["description"]}}}]
}'
```

成功：响应包含名为 `report_bug` 的结构化 `tool_calls` 数组。失败："调用"以文本形式
出现在 `content` 中。

如果模型*支持*工具但在本地硬件上响应缓慢，请增大 LLM 超时——参见
[超时](../configuration/#timeouts)章节。

## 过滤与规则

### 我的文件未被检查

运行 `ocr review --preview`（不消耗 LLM 费用）。输出中每个候选文件都会标明
保留或排除的**原因**。provider 目录（如 `vendor/` 和 `node_modules/`）中的文件
在终端中折叠为一行；`ocr review --preview --format json` 仍会逐条列出：

```
src/foo.go              modified
src/foo_test.go         modified  (excluded: user_exclude)
imgs/logo.png           binary    (excluded: unsupported_ext)
3 file(s) in provider directories (node_modules/) — not reviewable
```

排除原因对应[文件过滤](../review-rules/#how-files-are-filtered)的各个阶段：

| 原因 | 修复方法 |
|---|---|
| `binary` | 无需处理：二进制文件不含可供评审的文本。 |
| `user_exclude` | 从 `exclude` 列表中删除该模式。 |
| `unsupported_ext` | 将扩展名加入 `include` 列表，绕过允许类型检查。 |
| `default_path` | 将文件加入 `include`：这会覆盖内置的测试文件排除模式。 |
| `provider_directory` | 无需处理：provider 目录（如 `vendor/` 和 `node_modules/`）永远不会被检查，即使匹配 `include`。 |
| `deleted` | 无需处理：没有新内容可供评审。 |
| `too_large` | 仅 diff 就超过 `max_tokens` 的 80%。增大 `--max-tokens`（或保存的 `max_tokens` 值），或将变更拆分为更小的提交。 |

### 我的自定义规则未生效

运行 `ocr rules check <file-path>`。该命令输出走完整个链后匹配的**层级**和
**glob 模式**：

```
File: src/api/UserHandler.go
Source: Project (.opencodereview/rule.json)
Pattern: src/api/**/*.go
Rule: …
```

如果显示的层级不对（例如显示 "System built-in" 而非预期的项目规则），很可能是
**声明顺序**问题：第一个匹配的模式获胜。将更具体的规则移到 `rules` 数组中更靠前的位置，
或修正 glob 模式。

### 花括号扩展不生效

`bmatcuk/doublestar/v4` 支持 `{ts,tsx}` 结构。如果没有匹配，请检查是否有额外空格：
`{ts, tsx}` 带空格时不会匹配 `tsx`，且不易察觉。

## 评审

### 文件显示零条评论——它真的被检查了吗？

打开[会话查看器](../viewer/)（`ocr viewer`），找到该会话，查看对应文件的 `main_task` 轨迹：

- 有工具调用且以 `task_done` 结束 → 评审成功完成，无问题。
- 有工具调用但循环中断 → 查找错误卡片。
- 没有 `main_task` 卡片 → 文件在评审前已被过滤；参见上方
  [过滤与规则](#filtering--rules)。

### 评论显示 `start_line: 0` 和 `end_line: 0`

OCR 无法将评论定位到 diff 的具体行。两个常见原因：

- 模型改写了 `existing_code`，而非从 diff 中原样复制。指令禁止这样做，但模型有时会违反。
- diff 的异常格式（CRLF、混合制表符和空格）破坏了滑动窗口匹配。

评论仍然有效——只是未能自动定位。大多数 agent 集成（SKILL、Claude Code 插件）会读取
`existing_code` 字段并自行在文件中找到对应位置。

### 超出 token 阈值

```
[ocr] WARNING: prompt tokens (94000) exceed 80% of max_tokens(200000) for src/big.sql
```

文件的初始提示词（规则 + diff + 变更文件列表）在模型响应之前就超过了 `MAX_TOKENS` 的
80%（review 默认 `200000`；`ocr scan` 使用较小的 `58888`）。OCR 跳过该文件并继续；
JSON 模式下也会在 `warnings` 中体现。

注意：`MAX_TOKENS` 仅限制**提示词**。模型输出上限由单独的
`MAX_COMPLETION_TOKENS = 16384` 控制，因此增大 `--max-tokens` 不会扩大输出预算。

可能的解决方案：

- 将自动生成的文件加入 `exclude` 列表。
- 将大型重构拆分为更小的提交。
- 对于一系列小提交，使用 `--commit` 模式，而非在工作区模式下一次性检查全部。

### 文件不大，但规划阶段耗时过长

先运行 `ocr review --preview`。满足以下任一条件时触发规划阶段：组内某文件的
`lines.changed` 达到 `PLAN_MODE_LINE_THRESHOLD`（默认 **50**），或组内文件多于一个
且变更行总数达到 `PLAN_MODE_GROUP_LINE_THRESHOLD`（默认 **100**）。这是预期行为：
大型 diff 受益于预先规划。较小的 diff 可能低于两个阈值。评审规划由内置模板定义，
而非工具覆盖；修改此行为需要改源码并重新构建。

### "Max tool requests reached"

```
[ocr] Max tool requests reached for src/foo.go.
```

模型用完了 100（`MAX_TOOL_REQUEST_TIMES`）轮工具调用，仍未调用 `task_done`。
此前产生的评论仍会被收集并显示。如果大多数文件都出现此情况，通常原因如下：

- 模型未能很好地遵循"完成后调用 `task_done`"的指令。切换到更强的模型（如 Claude Opus）。
- 工具返回错误，模型反复重试。查看会话 JSONL：如果同一工具结果重复出现，原因即此。
- 文件确实很大或上下文密集，100 轮不够。用 `--max-tools <n>` 增大上限（例如
  `--max-tools 150`）。最终正值精确设定上限；1–49 的值会预先提升到 `50`，`0`（默认值）
  使用模板上限 `100`。
- 模型完全不支持原生工具调用（本地模型常见）——参见
  ["No tool calls parsed"（本地模型 / Ollama）](#no-tool-calls-parsed-ollama)。

### 部分子 agent 失败；为什么退出码非零？

OCR 隔离各组的错误，仍会发布已完成组的结果。但运维错误（如超时、提供商或配置错误）
即使其他组成功处理也会导致非零退出码，以便 CI 发现覆盖不完整。仅由配置的预算限制
导致的部分评审仍视为成功。未处理组的列表和恢复能力可在 JSON 模式的
`manifest.coverage.failed` 和 `warnings` 中，或文本摘要中查看。

### CI 中的评审比本地慢得多

两个常见原因：

- **模型速率限制**——触发限制时 LLM 客户端会增大间隔并重试。降低 `--concurrency`
  （例如到 `4`）以避免触发限制。
- **冷缓存**——如果提供商支持提示词缓存，部署后的首次运行无法受益。同一时间窗口内的
  后续运行会更快。

## 输出与集成

### `--audience agent` 下仍显示进度行

确认这不是 **stderr**。进度消息（警告和错误）有时会输出到 stderr。`--audience agent`
保证的纯净 stdout 是*为便于解析*而设计的。要隐藏其余输出，请重定向：
`ocr review --audience agent 2>/dev/null`。

### JSON 输出为 `{ "files_reviewed": 0, "comments": [] }`

没有可检查的内容。`files_reviewed` 不是顶层字段：它位于 `summary` 内，此处为 `0`，
而 `comments` 是顶层 `[]`。同一对象包含 `"status": "skipped"`、`"message":
"Review skipped: no items were selected."` 以及 `manifest`，其中 `terminal_state` 为
`"skipped"`，`coverage.selected` 为空。在筛选阶段被排除的文件列在 `coverage.excluded` 中，
每个都带有自己的 `exclude_reason`。

检查了文件但未发现问题的评审同样返回 **`comments: []` 的 JSON 对象**：
`summary.files_reviewed` 为实际检查的文件数，`status` 为 `"complete"`，`message` 为
`"Review complete: 0 finding(s) across N selected item(s)."`。顶层可选字段可能因运行而异，
因此不要通过对象形状或某个可选字段是否存在来区分这些状态。对于带 manifest 的 review 输出，
使用 `summary.files_reviewed` 或 `manifest.terminal_state`。同时，调用方必须容忍下文所述的
无 manifest 路径中 `summary` 和 `manifest` 均不存在。`review --format json` 始终向 stdout
输出恰好一个 JSON 对象，从不输出"裸"数组。

`terminal_state: "complete"` 表示所选集合的评审已完成，而非每个变更文件都被检查。
在筛选阶段被排除的文件（不支持的扩展名、路径规则、内置的机密文件排除、二进制或已删除文件、
超出单文件大小限制）记录在 `manifest.coverage.excluded` 中，带有与 `--preview` 报告的相同
`exclude_reason`，且不会将运行转为 `partial` 状态。该列表仅涵盖到达筛选阶段的文件。
不包括 diff provider 更早丢弃的变更：始终跳过的目录（如 `vendor/` 或 `node_modules/`）中的变更、
被 `.gitignore` 忽略的未跟踪文件，以及在评审单个提交或提交范围时，任何匹配 `.gitignore` 的变更。

更紧凑的无 manifest 无文件路径既不包含 `summary` 也不包含 `manifest`，但仍报告
`"status": "skipped"`、`"message": "No supported files changed."` 和 `"comments": []`；
`tool_calls` 始终存在。`ocr scan` 始终不使用 review manifest，在满足无文件条件时使用此路径。
`ocr review` 在 manifest 构建失败且满足无文件条件时也可能进入此路径。可选元数据（如 `llm`
或 `trace_id`）可能因运行而存在。

### 会话 JSONL 文件存储在哪里？

```
~/.opencodereview/sessions/<path-encoded-repo-path>/<session-id>.jsonl
```

仓库路径通过将 `/` 和 `\` 替换为 `-`、`:` 替换为 `_` 来编码（例如 `/Users/foo/my-repo`
→ `Users-foo-my-repo`）。用 `ocr viewer` 查看会话。要清除历史，删除该目录；下次运行时
OCR 会重新创建编码路径。

## 性能与成本

### 如何确定 token 成本？

启用遥测：

```bash
ocr config set telemetry.enabled true
ocr config set telemetry.exporter console
ocr review
```

在评审主循环中，LLM 调用会生成 `llm.request` span，同时记录为指标。关注
`ocr.llm.tokens_used`（计数器，标签 `model` + `type`）、`ocr.llm.requests_total`
（计数器，标签 `model` + `status`）和 `ocr.llm.request_duration_seconds`
（直方图，标签 `model`）。控制台导出器在运行过程中输出这些聚合值。用于仪表盘时，
切换到 OTLP 导出器并发送到你的指标栈——参见[遥测](../telemetry/)。

### 为什么我的评审这么贵？

影响成本的主要方式：

- 规划阶段对变更行数达到 50 及以上的文件启用（或多文件组变更行总数达到 100 及以上）。
  它需要为每组额外调用一次 LLM，因此**提高**这些阈值才能降低开销；降低阈值会让更多组
  进入规划，成本更高。在零值处两个阈值行为不同。`PLAN_MODE_LINE_THRESHOLD` 为 `0`
  或更小表示*始终规划*——这是最贵的设置，而 `PLAN_MODE_GROUP_LINE_THRESHOLD` 为 `0`
  则禁用组条件。仅当组条件原本是唯一触发条件时，这才能省下一次 plan 调用。
  触发规则见上文"文件不大，但规划阶段耗时过长"。
- 主循环默认执行 2 轮（`medium` 预设）。`--effort low` 保留 1 轮，评审成本约减半；
  `--effort high`（3 轮）提高发现完整度，但成本更高。
- `MAX_TOOL_REQUEST_TIMES = 100` 相当大。每轮都使用的模型会产生更长的对话（消耗更多
  token），而 3 轮就结束的模型则不会。更强的模型通常结束更快。反之，如果你用
  `--max-tools` 增大上限以避免 "max tool requests reached" 错误，每个文件的成本会近似线性增长。
- 内存压缩本身也是一次 LLM 调用。长时间的子任务在评审轮次之外还要支付压缩轮次的费用。

### 如何减少 LLM 调用次数？

- 添加 `include` 列表，让 OCR 不检查不需要的文件。
- 用 `--effort low` 将主循环缩减为一轮。
- 如果你的账户使用峰值定价，降低 `--concurrency`。
- 传入 `--background`：更完整的源码上下文有时能让模型无需额外的 `file_read` /
  `code_search` 调用即可完成工作。

## 隐私与安全

### OCR 会把我的代码发送到某处吗？

OCR 将你的 **diff**（以及工具读取的可选片段）发送到你配置的 LLM 端点。没有其他数据
离开本机：会话 JSONL 和规则文件仅存储在本地。

如果启用遥测，