---
title: 会话查看器
sidebar:
  order: 10
---

`ocr viewer` 是一个小型的内嵌 HTTP 服务器，用于在浏览器中以易于操作的 UI 渲染历史审查会话。
它没有外部依赖——会话直接从 OCR 在每次审查期间写入磁盘的 JSONL 文件中读取。

## 启动

```bash
ocr viewer                  # 绑定 localhost:5483
ocr viewer --addr :3000     # 绑定所有接口的 3000 端口
ocr viewer --addr 0.0.0.0:8080   # 绑定所有接口
```

默认地址是 `localhost:5483`。服务器在前台运行——按 `Ctrl+C` 停止。会话会在每个请求时从
`~/.opencodereview/sessions/` 延迟扫描，因此在另一个终端中运行的审查也会在其
JSONL 文件出现后立即显示。

> **DNS 重绑定防护。** 查看器会将 `Host` 头与回环地址白名单
> （`localhost`、`127.0.0.1`、`::1`）进行匹配。具体的绑定主机
> （如 `--addr 192.168.1.10:5483`）会自动添加，但**通配符**绑定
> （`:3000`、`0.0.0.0`、`::`）不会添加——在这种情况下，从局域网 IP 或主机名访问 UI 会返回
> `forbidden host`。要使通配符绑定可访问，请设置
> `OCR_VIEWER_ALLOWED_HOSTS` 为逗号分隔的允许主机名列表
> （例如：`OCR_VIEWER_ALLOWED_HOSTS=box.local,192.168.1.10`）。

## 三个页面

查看器有三个 URL：

| URL | 显示内容 |
|---|---|
| `/` | 磁盘上拥有会话的所有仓库列表。 |
| `/r/{repo}` | 单个仓库的会话列表。最新的排在最前。 |
| `/r/{repo}/{sessionID}` | 单个会话的完整详情。 |

`{repo}` 是路径编码后的字符串（分隔符 `/` 和 `\` 替换为 `-`，冒号替换为
`_`——与磁盘上的目录命名编码相同）。通常无需手动输入——点击即可跳转。

### `/`——仓库列表

对于每个至少有一个会话的仓库，显示仓库路径、总会话数和最新活动的时间戳。

### `/r/{repo}`——单个仓库的会话列表

对于每个会话，显示：ID（UUID）、分支名（如果 OCR 能检测到）、审查模式、模型、文件数、
耗时、开始时间戳。

### `/r/{repo}/{sessionID}`——会话详情

详情页面最有用。它显示：

1. **头部**——diff 范围、模型、分支、总 token、运行时间。
2. **按文件分组**——每个被审查的文件一个块。在每个文件内，有五个“任务类型”的泳道：

| 任务类型 | 出现条件 |
|---|---|
| `plan_task` | plan 阶段已执行（文件 ≥ `PLAN_MODE_LINE_THRESHOLD`）。 |
| `main_task` | 所有文件。主审查循环。 |
| `review_filter_task` | 对该文件执行了审查后评论过滤处理。 |
| `memory_compression_task` | active+compress 区域超过预算的 60% / 80%。 |
| `re_location_task` | 某个 `code_comment` 无法锚定，并执行了回退的重新定位。 |

每个泳道是**任务卡片**的水平条带——每次 LLM 往返对应一张卡片。卡片按任务类型着色，
可以一目了然地看出哪个阶段主导了执行。

## 任务卡片的内容

点击任务卡片可展开。每张卡片包含：

- 一行**头部**——请求编号、模型徽章、token 徽章（`P:` prompt / `C:` completion，
  如果存在也显示 `CR:` / `CW:` 缓存读写）、耗时徽章，以及如果该轮失败则显示错误徽章。
- **响应**——原始的助手响应。包括推理 / `thinking` 块。
- **工具调用**——每次工具调用及其参数 + 返回的结果（可折叠）。

发送给模型的完整消息列表和范围内的工具定义**不会**渲染在卡片 UI 中。如果需要，请直接
检查 JSONL 转录文件（每个 `llm_request` 记录的 `messages` 字段）。

## 使用场景

查看器设计用于三种工作流程：

### “为什么模型会这样说？”

打开终端输出中的评论，在查看器中找到该文件，然后沿着其 `main_task` 泳道向下追踪。
在**工具调用**中，包含你所关心的 `code_comment` 的卡片正是产生它的那一轮。卡片的
响应中会显示模型的推理。要精确了解发送给模型的 prompt + 上下文，请在 JSONL 转录文件中
打开该请求编号的 `llm_request` 记录（其 `messages` 字段）。

### “为什么这个文件保持沉默？”

**没有评论**的文件只有在模型*主动*调用 `task_done` 时才算是成功的审查。如果泳道中有
工具调用但没有 `code_comment`，那是模型主动做出的干净审查。如果泳道以错误卡片结束，那
是伪装成沉默的失败——应将其视为警告。

### “压缩保留了 / 丢弃了什么？”

`memory_compression_task` 泳道显示每一轮压缩。在其中，响应面板包含结果摘要，
从被压缩的 compress 区域渲染出的 XML 位于该轮的 `llm_request` 的 `messages`（在 JSONL 转录文件中）。
这对于调查“模型忘记了之前的上下文”的反馈很有用——你可以检查压缩是否丢弃了相关细节。

## 磁盘存储布局

查看器读取：

```
~/.opencodereview/sessions/
└── <路径编码的仓库路径>/
    └── <会话-id>.jsonl
```

JSONL 文件中的每一行是一个事件：

```json
{"type": "llm_request", "filePath": "src/foo.go", "taskType": "main_task", "request_no": 1, "messages": [{"role": "user", "content": "Review this diff…"}], "timestamp": "2026-06-02T10:15:23Z"}
{"type": "llm_response", "filePath": "src/foo.go", "taskType": "main_task", "model": "claude-sonnet-4-6", "content": "Found 2 issues…", "duration_ms": 8421, "usage": {"prompt_tokens": 12450, "completion_tokens": 320}}
{"type": "tool_call", "filePath": "src/foo.go", "tool_name": "file_read", "arguments": "{\"file_path\":\"src/foo.go\",\"start_line\":1,\"end_line\":50}", "result": "File: src/foo.go (Total lines: 220)\nIS_TRUNCATED: false\nLINE_RANGE: 1-50\n1|package foo…", "ok": true, "duration_ms": 14}
```

行是追加写入（append-only）的——不完整的 JSONL 意味着会话在运行中被中断，查看器会渲染
已写入的内容。

要释放磁盘空间，请删除整个会话文件。查看器会在下一个请求时重建索引。

## 隐私

JSONL 转录文件包含发送给 LLM 和从 LLM 接收的**所有**内容，包括 diff 中的任何代码。这些内容
完全存在于你机器的 `~/.opencodereview/` 中。OCR 不会将它们上传到任何地方。

如果审查包含你不想长期保存的代码，你可以：

- 定期删除会话文件，或者
- 在 CI 中将 `--audience agent --format json` 的输出重定向到临时管道，并使用临时的
  `HOME` 运行，以确保 JSONL 不会被持久化。

OpenTelemetry exporter 是另一回事——关于如何避免将 prompt 内容包含在导出的 trace 中，请参阅
[遥测](../telemetry/)。

## 查看器不适用的场景

- 对于程序化后处理（CI、仪表板），请使用 `ocr review --format json --audience agent`。
  查看器是面向人类的渲染，而非面向机器。
- 如果需要跨多个会话进行 grep，请直接对 JSONL 文件使用 `jq`。UI 目前还没有搜索框。

## 相关主题

- [架构](../architecture/)——这五种任务类型在内部实际做什么。
- [工具](../tools/)——你在 `main_task` 卡片中看到的工具调用。