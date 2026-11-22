---
title: 会话查看器
sidebar:
  order: 10
---

`ocr viewer` 是一个小型内置 HTTP 服务器，用浏览器中易用的 UI 渲染历史审查会话。
无外部依赖——会话直接读取自 OCR 在每次审查期间写入磁盘的 JSONL 文件。

## 启动

```bash
ocr viewer                       # start and open the browser
ocr viewer --addr :3000          # bind to all interfaces on port 3000
ocr viewer --addr 0.0.0.0:8080   # bind on all interfaces
ocr viewer --open=never          # just print the URL
ocr viewer --open=always         # force it when auto declines (piped output, WSL)
```

默认地址为 `localhost:5483`。服务器在前台运行——按 `Ctrl+C` 停止。会话在每次请求时从
`~/.opencodereview/sessions/` 延迟扫描，因此在另一个终端中运行的审查，其
JSONL 文件一出现就会显示。

> **DNS 重绑定防护。** 查看器将 `Host` 头与回环白名单
> （`localhost`、`127.0.0.1`、`::1`）进行比对。具体的绑定主机
> （如 `--addr 192.168.1.10:5483`）会自动加入，但**通配符**绑定
> （`:3000`、`0.0.0.0`、`::`）不会加入——此时通过 LAN IP 或主机名访问 UI 会返回
> `forbidden host`。要让通配符绑定可访问，请在
> `OCR_VIEWER_ALLOWED_HOSTS` 中设置逗号分隔的允许主机名列表
> （例如：`OCR_VIEWER_ALLOWED_HOSTS=box.local,192.168.1.10`）。

## 打开浏览器

服务器开始监听后，`ocr viewer` 会在默认浏览器中打开其 URL。
此行为由 `--open` 控制，取值与全局 `--color` 相同的三个值。

| 值 | 行为 |
|---|---|
| `auto`（默认） | 仅在预计可行时打开——见下文。 |
| `always` | 无条件打开。用于 `auto` 跳过但实际能到达浏览器的情况——如输出被管道传输、无显示环境的 WSL 等。 |
| `never` | 仅显示 URL，不做其他任何事。 |

在 `auto` 模式下，以下情况**不会**打开浏览器：

- stdout 不是终端——输出被管道传输或重定向
- 设置了 `SSH_CONNECTION`，**且**未转发显示
  ——远程主机上没有可打开的目标。`ssh -X` / `ssh -Y` 会设置 `DISPLAY`，
  因此不会被抑制
- Linux 上 `DISPLAY` 和 `WAYLAND_DISPLAY` 均为空——没有显示服务器

原因会附加在 ready 行末尾。有意抑制的自动打开不会看起来像故障。

```
Viewer ready: http://localhost:5483 (browser not opened: no DISPLAY or WAYLAND_DISPLAY)
```

在 Unix 上会先尝试 `$BROWSER`。它是冒号分隔的命令列表，每项要么包含表示
URL 的 `%s` 占位符，要么将 URL 作为末尾参数接收。
否则执行平台默认命令——macOS 为 `open`，Linux 和 BSD 为
`xdg-open`，Windows 为 `rundll32`。打开浏览器失败时仅向 stderr 输出警告，不会致命。无论哪种情况服务器都会继续运行。

## 四个页面

查看器有 4 个 URL：

| URL | 显示内容 |
|---|---|
| `/` | 磁盘上拥有会话的所有仓库列表。 |
| `/r/{repo}` | 单个仓库的会话列表。最新在前。 |
| `/r/{repo}/{sessionID}` | 单个会话的完整详情。 |
| `/r/{repo}/compare` | 同一仓库两个会话的对比。 |

`{repo}` 是路径编码后的字符串（分隔符 `/` 和 `\` 替换为 `-`，冒号替换为
`_`——与磁盘上的目录命名编码相同）。通常无需手动输入——点击即可跳转。

### `/`——仓库列表

对至少拥有 1 个会话的每个仓库，显示仓库路径、总会话数、最新活动时间戳，以及指向会话列表的 `Check` 链接。搜索框可按仓库路径筛选。每页显示 10 个仓库，右下角分页器可翻页。

### `/r/{repo}`——单个仓库的会话列表

每个会话显示：ID（UUID）、分支名（OCR 能检测到时）、审查模式、模型、文件数、
耗时、开始时间戳，以及指向前一个会话的 `Check` 链接。每页显示 10 条，
右下角分页器可翻页。

### `/r/{repo}/{sessionID}`——会话详情

详情页最有用。显示：

1. **头部**——diff 范围、模型、分支、总 token、运行时间。
2. **按文件分组**——每个被审查的**组**对应一个区块。文件在审查前会按语义分组，因此一个区块可能覆盖多个相关文件，其标题为组的文件路径。每个组内有 5 种"任务类型"的泳道：

| 任务类型 | 出现条件 |
|---|---|
| `plan_task` | 执行了 plan 阶段（组内最大文件 ≥ `PLAN_MODE_LINE_THRESHOLD`，或 2 个以上文件合计 ≥ `PLAN_MODE_GROUP_LINE_THRESHOLD`）。 |
| `main_task` | 所有组。主审查循环——每轮审查一趟。 |
| `review_filter_task` | 对该组执行了审查后的评论过滤处理。 |
| `memory_compression_task` | active+compress 区域超过预算的 60 % / 80 %。 |
| `re_location_task` | 某个 `code_comment` 无法锚定，执行了回退的重新定位。 |

每条泳道是**任务卡片**的水平条带——每次 LLM 往返一张。卡片按任务类型着色，
可一眼看出哪个阶段主导了执行。

本页的长列表——**File breakdown**、**Files Reviewed**、**Session Tasks**、
**Conversations**——每页 20 条。能在一页内放下时，分页器保持隐藏。

### `/r/{repo}/compare`——两个会话的对比

以页面形式显示与 `ocr session compare` 输出相同的 4 个分组。
会话列表的 **Action** 列有 `Check` 链接，每行打开与前一（更早）
会话的对比。因此最新行显示自上次运行以来发生了什么变化。最早的行没有对比对象，显示 `-`。

发现的问题分为 4 个分组：

| 分组 | 含义 |
|---|---|
| New | 仅后一次运行报告。 |
| Persisting | 两次运行都报告。 |
| Resolved | 仅前一次运行报告，且后一次运行实际审查了该文件。 |
| Not reviewed | 仅前一次运行报告，后一次运行从未查看该文件。无人复核，因此不视为已解决。 |

页面与 CLI 有一处不同：CLI 省略空分组，而页面始终显示全部 4 个。因为 `Resolved (0)` 本身就是答案，区块悄悄消失会看起来像页面损坏。

每个分组每页显示 20 条发现，能在一页内放下时分页器隐藏。

运行清单之前的旧会话不记录覆盖率，因此其未匹配的发现全部归入 Resolved 而非 Not reviewed。

要对比任意组合，直接编辑查询字符串：
`/r/{repo}/compare?before=<旧会话 id>&after=<新会话 id>`。
两个 id 都必须属于 URL 中的仓库。

若两次运行的审查模式不同，会显示与 `ocr session compare` 相同的警告：可能未查看相同的文件群，因此不能直接对比这些分组。

## 任务卡片的内容

点击任务卡片可展开。每张卡片包含：

- 一行**头部**——请求编号、模型徽章、token 徽章（`P:` prompt / `C:` completion，
  存在时还显示 `CR:` / `CW:` 缓存读写）、耗时徽章，以及该轮失败时的错误徽章。
- **Response**——原始 assistant 响应。也包含推理 / `thinking` 块。
- **Tool calls**——每次工具调用及其参数 + 返回结果（可折叠）。

发送给模型的完整消息列表和范围内的工具定义**不会**在卡片 UI 中渲染。如需查看，请直接
检查 JSONL 转录（每个 `llm_request` 记录的 `messages` 字段）。

## 审查评论

在任务泳道下方，会话页将该审查生成的所有发现按文件分组列为
**评论卡片**。显示评论正文、存在时的现有代码 / 建议代码、严重度 / 类别徽章。
筛选栏的标签可按严重度或类别筛选。评论每页显示
20 条，只有一页时分页器隐藏。更改严重度或类别
筛选会回到第 1 页。标记发现、**Hide marked** 切换、
清除标记，只要该页仍存在就保持当前页。

### 边修复边标记

每张卡片有 3 个按钮——**Fixed** / **Ignored** /
**Clear**——按评论设置标记：

- 标记互斥。设置一个会替换另一个，**Clear** 解除。
  当前状态由卡片上的彩色徽章显示。
- **Hide marked**（默认开启，按浏览器记忆）在处理剩余发现时
  将已标记卡片移出屏幕。工具栏显示标记数和隐藏数，可随时关闭以重新显示全部。
- **Clear all marks** 一次性重置整个会话。

标记是查看器状态，不是审查数据。查看器本身保持只读：

- 标记保存在浏览器的 `localStorage` 中，按会话页存储。
  不会在会话 JSONL 旁写入任何内容，查看器也不提供任何写入
  API。
- 标记属于一个会话**且一个浏览器**。从其他浏览器或
  机器看到的是无标记的会话，清除该站点的浏览器存储会从头开始。
- 重新审查相同更改会创建新会话，从无标记开始。

## 使用场景

查看器针对 3 种工作流设计：

### "模型为什么这么说？"

在终端输出中打开某条评论，在查看器中找到包含该文件的**组**，沿其 `main_task` 泳道向下追踪。
**工具调用**中包含你所关心的 `code_comment` 的卡片，就是产生它的那一轮。卡片的
Response 显示模型的推理。要确切知道发送给模型的 prompt + 上下文，请在 JSONL 转录中
打开该请求编号的 `llm_request` 记录（其 `messages` 字段）。

### "为什么这个文件没有声音？"

**没有评论**的文件，只有在模型*主动*调用 `task_done` 时才是成功的审查。若泳道中
有工具调用但没有 `code_comment`，那是模型主动做出的干净审查。若泳道以错误卡片结束，那是
伪装成沉默的失败——应视为警告。

### "压缩保留 / 丢弃了什么？"

`memory_compression_task` 泳道显示每轮压缩。其中 Response 面板有结果摘要，
从压缩的 compress 区域渲染的 XML 在该轮的 `llm_request` 的 `messages`（JSONL 转录中）。
对调查"模型忘记了之前的上下文"这类反馈有用——可确认压缩是否丢弃了相关细节。

## 磁盘存储布局

查看器读取：

```
~/.opencodereview/sessions/
└── <path-encoded-repo-path>/
    └── <session-id>.jsonl
```

JSONL 文件的每一行是一个事件：

```json
{"type": "llm_request", "filePath": "src/foo.go", "taskType": "main_task", "request_no": 1, "messages": [{"role": "user", "content": "Review this diff…"}], "timestamp": "2026-06-02T10:15:23Z"}
{"type": "llm_response", "filePath": "src/foo.go", "taskType": "main_task", "model": "claude-sonnet-4-6", "content": "Found 2 issues…", "duration_ms": 8421, "usage": {"prompt_tokens": 12450, "completion_tokens": 320}}
{"type": "tool_call", "filePath": "src/foo.go", "tool_name": "file_read", "arguments": "{\"file_path\":\"src/foo.go\",\"start_line\":1,\"end_line\":50}", "result": "File: src/foo.go (Total lines: 220)\nIS_TRUNCATED: false\nLINE_RANGE: 1-50\n1|package foo…", "ok": true, "duration_ms": 14}
```

`filePath` 保存的是**组的键**：单文件组就是该文件路径，多文件一起审查时则是该组路径排序后用逗号连接。

行是仅追加（append-only）的——不完整的 JSONL 意味着会话在运行中被中断，查看器会渲染已写入的
内容。

要释放磁盘空间，删除整个会话文件。查看器会在下次
请求时重建索引。

## 隐私

JSONL 转录包含发送给 LLM 和从 LLM 接收的**一切**，包括 diff 中的任何代码。它们
完全存在于你机器的 `~/.opencodereview/` 内。OCR 不会将它们上传到任何地方。

若审查包含不想长期保存的代码，可以：

- 定期删除会话文件，或
- 在 CI 中将 `--audience agent --format json` 的输出重定向到临时管道，并用临时
  `HOME` 运行，使 JSONL 不持久化。

OpenTelemetry exporter 是另一回事——关于如何不让 prompt 内容进入导出的 trace，请参阅
[遥测](../telemetry/)。

## 查看器不适用的场景

- 程序化后处理（CI、仪表板）请使用 `ocr review --format json --audience agent`。
  查看器是面向人类的渲染，不是面向机器的。
- 需要跨多个会话 grep 时，直接对 JSONL 文件使用 `jq`。UI 尚无搜索框。

## 相关项目

- [架构](../architecture/)——那 5 种任务类型在内部实际做什么。
- [工具](../tools/)——你在 `main_task` 卡片中看到的工具调用。