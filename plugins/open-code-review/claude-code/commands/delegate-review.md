---
description: 在委托模式下运行 OCR —— OCR 负责文件选择和规则，宿主 agent 执行实际审查。
---

以委托模式调用 OpenCodeReview (OCR)。OCR 决定审查哪些文件并提供审查规则；你使用自身能力执行实际的代码审查。

## 工作流程

### 第 1 步：预览

```bash
ocr delegate preview [user-args]
```

- 默认（无用户参数）：工作区模式（已暂存 + 未暂存 + 未跟踪）。
- 如果用户提供 `--commit` 或 `-c`：原样传递。
- 如果用户提供 `--from` 和 `--to`：原样传递。
- （可选）提供 `--background "context"` 或 `-b "context"` 以传入业务上下文。
- 如果找不到 `ocr`，请安装：`npm i -g @alibaba-group/open-code-review`。

该命令输出模式/ref 元数据和可审查文件列表。

### 第 2 步：获取规则

传入所有可审查文件路径以获取其审查清单：

```bash
ocr delegate rule <path1> <path2> ...
```

### 第 3 步：获取差异并审查

根据第 1 步得到的模式和 ref 选择差异命令。审查期间每次调用 Git 都使用 `git --no-pager`。

差异命令会禁用外部差异程序、文本转换和颜色，以生成纯补丁。

- 范围：`git --no-pager diff --no-ext-diff --no-textconv --no-color <merge_base>..<to> -- "<path>"`
- 提交：`git --no-pager show --no-ext-diff --no-textconv --no-color <commit> -- "<path>"`
- 工作区：`git --no-pager diff --no-ext-diff --no-textconv --no-color HEAD -- "<path>"`（未跟踪文件用 `cat "<path>"`）

读取上下文：

```bash
git --no-pager log --no-color --oneline -- "<path>"
git --no-pager blame --no-textconv -- "<path>"
git --no-pager show --no-ext-diff --no-textconv --no-color "<ref>:<path>"
```

对于大型差异，为所选模式的命令添加 `--output="<absolute-diff-file>"`。选择一个仓库外的唯一绝对路径，并创建其父目录。在文件读取工具调用中使用同一路径：

```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color --output="<absolute-diff-file>" <merge_base>..<to> -- "<path>"
```

Git 以退出码 0 结束后，分块读取并审查整个文件，然后删除它。如果 Git 失败或超时，重试或记录为 `skipped` 并附上错误。若输出意外为空，请对照新的预览结果检查。

然后重点审查：正确性、安全性、性能、错误处理、并发、可维护性。只评论变更的代码（+ 行）。

### 第 4 步：报告与修复

将每个预览过的 `(path, status)` 记录为 `reviewed` 或 `skipped`。为每个 skipped 条目给出原因，并报告 `total_files`、`reviewed_files`、`skipped_files` 和 `coverage_rate`。

按严重程度对每个问题分类：

- **High**：明显的 bug、安全问题、数据丢失，或带有精确修复方案的明确错误
- **Medium**：合理的顾虑、性能建议，或需要人工处理的修复
- **Low**：静默丢弃（可能是误报、吹毛求疵或上下文不足）

自动修复安全且定义明确的 High 和 Medium 问题。