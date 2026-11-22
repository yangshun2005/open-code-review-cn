---
title: 工具
sidebar:
  order: 9
---

OCR 内置了 **6 个工具**，供 LLM 在评审过程中调用。本页说明各工具的用途、输入 schema 以及输入输出示例。基础的机器可读定义位于
[`internal/config/toolsconfig/tools.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/toolsconfig/tools.json)。

## 各阶段中工具的可用性

任务模板按名称从共享定义中选择工具。`task_template.json` 中的
`MAIN_TASK.tools` 是发送给模型的可调用工具的有序列表。
`PLAN_TASK.tool_references` 仅作为参考文本展开到计划 prompt 中。
计划仍是不带可调用工具的单次请求，两个字段都不会改变定义。

`scan_template.json` 独立选择 main task 的工具，由于全文件扫描没有 diff，因此不包含
`file_read_diff`。省略或空列表不会选择任何工具，也不会启用整个目录。
重复的名称按首次出现顺序只包含一次。未知引用、重复的目录项、无效定义会在
任务初始化时报错。

默认 diff 评审中的选择如下：

| 工具             | Plan | Main | 用途                                                             |
| ---------------- | ---- | ---- | ---------------------------------------------------------------- |
| `task_done`      | ✗    | ✓    | 表示"已完成"——结束循环。                                         |
| `code_comment`   | ✗    | ✓    | 发出一条带行范围和修复建议的评审评论。                           |
| `file_read`      | ✓    | ✓    | 读取所选比较侧中文件的一部分。                                   |
| `file_read_diff` | ✓    | ✓    | 读取其他文件的 diff，检查跨文件问题。                            |
| `file_find`      | ✓    | ✓    | 按文件名关键字定位文件。                                         |
| `code_search`    | ✓    | ✓    | 全仓库 grep（字面量或正则表达式）。                              |

`task_done` 和 `code_comment` 在 plan 阶段**刻意不可用**：plan 是只读的。

> **上下文工具是只读上下文，不是评论对象。** `main_task` prompt 明确禁止对
> *其他*文件中的发现发表评论。`file_read`、`file_read_diff`、`file_find`、
> `code_search` 的存在是为了让模型更好地理解当前文件的 diff——收集这些上下文时
> 发现的任何问题都会在设计上被忽略。跨文件问题只有在**当前文件的 diff** 中可观察时
> 才会以评论形式出现。

内置工具定义随 OCR 一起分发，运行时不可覆盖。
项目规范请使用[评审规则](../review-rules/)，外部业务上下文请使用
[MCP](../mcp/)。如果你曾使用自定义工具文件，请参阅
[迁移指南](#customizing-tools)。

## 比较侧 {#comparison-sides}

在 workspace、commit、range 评审中，`file_read`、`code_search`、`file_find`
会新增可选的 `side` 参数。省略或指定 `"new"` 时，
保持默认行为和输出格式。指定 `"old"` 时，可在同一比较的旧侧
读取、搜索、枚举文件。

```json
{"file_path": "src/foo.go", "start_line": 10, "end_line": 80, "side": "old"}
{"search_text": "OldAPI", "file_patterns": ["src/"], "side": "old"}
{"query_name": "foo.go", "side": "old"}
```

| 评审输入 | 新侧 | 旧侧 |
| --- | --- | --- |
| `--from BASE --to HEAD` | 固定的 head 提交 | 固定两端的 merge-base，不是目标分支的最新提交 |
| `--commit COMMIT` | 固定的提交 | 第一个父提交，合并提交同理 |
| 根提交 | 固定的提交 | 空树 |
| 工作区评审 | 当前工作树 | 初始化时固定的 HEAD，不是父提交 |
| 首个提交之前的工作区 | 当前工作树 | 空树 |

commit 和 range 评审中，diff 与 3 个工具共享同一组不可变的比较端点。路径和行号属于
所选侧。重命名的文件在旧侧请指定旧路径。
工具不会自动转换名称，也不会回退到其他版本。已删除的
文件也可从旧侧读取。根提交的旧侧没有文件。
读取会报告文件不存在，搜索和枚举返回空结果。
Git 对象不可用或 Git 操作失败属于错误，不会当作空树处理。
要评审浅克隆边界上的提交，即使父对象在本地
存在，也请先获取所需历史。这样 Git diff 和旧侧
工具才会使用相同的比较基准。

工作区只固定旧侧。diff 和旧侧工具使用初始化时的同一 HEAD，
之后 HEAD 变动也不会改变基准。新侧按现有选择规则
随时读取包含未跟踪文件的工作树。它不是索引或工作树的不可变
快照。如需一致的新侧内容，请避免在评审期间编辑。由于不需要 HEAD 的父提交，HEAD 可读的浅克隆也可使用。

preview 和实际评审使用相同的比较逻辑。暂存后编辑时
比较工作树内容，即使 diff 为空也不会回退到已暂存的差异。
首个提交之前也比较空树与工作树，不会评审旧的已暂存内容。
这是对之前 staged 回退的修复。其他 Git 错误仍视为失败。工作区恢复仅在 HEAD 和评审输入不变期间复用已完成的检查点。所选 diff（包括跟踪文件的删除和恢复）必须与父执行完全一致，已完成的文件复用，未完成的文件重试。编辑后的增量复用和运行中的编辑保护不在范围内。比较对象是规范化后的所选 diff，因此未跟踪文件末尾换行的增删或 LF/CRLF 行尾变更可以恢复，实质性内容变更会被拒绝。

旧侧结果以 `SIDE: old` 和 `REVISION: <commit-sha>` 开头。空树使用
`SOURCE: empty-tree`。旧侧错误也会标明来源。现有的行数和
匹配数限制对两侧都适用。可接受的值为字符串 `"new"` 和 `"old"`，
null、空字符串、任意 Git ref 均无效。

扫描保持现有定义、prompt、默认输出格式，指定 `side` 时会被拒绝。
工作区评审保持默认输出格式，新增可选的比较侧参数。共享的 `tools.json`
目录是 current-only 定义的来源，不声明 `side`。比较评审在
初始化时通过 `WithComparisonSides` 从目录派生调用用定义和计划用引用，
在不修改基础定义的前提下添加 `side` 并更新说明。工作区中
`WithWorkspaceSides` 在调用用和计划用定义中说明旧侧固定和新侧随时读取。

恢复 commit 或 range 评审时使用当前内置工具，即使所选
patch 未变，已解析的新旧端点也必须与原始一致。
因为任一树中其他位置的上下文都可能影响过之前的评审。
不同 ref 名解析到相同端点时可以恢复。任一端点变化，或
旧会话缺少用于验证比较的端点信息时，请开始新的评审。
已完成文件的结果复用，未完成的文件用当前工具评审。
要用当前功能重新检查所有文件，请开始新的评审。工作区评审也遵循相同的检查点复用规则，但标识符是 HEAD 和评审输入而非提交端点。包括跟踪文件删除和恢复在内的输入变化需要新的评审。

## `task_done`

结束 main 循环。

```json
{
  "name": "task_done",
  "input": { "state": "DONE" }
}
```

| 字段 | 必需 | 含义                                                                                                                                             |
| ---------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `state`    | 是 | `DONE`（默认）或 `FAILED`。`FAILED` 表示"用可用工具确实无法完成"——几乎总不是正确选择。 |

agent 收到 `task_done` 后停止调用 LLM，开始处理累积的 `code_comment`
调用。`task_done` 会立即返回（在结果写入会话日志之前），因此 `state` 值会被接受
但**不会持久化**——也不影响退出码。

## `code_comment`

发出一条或多条评审评论。每条评论锚定到代码片段（`existing_code`），
让 OCR 自动计算行号。

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

`comments` 是数组，因此模型可在一次工具调用中发出多条评论。`content` 和
`existing_code` 必需。`suggestion_code` 可选，但建议提供。`path` 是顶层可选覆盖——
省略时 agent 注入当前正在评审的文件。即使模型省略，agent 也会自动注入 `path`，
模型几乎无需显式设置。`thinking`（每条评论）捕获模型的推理并保留在评论中。
OCR 会用模型在当前轮输出的推理内容自动补全（无推理内容时保持为空）。包含在 JSON 输出中（终端输出不显示）。

> **`thinking` 是仅运行时字段。** OCR 会解析并保存它，但有意**不包含**在传给模型的
> `code_comment` schema 中（`tools.json` 只有 `content`、
> `existing_code`、`suggestion_code`）。更强的模型若仍发出 `thinking` 块也会
> 被持久化。大多数模型不会发出，没有问题。

### 锚定算法

OCR 使用**动态滑动窗口**在 diff 中搜索 `existing_code` 文本。匹配按顺序尝试：

1. **hunk 新侧**——在连续的 **context + added** 行组中（不是仅 deleted 或仅 unchanged），
   得到新文件的行号。失败时，OCR 重试 **hunk 旧侧**——context +
   deleted 行——得到旧文件的行号。
2. **全文件新扫描**——hunk 匹配失败时，OCR 逐行扫描变更后的整个文件寻找连续匹配
   （`resolveFromFileContent`）。
3. **重定位任务**——更复杂的 diff 中文本匹配仍失败时，OCR 执行
   `RE_LOCATION_TASK` prompt，请模型重新锚定片段。

匹配**对空白不敏感**：比较前会 trim 行并去除 diff 的 `+`/`-` 标记，因此缩进
无需精确一致。最后手段是评论以 `start_line=0` 交付，告知用户"问题真实存在，请自行定位"。

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

默认读取文件**变更后**形式的一定范围行。
在 workspace、commit、range 评审中，可选指定[比较侧](#comparison-sides)。

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

| 字段   | 必需   | 默认   | 说明                             |
| ------------ | ------ | ------------ | -------------------------------- |
| `file_path`  | 是   | —            | 相对于仓库根目录的路径。 |
| `start_line` | 否 | `1`          | 从 1 开始的索引。         |
| `end_line`   | 否 | 文件末尾 | 包含端点。                     |

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

每行内容前加从 1 开始的行号和 `|` 分隔符，让模型在后续 `code_comment` 调用中
准确引用行号。

### 限制

- **单次调用最多 500 行。** 更大的范围会被截断，设置 `IS_TRUNCATED: true`，
  并追加 `Note: Results truncated to 500 lines. Please narrow your line range.`。
- **结果有字节上限。** 超过 2,048 字节的行在 UTF-8 字符边界截断，
  标记 `[line truncated, N more bytes omitted]`。正文达到 256 KiB 时渲染停止，
  追加 `Note: Output truncated at 262144 bytes. …`。两者都会设置 `IS_TRUNCATED: true`，
  因此压缩的单行文件不会向对话灌入数 MB 内容。
- 默认读取文件的**变更后版本**。commit 和 range 评审中，
  `side: "old"` 可读取旧侧的完整内容。查看变更处请使用 `file_read_diff`。

模型需要周边上下文时（例如评论 diff 中只能看到的函数），应从 diff 的
hunk 头 `@@ -x,y +m,n @@` 计算范围——通常是 `m-50` 到 `m+n+50`。

## `file_read_diff`

读取同一变更集中一个或多个*其他*文件的 diff——适用于评论依赖相关文件
是否更新的场景。

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

不在变更集中的路径不会被静默丢弃。
会在 `Error: diff not found for: <path>` 中列出名称，找到的路径的 diff 会在
该错误之前返回。有其他文件 diff 的执行中，消息会列出它们
（`Diffs exist for: ...`），便于修正拼错的路径。完全没有
diff 的执行中，会提示改用 `file_read`。空 `path_array` 返回
`Error: no files found`。

## `file_find`

按仓库相对路径或文件名关键字（子串匹配）搜索仓库内文件。

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

| 字段       | 必需   | 默认 | 说明                                                                                                                      |
| ---------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `query_name`     | 是   | —          | 对每个文件的**仓库相对路径**做子串匹配（接受 `/` 和 `\` 两种路径分隔符）。 |
| `case_sensitive` | 否 | `false`    | 设为 `true` 时严格区分大小写匹配。                                                             |

候选集在 workspace 模式下来自 `git ls-files --cached --others --exclude-standard`，
在区间 / commit 模式下来自 `git ls-tree -r --name-only <ref>`。无扩展名的文件
会被跳过，但 `Makefile`、`Dockerfile`、`LICENSE`、`Vagrantfile`、
`Containerfile`、`BUILD`、`WORKSPACE` 例外。

### 输出

换行分隔的路径列表：

```
src/main/java/com/example/UserService.java
src/test/java/com/example/UserServiceTest.java
src/main/java/com/example/internal/UserServiceImpl.java
```

无匹配文件时（或 `query_name` 为空时），工具返回字面量字符串
`// The file was not found`。

### 限制

最多返回 **100** 条匹配。超出部分静默截断。模型需要更广泛搜索时应
使用 `code_search`。

## `code_search`

全仓库全文搜索。由 `git grep` 驱动，理解 `pathspec` 语法，
遵循 `.gitignore`。

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

| 字段        | 必需   | 默认     | 说明                                                             |
| ----------------- | ------ | -------------- | ---------------------------------------------------------------- |
| `search_text`     | 是   | —              | 字面量字符串或 PCRE 模式（参见 `use_perl_regexp`）。 |
| `file_patterns`   | 否 | 全仓库 | pathspec 条目数组。排除使用 `:(exclude)pat`。 |
| `case_sensitive`  | 否 | `false`        | —                                                                |
| `use_perl_regexp` | 否 | `false`        | 为 `true` 时，`search_text` 按正则表达式处理。        |

### 输出

结果按文件分组。每组以 `File: <path>` 和 `Match lines: <n>` 开头，随后每个命中
以 `line|content` 一行表示：

```
File: path/to/example.java
Match lines: 2
433|      String name = toolRequest.get().getName();
438|      logToolRequest(newPath, tool, toolRequest.get());

File: path/to/other.java
Match lines: 1
22|      var req = new ToolRequest();
```

无匹配时，工具返回字面量字符串 `No matches found`。

### pathspec 速查

| 目的                      | `file_patterns`                                                    |