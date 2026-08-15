---
title: 工具
sidebar:
  order: 9
---

OCR 内置了 **6 种工具**，供 LLM 在审查过程中调用。本页面将说明每种工具的用途、输入 schema 以及输入输出示例。完整的机器可读定义位于
[`internal/config/toolsconfig/tools.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/toolsconfig/tools.json)。

## 各阶段的工具可用性

每种工具都声明了其可在 **plan 阶段**、**main task** 或两者中使用：

| 工具 | Plan | Main | 用途 |
|---|---|---|---|
| `task_done` | ✗ | ✓ | 表示“已完成”——结束循环。 |
| `code_comment` | ✗ | ✓ | 发布一条带有行范围和建议的审查评论。 |
| `file_read` | ✗ | ✓ | 读取变更后快照中某个文件的部分内容。 |
| `file_read_diff` | ✓ | ✓ | 读取另一个文件的 diff，以检查跨文件问题。 |
| `file_find` | ✓ | ✓ | 通过文件名关键词定位文件。 |
| `code_search` | ✓ | ✓ | 在整个仓库中进行 grep（字面量或正则表达式）。 |

`task_done` 和 `code_comment` 在 plan 阶段**故意不可用**：plan 是只读的。

> **上下文工具是只读上下文，不用于评论。** `main_task` prompt 明确禁止对*其他*文件中的发现进行评论。`file_read`、`file_read_diff`、`file_find`、
> `code_search` 的存在是为了让模型更好地理解当前文件的 diff——在收集该上下文时发现的任何问题，按设计都会被忽略。跨文件的问题只有在**当前文件的 diff** 中可观察到时，才会以评论的形式出现。

要覆盖工具注册表，可通过 `--tools <path>` 传入一个 JSON 文件路径，其格式与内置定义相同。
这样可以禁用工具、编辑描述，或在现有 provider 的基础上添加新工具。

## `task_done`

结束主循环。

```json
{
  "name": "task_done",
  "input": { "state": "DONE" }
}
```

| 字段 | 必填 | 含义 |
|---|---|---|
| `state` | 是 | `DONE`（默认）或 `FAILED`。`FAILED` 表示“使用可用工具确实无法完成”——这几乎总不是正确的选择。 |

agent 收到 `task_done` 后，将停止调用 LLM，并开始处理累积的 `code_comment` 调用。`task_done` 会立即返回（在结果记录到会话日志之前），因此 `state` 的值虽被接受但**不会持久化**——也不会影响退出码。

## `code_comment`

发布一条或多条审查评论。每条评论都锚定在代码片段（`existing_code`）上，以便 OCR 自动计算行号。

### Schema

```json
{
  "name": "code_comment",
  "input": {
    "path": "string — optional, override the file path for this comment",
    "comments": [
      {
        "content": "string — the comment in the configured language",
        "existing_code": "string — snippet from the diff to anchor on",
        "suggestion_code": "string — optional fix snippet",
        "thinking": "string — optional, the model's reasoning for this comment"
      }
    ]
  }
}
```

`comments` 是一个数组，因此模型可以在一次工具调用中发布多条评论。`content` 和 `existing_code` 是必填的。`suggestion_code` 是可选的，但建议提供。`path` 是顶层的可选覆盖项——如果省略，agent 会注入当前正在审查的文件。由于即使模型省略，agent 也会自动注入 `path`，因此模型几乎不需要显式设置。`thinking`（每条评论）用于捕获模型的推理过程，并保留在评论中。OCR 会自动用模型在当前轮次输出的推理内容进行补全（如果没有推理内容，则保持为空）。它会包含在 JSON 输出中（不会显示在终端输出中）。

> **`thinking` 是仅限运行时使用的字段。** OCR 会解析并保存它，但**故意不**将其包含在传递给模型的 `code_comment` schema 中（`tools.json` 中只有 `content`、`existing_code` 和 `suggestion_code`）。如果更高性能的模型仍然输出了 `thinking` 块，它也会被持久化。大多数模型不会输出，但这没关系。

### 锚定算法

OCR 使用**动态滑动窗口**在 diff 中搜索 `existing_code` 文本。匹配按顺序尝试：

1. **hunk 的新侧**——一组连续的 **context + added** 行（不包括仅删除或仅未更改的行），以获取新文件的行号。如果失败，OCR 会重试 **hunk 的旧侧**——context + deleted 行——以获取旧文件的行号。
2. **整个文件的新扫描**——如果没有 hunk 匹配，OCR 会逐行扫描整个变更后的文件以查找连续匹配（`resolveFromFileContent`）。
3. **重新定位任务**——如果文本匹配在更复杂的 diff 中仍然失败，OCR 会执行 `RE_LOCATION_TASK` prompt，要求模型重新锚定片段。

匹配**与空白无关**：在比较前会去除行首尾空白，并移除 diff 的 `+`/`-` 标记，因此缩进不需要完全匹配。作为最后的手段，评论会以 `start_line=0` 传递，告知用户“问题真实存在，但需要您自行定位”。

### 示例

```json
{
  "comments": [
    {
      "content": "`tx.Rollback()` is never deferred — early returns leak the transaction.",
      "existing_code": "tx, err := db.Begin()\nif err != nil {\n    return err\n}",
      "suggestion_code": "tx, err := db.Begin()\nif err != nil {\n    return err\n}\ndefer tx.Rollback()"
    }
  ]
}
```

## `file_read`

以文件的**变更后**形式读取一定范围的行。

### Schema

```json
{
  "name": "file_read",
  "input": {
    "file_path": "src/foo.go",
    "start_line": 10,
    "end_line": 80
  }
}
```

| 字段 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `file_path` | 是 | — | 相对于仓库根目录的路径。 |
| `start_line` | 否 | `1` | 从 1 开始的索引。 |
| `end_line` | 否 | 文件末尾 | 包含端点。 |

### 输出

```
File: src/foo.go (Total lines: 220)
IS_TRUNCATED: false
LINE_RANGE: 10-80
10|package foo
11|
12|import (
13|    "fmt"
…
```

每行内容前都会加上从 1 开始的行号和 `|` 分隔符，以便模型在后续的 `code_comment` 调用中准确引用行号。

### 限制

- **单次调用最多 500 行。** 更大的范围会被截断，设置 `IS_TRUNCATED: true`，并追加 `Note: Results truncated to 500 lines. Please narrow your line range.`。
- 仅读取文件的**变更后版本**。要查看旧版本，请使用 `file_read_diff`。

当模型需要周围上下文时（例如评论一个仅在 diff 中可见的函数），应从 diff 的 hunk 头 `@@ -x,y +m,n @@` 计算范围——通常是从 `m-50` 到 `m+n+50`。

## `file_read_diff`

读取同一变更集中一个或多个*其他*文件的 diff——当评论取决于相关文件是否更新时非常有用。

### Schema

```json
{
  "name": "file_read_diff",
  "input": {
    "path_array": ["src/api/handler.go", "src/db/queries.go"]
  }
}
```

### 输出

```
==== FILE: src/api/handler.go ====
--- a/src/api/handler.go
+++ b/src/api/handler.go
@@ -10,1 +10,2 @@
- old line
+ new line 1
+ new line 2

==== FILE: src/db/queries.go ====
@@ -5,1 +5,1 @@
- query := "SELECT *"
+ query := "SELECT id"
```

如果某个路径不在变更集中，其条目会被静默省略。如果请求的路径**均**不在变更集中，工具会返回 `Error: diff not found for the requested paths`。空的 `path_array` 会返回 `Error: no files found`。

## `file_find`

通过文件名关键词（子字符串匹配）在仓库中查找文件。

### Schema

```json
{
  "name": "file_find",
  "input": {
    "query_name": "UserService",
    "case_sensitive": false
  }
}
```

| 字段 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `query_name` | 是 | — | 对每个文件的 **basename**（最后一个 `/` 之后的部分）进行子字符串匹配，不匹配完整路径。 |
| `case_sensitive` | 否 | `false` | 设置为 `true` 时进行严格的大小写敏感匹配。 |

候选集在工作区模式下来自 `git ls-files --cached --others --exclude-standard`，在区间 / commit 模式下来自 `git ls-tree -r --name-only <ref>`。无扩展名的文件会被跳过，但 `Makefile`、`Dockerfile`、`LICENSE`、`Vagrantfile`、`Containerfile` 除外。

### 输出

换行符分隔的路径列表：

```
src/main/java/com/example/UserService.java
src/test/java/com/example/UserServiceTest.java
src/main/java/com/example/internal/UserServiceImpl.java
```

如果没有匹配的文件（或 `query_name` 为空），工具会返回字面量字符串 `// The file was not found`。

### 限制

最多返回 **100** 个匹配项。超出部分会被静默截断。如果模型需要更广泛的搜索，应使用 `code_search`。

## `code_search`

在整个仓库中进行全文搜索。由 `git grep` 驱动，因此理解 `pathspec` 语法，并遵循 `.gitignore`。

### Schema

```json
{
  "name": "code_search",
  "input": {
    "search_text": "TODO|FIXME",
    "file_patterns": ["*.go", ":(exclude)vendor/"],
    "case_sensitive": false,
    "use_perl_regexp": true
  }
}
```

| 字段 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `search_text` | 是 | — | 字面量字符串或 PCRE 模式（参见 `use_perl_regexp`）。 |
| `file_patterns` | 否 | 整个仓库 | pathspec 条目数组。使用 `:(exclude)pat` 进行排除。 |
| `case_sensitive` | 否 | `false` | — |
| `use_perl_regexp` | 否 | `false` | 若为 `true`，`search_text` 将被视为正则表达式。 |

### 输出

结果按文件分组。每个组以 `File: <path>` 和 `Match lines: <n>` 开头，随后每个命中以 `line|content` 的一行表示：

```
File: path/to/example.java
Match lines: 2
433|      String name = toolRequest.get().getName();
438|      logToolRequest(newPath, tool, toolRequest.get());

File: path/to/other.java
Match lines: 1
22|      var req = new ToolRequest();
```

如果没有匹配，工具会返回字面量字符串 `No matches found`。

### pathspec 快速参考

| 目的 | `file_patterns` |
|---|---|
| 单个文件 | `["src/main.go"]` |
| 所有 Go 文件 | `["*.go"]` |
| 除测试外的所有 Go | `["*.go", ":(exclude)*_test.go"]` |
| 仅单个目录 | `["src/api/"]` |
| 多种类型，排除 vendor | `["*.go", "*.ts", ":(exclude)vendor/", ":(exclude)node_modules/"]` |

### 限制

- `git grep --max-count 100` 将每个文件的命中数上限设置为 **100**，因此跨多个文件的总输出可能超过 100。如果达到每个文件的上限，输出前会附加 `Note: The results have been truncated. Only showing first 100 results.`。
- 空 / 仅空白的 `search_text` 会返回 `Error: search_text is blank`，而不是展开到每一行。
- 工作区模式搜索**当前工作树**，区间 / commit 模式搜索解析后的目标 ref（`FileReader.Ref` 作为位置参数传递给 `git grep`）。

## 工具执行与错误

工具在 agent 循环内同步执行，但有两个例外：

- `code_comment` 被分派到 **CommentWorkerPool**，以避免循环在行解析 + 反射时阻塞。
- `task_done` 会短路——立即返回，不调用任何 provider。

如果工具出错（网络故障、参数格式错误、文件未找到），结果会作为正常的工具结果传递给模型，文本形式如 `"Error: file not found: src/missing.go"`。模型随后决定是重试、修改文件还是调用 `task_done`。

如果工具名称在注册表中不存在，OCR 不会崩溃，而是返回常量 `tool.NotAvailableMsg`。这使得通过（`--tools`）在运行时禁用工具是安全的。

## 工具定制

有两种扩展方式：

### 1. 禁用工具

复制 `tools.json`，删除不需要的条目，然后运行：

```bash
ocr review --tools ./my-tools.json
```

例如，如果您想要一个不读取任何额外上下文的“仅评论”审查器，只需保留 `code_comment` 和 `task_done`。

### 2. 重写工具描述

保留 `name`（provider 内部按名称查找），修改 `description` 以引导模型。这是注入项目特定指导的最简单方式——例如“使用 `file_read` 时，始终读取变更附近至少 30 行。”

> 要添加**新的**工具*名称*，需要 Go 端的支持。请参阅 `internal/tool/definitions.go` 以及 `internal/tool/` 下的 provider。仅凭 JSON 文件无法添加新行为。

## 相关页面

- [架构](../architecture/)——agent 循环如何驱动工具。
- [审查规则](../review-rules/)——告知 LLM 应关注什么。
- [会话查看器](../viewer/)——查看过去审查中实际触发了哪些工具。