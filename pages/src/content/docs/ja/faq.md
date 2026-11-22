---
title: FAQ
sidebar:
  order: 14
---

汇总了常见错误、意外行为以及"这是设计如此吗？"的疑问。如果这里找不到你的问题，请附上执行步骤和完整输出，创建 [GitHub issue](https://github.com/alibaba/open-code-review/issues)。

## 配置与启动

### `no valid LLM endpoint configured`

```
no valid LLM endpoint configured; one of OCR_LLM_URL/OCR_LLM_TOKEN/OCR_LLM_MODEL,
~/.opencodereview/config.json, or ANTHROPIC_BASE_URL/ANTHROPIC_AUTH_TOKEN/
ANTHROPIC_MODEL must be set
```

OCR 走完了整个端点解析链（[配置](../configuration/#复用现有环境变量)），但没找到完整的 `(URL, token, model)` 三元组。请执行以下任一操作：

- 运行 `ocr config set llm.url …` / `llm.auth_token …` / `llm.model …` 填充 `~/.opencodereview/config.json`，**或者**
- 导出 `OCR_LLM_URL` / `OCR_LLM_TOKEN` / `OCR_LLM_MODEL`，**或者**
- 如果已在用 Claude Code，导出 `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_MODEL`。

然后用 `ocr llm test` 验证连通性，再重试审查。

### `ocr llm test` 显示了错误的来源

OCR 采用**第一个**完整三元组，而非**最后一个**。因此，如果配置文件中三个 llm.* key 都已齐全，环境变量会被忽略。要启用环境变量，请删除配置 key（删除文件或手动 unset），或用 `ocr config set` 切换到新值。

### `ocr llm test` 返回 401 / 403

token 缺少 scope、已过期，或与提供商不匹配。Anthropic 和 OpenAI 使用不同的 auth header 和 URL 格式——请确认 `llm.use_anthropic` 与目标 URL 一致。

- Anthropic：URL 以 `/v1/messages` 结尾，`use_anthropic=true`。
- OpenAI / OpenAI 兼容：URL 以 `/v1/chat/completions` 结尾，`use_anthropic=false`。

### `not a git repository`

`ocr review` 对当前目录执行 `git diff`（以及对未跟踪文件执行 `git ls-files`）。不在 Git 工作树内时会提前退出。请 `cd` 到仓库，或传入 `--repo /path/to/repo`。

### "No tool calls parsed"（本地模型 / Ollama）

```
[ocr] No tool calls parsed for src/foo.go, retrying...
[ocr] Max tool requests reached for src/foo.go.
```

如果所有审查都在 `No tool calls parsed` 重试中循环，最终以 "Max tool requests reached" 和 0 条评论结束，问题在模型而非配置。OCR 的整个审查由工具调用驱动，因此**模型必须支持原生工具调用（function calling）**。只在文本输出（或 `<think>` 块内）*谈论*工具调用的模型，无论怎么调 prompt 都无法在 OCR 中工作——`deepseek-r1` 是常见例子。支持原生工具调用的模型如 `qwen3` 可正常工作。使用 Ollama 时，请选择带 tools 支持标签的模型：<https://ollama.com/search?c=tools>。

不经 OCR 直接验证本地模型：

```bash
curl http://127.0.0.1:11434/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "qwen3:32b",
  "messages": [{"role": "user", "content": "The code below has a bug, use the report_bug tool to report it.\n\nfunc add(a, b int) int {\n  return a - b\n}"}],
  "tools": [{"type": "function", "function": {"name": "report_bug", "description": "Report a bug in the code",
    "parameters": {"type": "object", "properties": {"line": {"type": "integer"}, "description": {"type": "string"}}, "required": ["description"]}}}]
}'
```

合格：响应包含指向 `report_bug` 的结构化 `tool_calls` 数组。不合格："调用"以文本形式出现在 `content` 中。

如果模型*支持*工具但本地硬件响应慢，请改为调高 LLM 超时——参见[超时](../configuration/#timeouts)。

## 过滤与规则

### 文件未被审查

运行 `ocr review --preview`（无 LLM 成本）。输出会显示每个候选文件被保留或丢弃的**原因**。`vendor/` 或 `node_modules/` 等 provider 目录下的文件在终端中会合并为一行。`ocr review --preview --format json` 仍会列出所有条目。

```
src/foo.go              modified
src/foo_test.go         modified  (excluded: user_exclude)
imgs/logo.png           binary    (excluded: unsupported_ext)
3 file(s) in provider directories (node_modules/) — not reviewable
```

这些排除原因对应[文件过滤](../review-rules/#how-files-are-filtered)的各道关卡。

| 原因 | 修复方法 |
|---|---|
| `binary` | 无需处理——二进制文件没有可审查的文本。 |
| `user_exclude` | 从你的 `exclude` 列表中删除该模式。 |
| `unsupported_ext` | 将扩展名加入 `include` 列表以绕过白名单关卡。 |
| `default_path` | 将文件加入 `include`——覆盖内置的测试文件排除模式。 |
| `provider_directory` | 无需处理。`vendor/` 或 `node_modules/` 等 provider 目录即使匹配 `include` 也不会被审查。 |
| `deleted` | 无需处理——没有可审查的新内容。 |
| `too_large` | 仅 diff 就超过 `max_tokens` 的 80%。调高 `--max-tokens`（或保存的 `max_tokens`），或将改动拆分为更小的提交。 |

### 自定义规则未触发

运行 `ocr rules check <file-path>`。它会显示所有匹配的**层级**和 **glob 模式**。

```
File: src/api/UserHandler.go
Source: Project (.opencodereview/rule.json)
Pattern: src/api/**/*.go
Rule: …
```

如果层级不对（期望项目规则却显示 "System built-in" 等），多半是**声明顺序**问题——第一个匹配的模式生效。请将更具体的规则在 `rules` 数组中前移，或修正 glob。

### 花括号展开不生效

`bmatcuk/doublestar/v4` 支持 `{ts,tsx}` 花括号。若不匹配，请检查多余空格——`{ts, tsx}` 中的空格会导致 `tsx` 静默不匹配。

## 审查

### 某文件 0 条评论——真的审查了吗？

打开[会话查看器](../viewer/)（`ocr viewer`），找到会话，查看该文件的 `main_task` 泳道。

- 有工具调用 + 以 `task_done` 结束 → 干净的审查。
- 有工具调用 + 循环中途结束 → 查找错误卡片。
- 完全没有 `main_task` 卡片 → 文件在审查前被过滤了。参见上文的[过滤与规则](#过滤与规则)。

### 评论的 `start_line: 0` 和 `end_line: 0`

OCR 无法将评论锚定到 diff 中的精确行。常见原因有两个：

- 模型没有原样复制 diff 中的 `existing_code`，而是改写了。虽然已指示模型不要这样做，但偶尔仍会发生。
- diff 格式异常（CRLF、tab/空格混用），导致滑动窗口匹配失败。

评论本身是真实的——只是没有自动定位。大多数 agent 集成（SKILL、Claude Code plugin）会读取 `existing_code` 字段并在文件中自行定位。

### Token threshold exceeded

```
[ocr] WARNING: prompt tokens (94000) exceed 80% of max_tokens(200000) for src/big.sql
```

该文件的初始 prompt（规则 + diff + change-files 列表）在模型响应之前就已超过 `MAX_TOKENS` 的 80%（review 默认为 `200000`，`ocr scan` 使用更小的 `58888`）。OCR 会跳过该文件继续——JSON 模式下也会显示在 `warnings` 中。

注意 `MAX_TOKENS` 只限制**提示**。模型输出上限由另一个 `MAX_COMPLETION_TOKENS = 16384` 控制，因此调高 `--max-tokens` 不会扩大输出预算。

缓解措施：

- 如果是自动生成的文件，将其加入 `exclude` 列表。
- 将大型重构拆分为更小的提交。
- 对一系列小提交，使用 `--commit` 模式而非批量工作区模式审查。

### 文件很小但 plan 阶段耗时很长

先运行 `ocr review --preview`。plan 阶段在以下任一条件成立时执行：组内任一文件的 `lines.changed` 达到 `PLAN_MODE_LINE_THRESHOLD`（默认 **50**），或组内包含 2 个以上文件且总变更行数达到 `PLAN_MODE_GROUP_LINE_THRESHOLD`（默认 **100**）。这是有意为之——大 diff 能从 plan 中受益。更小的 diff 可能低于两个阈值。审查的规划处理由内置模板控制而非工具覆盖，修改需编辑源码并重新构建。

### "Max tool requests reached"

```
[ocr] Max tool requests reached for src/foo.go.
```

模型用完了 100 次（`MAX_TOOL_REQUEST_TIMES`）工具调用却没有调用 `task_done`。截至该时点发出的评论仍会被收集和渲染。如果大多数文件都这样，通常原因是：

- 模型不擅长遵循"完成后调用 `task_done`"的指令。请切换到更强的模型（如 Claude Opus）。
- 某个工具持续报错，模型不断重试。请检查会话 JSONL——如果同一工具结果反复出现，就是原因。
- 文件确实很大或上下文很重，100 次不够。用 `--max-tools <n>` 调高（例如 `--max-tools 150`）。解析后的正值会直接作为上限。1〜49 会被提升为 `50`，`0`（默认）使用模板默认值 `100`。
- 模型完全不支持原生工具调用（本地模型常见）——参见 ["No tool calls parsed"（本地模型 / Ollama）](#no-tool-calls-parsed本地模型--ollama)。

### 部分子 agent 失败时，为什么以非零退出？

OCR 隔离每个组的失败，并继续发布已完成组的结果。但如果有 timeout、provider 错误、配置不当等运维失败，即使其他组成功，命令也会以非零退出，以便 CI 检测到不完整的覆盖率。仅因配置的预算限制导致的部分审查仍以成功退出。请通过 JSON 模式的 `manifest.coverage.failed` 和 `warnings`，或文本摘要查看失败的组及能否恢复。

### CI 中运行比本地慢得多

常见原因有两个：

- **模型速率限制**——触发限制时，LLM client 会退避重试。请降低 `--concurrency`（如 `4`）以避免一开始就触限。
- **冷缓存**——如果提供商支持 prompt 缓存，部署后的首次运行无法受益。同一窗口内的后续运行会更快。

## 输出与集成

### `--audience agent` 仍有进度行

确认你看到的不是 **stderr**。进度消息有时输出到 stderr（警告、错误）。`--audience agent` 保证的是*对解析器友好*的干净 stdout——要屏蔽一切请重定向：`ocr review --audience agent 2>/dev/null`。

### JSON 输出为 `{ "files_reviewed": 0, "comments": [] }`

没有可审查的文件。`files_reviewed` 不在顶层，而在 `summary` 下，此路径下为 `0`。顶层的 `[]` 是 `comments`。同一对象还包含 `"status": "skipped"`、`"message": "Review skipped: no items were selected."`，以及 `terminal_state` 为 `"skipped"`、`coverage.selected` 为空的 `manifest`。选择阶段被排除的文件列在 `coverage.excluded` 中，各带 `exclude_reason`。

如果审查了文件但没有发现，也会返回**带 `comments: []` 的 JSON 对象**。`summary.files_reviewed` 为实际审查的文件数，`status` 为 `"complete"`，`message` 为 `"Review complete: 0 finding(s) across N selected item(s)."`。不同运行省略的可选顶层字段可能不同，因此不要用对象形状或特定可选字段的有无来区分两者。有 manifest 的 review 输出请使用 `summary.files_reviewed` 或 `manifest.terminal_state`。不过，调用方还需处理下文所述的 manifest-less 路径中 `summary` 和 `manifest` 均不存在的情况。`review --format json` 始终只向 stdout 写出一个 JSON 对象，不会是裸数组。

`terminal_state: "complete"` 表示所选集合的审查已完成，并不意味着所有变更文件都被审查。选择阶段被排除的文件（不支持的扩展名、路径规则、内置敏感路径、二进制、已删除，或超过单文件大小上限）会连同与 `--preview` 相同的 `exclude_reason` 记录在 `manifest.coverage.excluded` 中，不会使运行变为 `partial`。此列表仅涵盖到达选择阶段的文件。diff provider 在此之前排除的不包含在内，具体包括：`vendor/` 或 `node_modules/` 等始终跳过的目录内的变更、被 `.gitignore` 忽略的未跟踪文件，以及单提交或提交范围审查中所有匹配 `.gitignore` 的变更。

manifest-less 的无文件路径更简单，会省略 `summary` 和 `manifest`，但仍包含 `"status": "skipped"`、`"message": "No supported files changed."`、`"comments": []`，且始终包含 `tool_calls`。`ocr scan` 始终为 manifest-less，满足无文件条件时使用此路径。`ocr review` 在 manifest 构建失败且满足无文件条件时也可能进入同一路径。可能还包含 `llm`、`trace_id` 等可选元数据。

### 会话 JSONL 在哪里？

```
~/.opencodereview/sessions/<path-encoded-repo-path>/<session-id>.jsonl
```

仓库路径通过将 `/` 和 `\` 替换为 `-`、`:` 替换为 `_` 来编码（例如 `/Users/foo/my-repo` → `Users-foo-my-repo`）。可用 `ocr viewer` 浏览会话。删除此目录会清除历史。OCR 会在下次运行时重新生成编码路径。

## 性能与成本

### 如何知道各 token 花了多少？

启用遥测：

```bash
ocr config set telemetry.enabled true
ocr config set telemetry.exporter console
ocr review
```

主审查循环的 LLM 调用会生成 `llm.request` span，同时记录为 metric。请关注 `ocr.llm.tokens_used`（counter，按 `model` + `type` 标注）、`ocr.llm.requests_total`（counter，按 `model` + `status` 标注）、`ocr.llm.request_duration_seconds`（histogram，按 `model` 标注）。console exporter 会内联输出这些聚合。如需仪表盘，请切换到 OTLP exporter 发送到 metrics 基础设施——参见[遥测](../telemetry/)。

### 为什么我的审查这么贵？

常见因素：

- 文件达到 50 行以上（或多文件组总计 100 行以上）时会启动 plan 阶段。这为每组增加一次 LLM 调用，因此降低成本应**调高**阈值。调低会让更多组经过 plan，反而更贵。两个阈值在 `0` 时行为不同：`PLAN_MODE_LINE_THRESHOLD` 为 `0` 或以下时*始终 plan*，这是最贵的配置；而 `PLAN_MODE_GROUP_LINE_THRESHOLD` 为 `0` 会禁用组侧关卡。此配置下能省去 plan 调用的，仅限原本只由组侧关卡触发的情况。触发条件参见上文"文件很小但 plan 阶段耗时很长"。
- 主循环默认执行 2 轮（`medium` 预设）。用 `--effort low` 减为 1 轮可将审查成本大约减半。`--effort high`（3 轮）提高召回但更贵。
- `MAX_TOOL_REQUEST_TIMES = 100` 相当宽松。用尽轮次的模型会产生比 3 轮结束的模型更长的（token 更多的）对话。更强的模型往往更快结束。反之，为应对 "max tool requests reached" 而调高 `--max-tools` 时，请预计每文件成本大致线性增长。
- 内存压缩本身也是一次 LLM 调用。长 subtask 除审查轮次外，还要支付压缩轮次的费用。

### 如何减少 LLM 调用？

- 添加 `include` 列表，避免审查 OCR 不关心的文件。
- 用 `--effort low` 将主循环减为 1 轮。
- 如果账户有 burst-mode 计费，降低 `--concurrency`。
- 传入 `--background`——有足够的预上下文时，模型有时可无需 `file_read` / `code_search` 往返即可完成。

## 隐私与安全

### OCR 会把我的代码发送到某处吗？

OCR 将你的 **diff**（以及可选的 read-tool 片段）发送到配置的 LLM 端点。其他任何内容都不会离开你的机器——会话 JSONL 和规则文件仅存在于本地。

启用遥测时，`content_logging` 标志虽已接入配置层，但目前**不控制**任何代码路径——无论此标志值如何，prompt 和响应内容都绝不会导出到 collector。请视为预留项。生产环境请保持 `false`。详情参见[