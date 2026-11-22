---
title: 工具
sidebar:
  order: 9
---

OCR 内置 **六个工具**，LLM 可在评审过程中调用。本页说明每个工具的用途、输入 Schema 及输入/输出示例。基础机器可读定义位于 [`internal/config/toolsconfig/tools.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/toolsconfig/tools.json)。

## 各阶段工具可用性

任务模板按名称从公共定义中选择工具。在 `task_template.json` 中，`MAIN_TASK.tools` 指定可调用工具的有序列表，`PLAN_TASK.tool_references` 仅将其描述作为参考文本加入规划提示词。规划仍为单次请求，不调用工具。这些字段不改变定义。

`scan_template.json` 独立选择主任务工具，排除 `file_read_diff`，因为整文件扫描没有 diff。缺失或空列表不选择任何工具，也不会启用整个目录。重复名称按首次出现顺序仅包含一次。未知引用、重复目录条目和无效定义会在任务准备时导致错误。

diff 评审的默认选择：

| 工具             | 规划 | 主任务 | 用途                                                     |
| ---------------- | ---- | ------ | -------------------------------------------------------- |
| `task_done`      | ✗    | ✓      | 表示"我已完成"并结束循环。                               |
| `code_comment`   | ✗    | ✓      | 创建带行范围和修复建议的评审评论。                       |
| `file_read`      | ✓    | ✓      | 读取比较所选一侧的文件片段。                             |
| `file_read_diff` | ✓    | ✓      | 读取其他文件的 diff，以验证跨文件假设。                  |
| `file_find`      | ✓    | ✓      | 按文件名关键字搜索文件。                                 |
| `code_search`    | ✓    | ✓      | 在仓库中搜索（普通文本或正则表达式）。                   |

`task_done` 和 `code_comment` 在规划阶段**故意不可用**：规划仅执行只读操作。

> **上下文工具仅提供只读上下文，而非评论目标。** `main_task` 提示词明确禁止对*其他*文件中的问题发表评论。`file_read`、`file_read_diff`、`file_find` 和 `code_search` 帮助模型更好地理解当前文件的 diff；收集此类上下文时发现的任何问题均有意忽略。跨文件问题只有在**当前文件的 diff** 中可见时才会成为评论。

内置工具定义随 OCR 发布，运行时不可覆盖。项目建议请使用[评审规则](../review-rules/)，外部业务上下文请使用 [MCP](../mcp/)。若您曾使用自定义工具文件，请阅读[迁移说明](#customizing-tools)。

## 比较侧 {#comparison-sides}

在工作区、提交或范围评审中，`file_read`、`code_search` 和 `file_find` 接受可选参数 `side`。省略或传入 `"new"` 时，保持默认行为和输出格式。值 `"old"` 允许读取同一比较中旧侧的文件、搜索代码或获取文件列表：

```json
{"file_path": "src/foo.go", "start_line": 10, "end_line": 80, "side": "old"}
{"search_text": "OldAPI", "file_patterns": ["src/"], "side": "old"}
{"query_name": "foo.go", "side": "old"}
```

| 评审输入 | 新侧 | 旧侧 |
| --- | --- | --- |
| `--from BASE --to HEAD` | 已固定的 head 提交 | 范围两端已固定提交的 merge-base，而非目标分支的最新提交 |
| `--commit COMMIT` | 已固定的提交 | 第一个父提交，包括合并提交 |
| 根提交 | 已固定的提交 | 空树 |
| 工作区评审 | 当前工作区 | 初始化时固定的 HEAD，而非其父提交 |
| 首次提交前的工作区 | 当前工作区 | 空树 |

在提交或范围评审中，diff 和三个工具使用相同的不可变端点。路径和行号相对于所选侧。对于重命名的文件，旧侧请使用旧路径：工具不会转换名称，也不会在出错时切换到其他版本。已删除的文件在旧侧仍可访问。根提交的旧侧不包含文件：读取报告文件不存在，搜索和列表返回空结果。不可达的 Git 对象和 Git 故障视为错误，而非空树的标志。在浅克隆边界评审提交前，必须加深历史，即使父对象已在本地存在。这确保 Git diff 和旧侧工具具有相同的比较基准。

在工作区评审中，仅旧侧被固定：diff 和工具使用初始 HEAD，即使之后它发生变化。新侧读取当前工作区，包括按现有筛选规则纳入的未跟踪文件。这不是索引快照，也不是工作区的不可变快照。为保证新侧上下文一致，评审期间请勿编辑文件。不需要 HEAD 的父提交：只要 HEAD 可访问，浅克隆即可支持。

Preview 和评审使用相同的比较逻辑。暂存后再次编辑时，比较工作区内容。空 diff 不会被索引变更替代。首次提交前，空树也与工作区比较，而非过时的索引内容。这修复了此前的 staged fallback。其他 Git 错误仍为错误。恢复工作区评审时，已完成的检查点仅在 HEAD 和评审输入未变化时使用：所选 diff（包括跟踪文件的删除或恢复）必须与父运行完全一致。已完成的文件复用，未完成的重新检查；不支持编辑后的增量复用和运行期间的编辑保护。比较的是规范化后的所选 diff，因此未跟踪文件末尾换行符的增删或 LF/CRLF 行尾切换不会妨碍恢复，而实质性内容变更会被拒绝。

旧侧结果以 `SIDE: old` 和 `REVISION: <commit-sha>` 开头，空树使用 `SOURCE: empty-tree`。旧侧错误也会标明来源。现有的行数和匹配数限制对两侧均生效。仅允许 `"new"` 和 `"old"`；null、空字符串和任意 Git ref 均不允许。

扫描保留定义、提示词和输出格式，并拒绝 `side`。工作区评审保留默认输出格式并增加侧选择。公共目录 `tools.json` 仍为 current-only 定义的来源，不声明 `side`。准备比较评审时，`WithComparisonSides` 基于目录为调用创建定义和规划参考描述，添加 `side` 并更新描述，但不修改基础定义。对于工作区，`WithWorkspaceSides` 在定义和规划参考中描述固定的旧侧和当前新侧。

恢复提交或范围评审时使用当前内置工具。旧版和新版允许的端点必须与原始一致，即使所选 patch 未变化：任一树中其他部分的上下文可能影响了之前的评审。不同 ref 名称只要解析到相同端点即可。若任一端点变化，或旧会话缺少足够端点信息以验证比较，请开始新评审。已完成的文件结果复用，未完成的文件用当前工具检查。要用当前能力重新检查所有文件，请开始新评审。工作区评审遵循相同的检查点复用规则，但其标识是 HEAD 和评审输入，而非提交端点对：任何输入变化（包括跟踪文件的删除或恢复）都需要新评审。

## `task_done`

结束主循环。

```json
{
  "name": "task_done",
  "input": { "state": "DONE" }
}
```

| 字段    | 必填 | 值                                                                                                                                                                    |
| ------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state` | 是   | `DONE`（默认）或 `FAILED`。`FAILED` 表示"我确实无法用可用工具完成任务"，几乎从不正确。 |

当 agent 收到 `task_done` 时，停止 LLM 调用并开始处理已累积的 `code_comment` 调用。`task_done` 立即返回（在结果写入会话日志之前），因此 `state` 值被接受但**不保存**，也不影响退出码。

## `code_comment`

创建一个或多个评审评论。每条评论锚定到代码片段（`existing_code`），以便 OCR 自动计算行号。

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

`comments` 是数组，因此模型可在一次工具调用中创建多条评论。`content` 和 `existing_code` 必填；`suggestion_code` 可选但推荐。`path` 是可选顶层覆盖；缺失时 agent 填入当前检查的文件。若模型未指定，agent 也会自动添加 `path`，因此模型很少需要显式设置此字段。每条评论的 `thinking` 字段包含模型的推理，并与评论一起保存；OCR 从模型在当前轮输出的推理内容（reasoning content）中填充（若模型未输出则留空），并包含在 JSON 输出中（终端输出中不显示）。

> **`thinking` 仅在运行时存在。** OCR 解析并保存它，但有意**不**将其包含在 `tools.json` 中向模型声明的 `code_comment` Schema 中（那里仅有 `content`、`existing_code` 和 `suggestion_code`）。仍输出 `thinking` 块的更强模型会保存它；大多数模型不发送，这没问题。

### 锚定算法

OCR 使用**动态滑动窗口**在 diff 中查找 `existing_code` 文本。匹配按以下顺序检查：

1. **片段新侧** — **上下文和新增**行的连续序列（不仅是删除或未变更行），给出新文件行号。若未找到匹配，OCR 在**片段旧侧**（上下文和删除行）重试，获取旧文件行号。
2. **全文件扫描** — 若片段中无匹配，OCR 在修改后的整个文件内容中逐行查找连续匹配（`resolveFromFileContent`）。
3. **重定位任务** — 若对非平凡 diff 文本匹配仍失败，OCR 启动 `RE_LOCATION_TASK` 提示词，请模型重新锚定片段。

匹配**忽略空白字符**：比较前去除行首尾空白并删除 diff 标记 `+`/`-`，因此不需要精确缩进匹配。极端情况下评论以 `start_line=0` 输出，告知用户："问题确实存在，但需自行定位"。

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

默认读取**修改后**状态的文件行范围。在工作区、提交或范围评审中，也可选择[比较侧](#comparison-sides)。

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

| 字段         | 必填 | 默认值   | 说明                     |
| ------------ | ---- | -------- | ------------------------ |
| `file_path`  | 是   | —        | 相对于仓库根目录的路径。 |
| `start_line` | 否   | `1`      | 从 1 开始编号。          |
| `end_line`   | 否   | 文件末尾 | 包含。                   |

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

每行内容前添加从 1 开始的行号和分隔符 `|`，以便模型在后续 `code_comment` 调用中精确指定行号。

### 限制

- **每次调用最多 500 行。** 更长的范围被截断，设置 `IS_TRUNCATED: true`，并在末尾添加 `Note: Results truncated to 500 lines. Please narrow your line range.`。
- **结果字节限制。** 超过 2 048 字节的行在 UTF-8 字符边界处截断，标记 `[line truncated, N more bytes omitted]`；正文达到 256 KiB 时输出也停止，消息为 `Note: Output truncated at 262144 bytes. …`。两种情况均设置 `IS_TRUNCATED: true`，因此压缩的单行文件无法将数兆字节带入对话。
- 默认读取文件的**修改后版本**。在提交或范围评审中，使用 `side: "old"` 读取旧侧完整内容，使用 `file_read_diff` 查看变更片段。

当模型需要周围上下文时（例如评论 diff 中仅部分可见的函数），应从 diff 片段头 `@@ -x,y +m,n @@` 计算范围——通常为 `m-50` 到 `m+n+50`。

## `file_read_diff`

读取同一变更集中一个或多个*其他*文件的 diff。当评论取决于相关文件是否已更新时很有用。

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

不在变更集中的路径不会被静默丢弃：在 `Error: diff not found for: <path>` 中列出，已找到路径的 diff 仍在此错误前返回。若运行有其他文件的 diff，消息会列出它们（`Diffs exist for: ...`），以便修正错误路径；若完全没有 diff，消息建议改用 `file_read`。空 `path_array` 返回 `Error: no files found`。

## `file_find`

按相对路径或文件名关键字（子串匹配）在仓库中搜索文件。

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

| 字段             | 必填 | 默认值  | 说明                                                                                                       |
| ---------------- | ---- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `query_name`     | 是   | —       | 子串与仓库中每个文件的**相对路径**匹配（支持 `/` 和 `\` 分隔符）。                                         |
| `case_sensitive` | 否   | `false` | 设为 `true` 进行区分大小写匹配。                                                                           |

候选集由工作区模式下的 `git ls-files --cached --others --exclude-standard` 或范围/提交模式下的 `git ls-tree -r --name-only <ref>` 生成。无扩展名的文件被跳过，`Makefile`、`Dockerfile`、`LICENSE`、`Vagrantfile`、`Containerfile`、`BUILD` 和 `WORKSPACE` 除外。

### 输出

以换行分隔的路径列表：

```
src/main/java/com/example/UserService.java
src/test/java/com/example/UserServiceTest.java
src/main/java/com/example/internal/UserServiceImpl.java
```

若无文件匹配（或 `query_name` 为空），工具返回字面字符串 `// The file was not found`。

### 限制

最多返回 **100** 个匹配；多余的静默丢弃。若模型需要更广泛的搜索，应改用 `code_search`。

## `code_search`

仓库全文搜索。基于 `git grep`，因此理解 `pathspec` 语法并遵循 `.gitignore`。

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

| 字段              | 必填 | 默认值   | 说明                                                          |
| ----------------- | ---- | -------- | ------------------------------------------------------------- |
| `search_text`     | 是   | —        | 普通字符串或 PCRE 模式（见 `use_perl_regexp`）。              |
| `file_patterns`   | 否   | 整个仓库 | pathspec 元素数组。使用 `:(exclude)pat` 排除。                |
| `case_sensitive`  | 否   | `false`  | —                                                             |
| `use_perl_regexp` | 否   | `false`  | 为 `true` 时，`search_text` 解释为正则表达式。                |

### 输出

结果按文件分组。每组以 `File: <path>` 和 `Match lines: <n>` 开头，然后每个匹配输出 `line|content` 行：

```
File: path/to/example.java
Match lines: 2
433|      String name = toolRequest.get().getName();
438|      logToolRequest(newPath, tool, toolRequest.get());

File: path/to/other.java
Match lines: 1
22|      var req = new ToolRequest();
```

若无匹配，工具返回字面字符串 `No matches found`。

### pathspec 配方

| 目标                     | `file_patterns`                                                    |
| ------------------------ | ------------------------------------------------------------------ |
| 单个文件                 | `["src/main.go"]`                                                  |
| 所有 Go 文件             | `["*.go"]`                                                         |
| 所有 Go 文件（排除测试） | `["*.go", ":(exclude)*_test.go"]`                                  |
| 仅一个目录               | `["src/api/"]