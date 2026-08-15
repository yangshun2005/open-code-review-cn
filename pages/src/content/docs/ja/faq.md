---
title: 常见问题
sidebar:
  order: 14
---

这里汇总了常见的错误、意外行为以及“这是设计如此吗？”的疑问。如果您在这里找不到您的问题，请附上执行步骤和完整输出，在 [GitHub Issue](https://github.com/alibaba/open-code-review/issues) 中创建。

## 配置与启动

### `no valid LLM endpoint configured`

```
no valid LLM endpoint configured; one of OCR_LLM_URL/OCR_LLM_TOKEN/OCR_LLM_MODEL,
~/.opencodereview/config.json, or ANTHROPIC_BASE_URL/ANTHROPIC_AUTH_TOKEN/
ANTHROPIC_MODEL must be set
```

OCR 遍历了整个端点解析链（[配置](../configuration/#reuse-existing-environment-variables)），但未能找到完整的 `(URL, token, model)` 三元组。请执行以下任一操作：

- 运行 `ocr config set llm.url …` / `llm.auth_token …` / `llm.model …` 来填充 `~/.opencodereview/config.json`，**或者**
- 导出 `OCR_LLM_URL` / `OCR_LLM_TOKEN` / `OCR_LLM_MODEL`，**或者**
- 如果您已经在使用 Claude Code，请导出 `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_MODEL`。

之后，运行 `ocr llm test` 验证连接性，然后重试审查。

### `ocr llm test` 显示错误的来源

OCR 采用**第一个**完整的配置三元组，而不是**最后一个**。因此，如果配置文件中已经存在所有三个 `llm.*` 键，环境变量将被忽略。要启用环境变量，请删除配置键（删除文件或手动取消设置），或使用 `ocr config set` 切换到新值。

### `ocr llm test` 返回 401 / 403

Token 可能缺少必要的权限范围、已过期，或者提供商不匹配。Anthropic 和 OpenAI 使用不同的认证头和 URL 格式——请确保 `llm.use_anthropic` 与目标 URL 匹配。

- Anthropic：URL 以 `/v1/messages` 结尾，且 `use_anthropic=true`。
- OpenAI / OpenAI 兼容：URL 以 `/v1/chat/completions` 结尾，且 `use_anthropic=false`。

### `not a git repository`

`ocr review` 会对当前目录执行 `git diff`（以及针对未跟踪文件的 `git ls-files`）。如果您不在 Git 工作树内，它会提前退出。请 `cd` 到仓库目录，或传递 `--repo /path/to/repo` 参数。

### "No tool calls parsed"（本地模型 / Ollama）

```
[ocr] No tool calls parsed for src/foo.go, retrying...
[ocr] Max tool requests reached for src/foo.go.
```

如果所有审查都陷入 `No tool calls parsed` 的重试循环，并以 "Max tool requests reached" 和 0 条评论结束，那么问题不在于配置，而在于模型。OCR 的整个审查过程由工具调用驱动，因此**模型必须支持原生工具调用（function calling）**。那些仅在文本输出（或 `<think>` 块内）中*描述*工具调用的模型，无论您如何调整提示词，都无法在 OCR 中工作——`deepseek-r1` 就是一个常见例子。像 `qwen3` 这样具有原生工具支持的模型则可以正常工作。对于 Ollama，请选择带有 tools 支持标签的模型：<https://ollama.com/search?c=tools>。

要绕过 OCR 直接验证本地模型，请运行：

```bash
curl http://127.0.0.1:11434/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "qwen3:32b",
  "messages": [{"role": "user", "content": "The code below has a bug, use the report_bug tool to report it.\n\nfunc add(a, b int) int {\n  return a - b\n}"}],
  "tools": [{"type": "function", "function": {"name": "report_bug", "description": "Report a bug in the code",
    "parameters": {"type": "object", "properties": {"line": {"type": "integer"}, "description": {"type": "string"}}, "required": ["description"]}}}]
}'
```

通过：响应中包含指向 `report_bug` 的结构化 `tool_calls` 数组。失败：“调用”会作为 `content` 中的文本出现。

如果模型*支持*工具调用，但在本地硬件上响应缓慢，请考虑提高 LLM 超时时间——参见[超时](../configuration/#timeouts)。

## 过滤与规则

### 文件未被审查

请运行 `ocr review --preview`（无 LLM 成本）。输出会列出每个候选文件及其被保留或丢弃的**原因**。

```
src/foo.go              modified
src/foo_test.go         modified  (excluded: user_exclude)
node_modules/lib.js     added     (excluded: default_path)
imgs/logo.png           binary    (excluded: unsupported_ext)
```

五种排除原因对应[文件过滤](../review-rules/#how-files-are-filtered)中的各个关卡。

| 原因 | 解决方法 |
|---|---|
| `binary` | 无需处理——二进制文件没有可审查的文本。 |
| `user_exclude` | 请从您的 `exclude` 列表中移除该模式。 |
| `unsupported_ext` | 将扩展名添加到 `include` 列表以绕过白名单关卡。 |
| `default_path` | 将文件添加到 `include`——这会覆盖内置的测试文件排除模式。 |
| `deleted` | 无需处理——没有新的内容需要审查。 |

### 自定义规则未触发

请运行 `ocr rules check <file-path>`。它会显示所有匹配的**层级**和 **glob 模式**。

```
File: src/api/UserHandler.go
Source: Project (.opencodereview/rule.json)
Pattern: src/api/**/*.go
Rule: …
```

如果层级不正确（例如，您期望项目规则但显示为“System built-in”），这通常是**声明顺序**的问题——最先匹配的模式生效。请将更具体的规则移到 `rules` 数组的前面，或修正 glob。

### 花括号展开不起作用

`bmatcuk/doublestar/v4` 支持 `{ts,tsx}` 这样的花括号。如果不匹配，请检查是否有多余的空格——例如 `{ts, tsx}` 中的空格会导致 `tsx` 静默不匹配。

## 审查

### 某个文件有 0 条评论——它真的被审查了吗？

打开[会话查看器](../viewer/)（`ocr viewer`），找到该会话，并检查该文件的 `main_task` 轨道。

- 有工具调用且以 `task_done` 结束 → 审查干净完成。
- 有工具调用但在循环中结束 → 查找错误卡片。
- 完全没有 `main_task` 卡片 → 文件在审查前已被过滤。请参阅上面的[过滤与规则](#filtering--rules)。

### 评论的 `start_line: 0` 和 `end_line: 0`

OCR 无法将评论锚定到 diff 中的精确行。常见原因有两个：

- 模型没有直接从 diff 复制 `existing_code`，而是重写了它。虽然已指示模型不要这样做，但偶尔会发生。
- diff 格式异常（CRLF、制表符/空格混用），破坏了滑动窗口匹配。

评论本身是真实的——只是没有自动定位。大多数代理集成（SKILL、Claude Code 插件）会读取 `existing_code` 字段并在文件内自行定位。

### Token threshold exceeded

```
[ocr] WARNING: prompt tokens (94000) exceed 80% of max_tokens(58888) for src/big.sql
```

该文件的初始提示词（规则 + diff + change-files 列表）在模型响应前已超过 `MAX_TOKENS = 58888` 的 80%。OCR 会跳过该文件并继续——在 JSON 模式下也会显示在 `warnings` 中。

缓解措施：

- 如果是自动生成的文件，请将其添加到 `exclude` 列表。
- 将大型重构拆分为更小的提交。
- 对于一系列小提交，请使用 `--commit` 模式审查，而不是批量工作区模式。

### 文件很小但 plan 阶段耗时很长

首先运行 `ocr review --preview`。当文件的 `lines.changed` 超过 `PLAN_MODE_LINE_THRESHOLD`（默认 **50**）时，会执行 plan 阶段。这是有意为之——大型 diff 能从 plan 中受益。要在单次审查中跳过它，请使用更小的 diff 运行，或临时编辑内置模板（高级操作，需要 `--tools` 覆盖）。

### "Max tool requests reached"

```
[ocr] Max tool requests reached for src/foo.go.
```

模型在 30（`MAX_TOOL_REQUEST_TIMES`）次工具调用内未调用 `task_done`。此时已发出的评论仍会被收集并渲染。如果大多数文件都出现此情况，通常原因如下：

- 模型难以遵循“完成后调用 `task_done`”的指令。请切换到更强大的模型（如 Claude Opus）。
- 某个工具持续报错，模型不断重试。请检查会话 JSONL——如果相同的工具结果重复出现，那就是原因。
- 文件确实很大或上下文很重，30 次不够用。请使用 `--max-tools <n>` 调整（例如 `--max-tools 40` 增加，`--max-tools 15` 减少）。1-9 会被提升到 10。`0`（默认）使用模板默认值 30。
- 模型完全不支持原生工具调用（本地模型常见）——请参阅["No tool calls parsed"（本地模型 / Ollama）](#no-tool-calls-parsed-ollama)。

### 部分子代理失败，但执行以 0 退出

这是有意为之。OCR 隔离了每个文件的失败，防止一个有问题的文件拖垮整个 20 个文件的审查。只要有*一个*成功，聚合退出码就是 `0`。仅当完全失败（成功子代理为零）时才以非零退出。要查看哪些文件失败，请检查 JSON 模式下的 `warnings` 数组或文本模式下的 stderr。

### CI 中的运行比本地慢得多

常见原因有两个：

- **模型速率限制**——一旦触发限制，LLM 客户端会退避重试。请从一开始就降低 `--concurrency`（例如 `4`）以避免触发限制。
- **冷缓存**——如果提供商支持提示词缓存，部署后的首次运行无法受益。同一窗口内的后续运行会更快。

## 输出与集成

### `--audience agent` 下仍有进度行

请确认您查看的不是 **stderr**。进度消息有时会输出到 stderr（警告、错误）。`--audience agent` 保证的干净 stdout 是*解析器友好*的——要完全屏蔽，请重定向：`ocr review --audience agent 2>/dev/null`。

### JSON 输出为 `{ "files_reviewed": 0, "comments": [] }`

工作区中没有目标文件。这是有意为之——这种明确的形式让调用方能够区分“没有可审查的内容”和“审查过的文件没有评论”。评论为零的正常审查会返回常规的空数组 `[]`。

### 会话 JSONL 在哪里？

```
~/.opencodereview/sessions/<path-encoded-repo-path>/<session-id>.jsonl
```

仓库路径通过将 `/` 和 `\` 替换为 `-`，将 `:` 替换为 `_` 进行编码（例如 `/Users/foo/my-repo` → `Users-foo-my-repo`）。您可以使用 `ocr viewer` 浏览会话。删除此目录将清除历史记录。OCR 会在下次运行时重新生成编码路径。

## 性能与成本

### 如何知道每个 token 花费了多少？

启用遥测。

```bash
ocr config set telemetry.enabled true
ocr config set telemetry.exporter console
ocr review
```

LLM 调用没有独立的 span——它们作为指标记录。请关注 `ocr.llm.tokens_used`（counter，按 `model` + `type` 标记）、`ocr.llm.requests_total`（counter，按 `model` + `status` 标记）和 `ocr.llm.request_duration_seconds`（histogram，按 `model` 标记）。console exporter 会内联输出这些聚合。如果需要仪表盘，请切换到 OTLP exporter 并发送到您的指标基础设施——参见[遥测](../telemetry/)。

### 为什么我的审查这么贵？

常见因素：

- 当文件超过 50 行时，plan 阶段会启动。这为每个文件增加了一次 LLM 调用。降低阈值可以减少成本，提高阈值可以加快小型 PR 的速度。
- `MAX_TOOL_REQUEST_TIMES = 30` 相当宽松。用尽轮次的模型会产生比 3 轮就结束的模型更长（更多 token）的对话。更强大的模型往往更快完成。相反，为了处理“max tool requests reached”而提高 `--max-tools`，文件成本大致会线性增加。
- 内存压缩本身也是一次 LLM 调用。长时间的子任务除了审查轮次外，还需要支付压缩轮次的费用。

### 如何减少 LLM 调用？

- 添加 `include` 列表，避免审查 OCR 不关心的文件。
- 如果您的账户有突发模式计费，请降低 `--concurrency`。
- 传递 `--background`——如果前置上下文足够，模型有时可以在没有 `file_read` / `code_search` 往返的情况下完成。

## 隐私与安全

### OCR 会把我的代码发送到别处吗？

OCR 会将您的 **diff**（以及任何读取工具片段）发送到您配置的 LLM 端点。除此之外，不会有任何内容离开您的机器——会话 JSONL 和规则文件仅存在于本地。

如果您启用了遥测，`content_logging` 标志已连接到配置层，但目前**不控制**任何代码路径——无论此标志的值如何，提示词和响应的内容绝不会导出到收集器。请将其视为保留项。在生产环境中请保持为 `false`。更多详情请参阅[遥测](../telemetry/#content-logging)。

### 在发送给 LLM 之前可以屏蔽 secret 吗？

这不是内置功能。推荐的工作流程：

1. 不要将 secret 提交到仓库（通用规则）。
2. 将已知包含敏感信息的文件添加到 `exclude`。
3. 使用 `git diff --no-textconv` 过滤器或 pre-commit 进行屏蔽，确保 secret 不会进入 diff。

“屏蔽规则”功能已在路线图中。请查看 [Issue 跟踪器](https://github.com/alibaba/open-code-review/issues)。

## 其他

### 变更日志在哪里？

[GitHub Releases](https://github.com/alibaba/open-code-review/releases) —— 每个 release 都附有从 Conventional Commits 生成的说明。

### OCR 支持 Git 以外的 VCS 吗？

不支持。diff provider 通过 shell 调用 `git`。支持 SVN / Mercurial 等需要新的 provider。Hg 支持的 issue 已在[此处](https://github.com/alibaba/open-code-review/issues)开启。

### 为什么二进制文件叫 `opencodereview` 而 CLI 叫 `ocr`？

release 中分发的静态二进制文件使用项目名称（`opencodereview`）。NPM wrapper 为方便起见安装为 `ocr`。从源码构建会得到 `dist/opencodereview`——请将其复制为 `$PATH` 上的 `ocr`。

### 如何卸载？

```bash
npm uninstall -g @alibaba-group/open-code-review        # NPM 安装
sudo rm /usr/local/bin/ocr                              # 二进制安装
rm -rf ~/.opencodereview                                # 所有状态
```

OCR 不会在 `~/.opencodereview` 之外写入任何内容（NPM 下载的二进制文件除外）。因此，删除此目录将清除历史记录、配置和用户级规则。

## 相关项目

- [配置](../configuration/)——LLM 端点解析和配置键。
- [审查规则](../review-rules/)——文件过滤器和规则解析链。
- [会话查看器](../viewer/)——查看过去的审查会话。
- [遥测](../telemetry/)——token 使用量和 LLM 指标。