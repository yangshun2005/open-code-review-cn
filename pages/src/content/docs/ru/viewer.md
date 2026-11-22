---
title: 查看会话
sidebar:
  order: 10
---

`ocr viewer` — 内置的小型 HTTP 服务器，以适合浏览器的界面展示历史评审会话。无需外部依赖：会话直接读取自 OCR 在每次评审期间写入磁盘的 JSONL 文件。

## 启动

```bash
ocr viewer                       # start and open the browser
ocr viewer --addr :3000          # bind to all interfaces on port 3000
ocr viewer --addr 0.0.0.0:8080   # bind on all interfaces
ocr viewer --open=never          # just print the URL
ocr viewer --open=always         # force it when auto declines (piped output, WSL)
```

默认地址为 `localhost:5483`。服务器在前台运行；`Ctrl+C` 可停止。每次请求时会从 `~/.opencodereview/sessions/` 惰性读取会话，因此在另一个终端启动的评审，其 JSONL 文件一创建就会立即出现。

> **DNS rebinding 防护。** 查看器会将 `Host` 请求头与允许的 loopback 地址列表（`localhost`、`127.0.0.1`、`::1`）进行比对。具体的绑定主机（例如 `--addr 192.168.1.10:5483`）会自动加入，而**通配符绑定**（`:3000`、`0.0.0.0`、`::`）不会。因此通过 IP 地址或局域网主机名访问界面时会返回 `forbidden host`。要开放通配符绑定，请在 `OCR_VIEWER_ALLOWED_HOSTS` 中设置以逗号分隔的允许主机名列表（例如 `OCR_VIEWER_ALLOWED_HOSTS=box.local,192.168.1.10`）。

## 打开浏览器

服务器开始监听后，`ocr viewer` 会在默认浏览器中打开 URL。这由 `--open` 控制，它接受与全局 `--color` 相同的三个值：

| 值 | 行为 |
|---|---|
| `auto`（默认） | 仅在大概率能成功的地方打开——见下文。 |
| `always` | 无条件打开。适用于 `auto` 拒绝打开但浏览器实际可用的场景：输出进入管道，或无显示器的 WSL。 |
| `never` | 仅打印 URL，不做其他操作。 |

在 `auto` 模式下，以下情况**不会**打开浏览器：

- stdout 不是终端——输出被重定向或进入管道；
- 设置了 `SSH_CONNECTION` 变量**且**显示未转发——远程机器上无处可打开。`ssh -X` 和 `ssh -Y` 会设置 `DISPLAY`，因此不受此限制；
- 在 Linux 上 `DISPLAY` 和 `WAYLAND_DISPLAY` 均为空——没有显示服务器。

原因会附加到就绪信息中，以免有意抑制的自动打开看起来像故障：

```
Viewer ready: http://localhost:5483 (browser not opened: no DISPLAY or WAYLAND_DISPLAY)
```

在 Unix 上会先尝试 `$BROWSER`：以冒号分隔的命令列表，每条命令要么包含 URL 的 `%s` 占位符，要么将 URL 作为最后一个参数接收。否则运行平台的默认命令——macOS 上为 `open`，Linux 和 BSD 上为 `xdg-open`，Windows 上为 `rundll32`。浏览器打开失败只是 stderr 中的警告，而非致命错误：服务器会继续运行。

## 四个页面

查看器提供四个 URL：

| URL | 显示内容 |
|---|---|
| `/` | 磁盘上存在会话的所有仓库列表。 |
| `/r/{repo}` | 单个仓库的会话列表，从最新开始。 |
| `/r/{repo}/{sessionID}` | 单个会话的完整详情。 |
| `/r/{repo}/compare` | 同一仓库两个会话的对比。 |

`{repo}` 是路径编码后的字符串（`/` 和 `\` 分隔符替换为 `-`，冒号替换为 `_`；磁盘上的目录名使用相同的编码）。通常无需手动输入：通过链接导航即可。

### `/` — 仓库列表

对于至少包含一个会话的每个仓库，显示路径、会话总数、最后活动时间以及指向其会话的 `Check` 链接。搜索框按仓库路径过滤列表；每页显示十个仓库，右下角的分页器用于切换页面。

### `/r/{repo}` — 仓库会话列表

对于每个会话，显示 ID（UUID）、分支名（如果 OCR 能确定）、评审模式、模型、文件数、持续时间、开始时间，以及指向下一个更旧会话的 `Check` 链接。每页显示十个会话，分页器位于右下角。

### `/r/{repo}/{sessionID}` — 会话详情

详情页信息最丰富。它包含：

1. **标题** — diff 范围、模型、分支、总 token 数和运行持续时间。
2. **文件组** — 每个已检查的**组**对应一个独立区块。文件在评审前按语义合并为组，因此一个区块可能涵盖多个相关文件，其标题为组内文件的路径。每个组内有五条"任务类型"泳道：

| 任务类型 | 显示时机 |
|---|---|
| `plan_task` | 执行了规划阶段（最大文件 ≥ `PLAN_MODE_LINE_THRESHOLD`，或 2 个以上文件合计 ≥ `PLAN_MODE_GROUP_LINE_THRESHOLD`）。 |
| `main_task` | 每个组都有。主评审循环——每个评审轮次一次。 |
| `review_filter_task` | 该组在评审后执行了评论过滤阶段。 |
| `memory_compression_task` | active+compress 区域超过预算的 60% / 80%。 |
| `re_location_task` | 无法绑定 `code_comment`，因此执行了备用位置查找。 |

每条泳道是一条水平的**任务卡片**条带——每次 LLM 请求循环对应一张卡片。卡片颜色取决于任务类型，因此可以一眼看出哪些阶段占用了运行的主要部分。

此页面上较长的列表——**File breakdown**、**Files Reviewed**、**Session Tasks** 和 **Conversations**——每页显示二十项。当区块能在一页内显示时，分页器隐藏。

### `/r/{repo}/compare` — 两个会话的对比

与 `ocr session compare` 打印的四个分组相同，但以页面形式呈现。会话列表的 **Action** 列中有 `Check` 链接：每行打开与下一个更旧会话的对比，因此最上面一行显示自上次运行以来的变化。最旧的一行显示 `-`，因为没有可对比的对象。

评论分为四组：

| 分组 | 含义 |
|---|---|
| New | 评论仅存在于较晚的运行中。 |
| Persisting | 评论在两次运行中都存在。 |
| Resolved | 评论仅存在于较早的运行中，且较晚的运行确实检查了该文件。 |
| Not reviewed | 评论仅存在于较早的运行中，且较晚的运行完全没有查看该文件。没有人重新检查过，因此不算已解决。 |

与 CLI 的一处差异：CLI 会跳过空分组，而页面始终打印全部四组。`Resolved (0)` 本身就是答案，而静默消失的区块看起来会像页面故障。

每个分组每页显示二十条评论；如果分组能在一页内显示，分页器隐藏。

早于运行清单的会话没有记录覆盖范围，因此其所有未匹配的评论都归入 Resolved，而非 Not reviewed。

要对比任意其他一对会话，请编辑查询字符串：`/r/{repo}/compare?before=<较旧会话 id>&after=<较新会话 id>`。两个标识符都必须属于 URL 中的仓库。

如果两次运行的检查模式不同，页面会显示与 `ocr session compare` 相同的警告：它们可能检查了不同的文件集，因此分组不能直接比较。

## 任务卡片内容

点击任务卡片可展开。每张卡片包含：

- **标题行** — 请求编号、模型图标、token 图标（`P:` — 提示 / `C:` — 补全，如有 `CR:` / `CW:` — 缓存读取 / 写入）、持续时间图标，以及循环失败时的错误图标；
- **Response** — 助手的原始响应，包括所有推理 / `thinking` 块；
- **Tool calls** — 每次工具调用及其参数和返回结果（可折叠）。

发送给模型的完整消息列表和可用工具定义**不会**显示在卡片界面中。如有需要，请直接查看 JSONL 转储：每条 `llm_request` 记录的 `messages` 字段。

## 评审评论

在任务泳道下方，会话页面以**评论卡片**形式列出评审中发现的所有评论，按文件分组：评论文本、原始和建议代码（如有），以及严重程度和类别图标。筛选面板上的标签可按严重程度或类别缩小列表。每页显示二十条评论；如果只有一页，分页器隐藏。切换严重程度或类别筛选会回到第 1 页；标记评论、切换 **Hide marked** 或清除标记会保持当前页，只要该页仍然存在。

### 修复时标记评论

每张卡片上有三个按钮——**Fixed** / **Ignored** / **Clear**——用于标记单条评论：

- 标记互斥：设置一个会替换另一个，**Clear** 则取消标记。当前状态以卡片上的彩色图标显示。
- **Hide marked**（默认开启，在浏览器中记忆）在处理其余评论时隐藏已标记的卡片。工具栏显示已标记和隐藏的评论数量；可随时关闭开关以重新显示全部。
- **Clear all marks** 一次性重置会话的所有标记。

标记是查看器的状态，而非评审数据；查看器本身保持只读：

- 它们存储在浏览器的 `localStorage` 中，并绑定到会话页面。不会在会话 JSONL 旁边写入任何内容，查看器也不提供任何写入接口。
- 标记属于单个会话**和单个浏览器**：在另一个浏览器或另一台机器上，会话显示时没有标记，清除此站点的浏览器存储会从头开始。
- 对相同更改重新评审会创建新会话，新会话开始时没有标记。

## 使用场景

查看器面向三种工作流程：

### "模型为什么这么说？"

在终端输出中打开评论，在查看器中找到包含该文件的**组**，然后沿其 `main_task` 泳道查看。产生该评论的轮次位于其**工具调用**包含所需 `code_comment` 的卡片中。该卡片的 Response 部分显示模型的推理。要查看确切的提示和发送给模型的上下文，请在 JSONL 转储中打开对应请求编号的 `llm_request` 记录（其 `messages` 字段）。

### "为什么这个文件没有评论？"

**没有评论**的文件只有在模型*有意*调用 `task_done` 时才被视为成功检查。如果泳道中有工具调用但没有 `code_comment`，则是有意完成的无评论评审。如果泳道以错误卡片结束，则无评论背后隐藏着故障——请将其作为警告报告。

### "压缩时保留或丢失了什么？"

`memory_compression_task` 泳道显示每个压缩轮次。其中 Response 部分包含生成的摘要，而传递给模型的压缩区域渲染 XML 位于该轮次的 `llm_request` 记录中，在其 `messages` 字段，位于 JSONL 转储中。这在排查"模型忘记了之前的上下文"的投诉时很有用：可以确定所需信息是否在压缩时被丢弃。

## 磁盘存储结构

查看器从以下位置读取数据：

```
~/.opencodereview/sessions/
└── <path-encoded-repo-path>/
    └── <session-id>.jsonl
```

JSONL 文件的每一行代表一个事件：

```json
{"type": "llm_request", "filePath": "src/foo.go", "taskType": "main_task", "request_no": 1, "messages": [{"role": "user", "content": "Review this diff…"}], "timestamp": "2026-06-02T10:15:23Z"}
{"type": "llm_response", "filePath": "src/foo.go", "taskType": "main_task", "model": "claude-sonnet-4-6", "content": "Found 2 issues…", "duration_ms": 8421, "usage": {"prompt_tokens": 12450, "completion_tokens": 320}}
{"type": "tool_call", "filePath": "src/foo.go", "tool_name": "file_read", "arguments": "{\"file_path\":\"src/foo.go\",\"start_line\":1,\"end_line\":50}", "result": "File: src/foo.go (Total lines: 220)\nIS_TRUNCATED: false\nLINE_RANGE: 1-50\n1|package foo…", "ok": true, "duration_ms": 14}
```

`filePath` 包含**组键**：单文件组为单个路径，多文件一起检查时为排序后以逗号连接的组路径。

行仅追加到文件末尾。不完整的 JSONL 意味着会话在执行期间被中断；查看器显示已有数据。

要释放磁盘空间，请整体删除会话文件。下次请求时查看器会重新创建索引。

## 隐私

JSONL 转储包含发送给 LLM 并从中返回的**所有内容**，包括 diff 中的代码。它们仅存储在您计算机上的 `~/.opencodereview/` 目录中。OCR 不会将它们上传到任何地方。

如果评审中包含不应长期保存的代码：

- 定期删除会话文件；或
- 将 `--audience agent --format json` 的输出重定向到 CI 中的临时通道，并使用临时 `HOME` 运行 OCR，以免 JSONL 被保存。

OpenTelemetry 导出器独立工作。关于如何不将提示内容包含在导出的追踪中，请参阅[遥测](../telemetry/)。

## 查看器不适用的场景

- 对于程序化后处理（CI、监控面板），请使用 `ocr review --format json --audience agent`。查看器面向人，而非机器。
- 要在多个会话中搜索，请直接对 JSONL 文件使用 `jq`。界面中尚无搜索字段。

## 另请参阅

- [架构](../architecture/) — 这五种任务类型实际如何工作。
- [工具](../tools/) — `main_task` 卡片中显示的工具调用。