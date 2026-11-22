---
title: 委托模式
sidebar:
  order: 5
---

OCR 执行确定性的工程操作（选择文件、解析规则），主 Agent 利用自身 LLM 能力完成代码审查。OCR 侧无需 LLM 端点。

## 何时使用委托模式

委托模式适用于基于订阅的 AI 编程 Agent，如 Claude Code、Codex、Cursor、Open Code、Qoder 等，其订阅已包含 LLM。无需为 OCR 配置单独的模型端点，直接使用主 Agent 的订阅配额进行审查。

在以下情况使用委托模式：

1. AI 编程 Agent 基于订阅运行，希望用其配额进行代码审查，无需额外 API 密钥或模型配置。
2. OCR 仅需提供工程骨架：文件过滤、规则解析和排除逻辑，所有 LLM 推理由主 Agent 完成。
3. 构建自有 Agent 流水线，需要结构化输入（文件列表和规则）用于自有审查阶段。

## 前置条件

需安装 `ocr` CLI：

```bash
which ocr || npm install -g @alibaba-group/open-code-review
```

无需 LLM 配置（`ocr config set …` 或环境变量）：委托模式下 OCR 从不调用 LLM。

## 安装技能 / 命令

### Claude Code — 命令

```bash
mkdir -p .claude/commands
curl -o .claude/commands/delegate-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/claude-code/commands/delegate-review.md
```

### 任意 Agent — 技能

```bash
npx skills add alibaba/open-code-review --skill open-code-review-delegate
```

或手动复制清单：

```bash
cp -R /path/to/open-code-review/skills/open-code-review-delegate ~/.claude/skills/
```

## 工作流程

### 步骤 1. 预览 — 确定审查内容

```bash
ocr delegate preview [--from <ref> [--to <ref>]] [--commit <hash>] [--exclude <patterns>]
```

输出包含：

- **模式** — workspace / range / commit；
- **引用元数据** — from、to、commit、merge\_base；
- **待审查文件列表** — 路径、状态、新增/删除；
- **已排除文件** — 含排除原因。

常见调用方式：

| 场景 | 命令 |
|----------|---------|
| 工作区变更 | `ocr delegate preview` |
| 分支对比 | `ocr delegate preview --from main --to feature` |
| 当前分支相对 main | `ocr delegate preview --from main` |
| 单个提交 | `ocr delegate preview -c abc123` |

### 步骤 2. 获取文件规则

```bash
ocr delegate rule [--from <ref> [--to <ref>]] [--commit <hash>] <path1> <path2> ...
```

传入步骤 1 中的待审查路径。输出按规则内容分组：相同规则的文件归为一组，避免重复。

### 步骤 3. 获取 diff

根据步骤 1 的模式和引用选择 diff 命令。审查期间每次调用 Git 都使用 `git --no-pager`。

以下 diff 命令禁用外部 diff 程序、文本转换和彩色输出，以获取纯文本补丁。

**范围模式**（已提供 merge\_base）：
```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color <merge_base>..<to> -- "<path>"
```

**提交模式**：
```bash
git --no-pager show --no-ext-diff --no-textconv --no-color <commit> -- "<path>"
```

**工作区模式**：
```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color HEAD -- "<path>"        # tracked files
cat "<path>"                     # new untracked files
```

获取上下文：

```bash
git --no-pager log --no-color --oneline -- "<path>"
git --no-pager blame --no-textconv -- "<path>"
git --no-pager show --no-ext-diff --no-textconv --no-color "<ref>:<path>"
```

对于较大的 diff，在所选模式的命令中添加 `--output="<absolute-diff-file>"`。选择仓库外的唯一绝对路径并创建父目录。在文件读取工具调用中使用相同路径：

```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color --output="<absolute-diff-file>" <merge_base>..<to> -- "<path>"
```

Git 以退出码 0 结束后，分块读取并审查整个文件，然后删除。若出错或超时，重试或将文件标记为 `skipped` 并注明错误。若输出意外为空，重新执行 preview 并核对结果。

### 步骤 4. 审查每个文件

对每个待审查文件：

1. 获取其 diff（步骤 3）。
2. 使用对应的规则组（步骤 2）作为审查清单。
3. 进行仔细审查，必要时调查上下文。

将 preview 中的每个 `(path, status)` 项记录为 `reviewed` 或 `skipped`。为每个跳过项注明原因，并在报告中包含 `total_files`、`reviewed_files`、`skipped_files`、`coverage_rate`。

### 步骤 5. 生成报告

按严重程度对每条发现分类：

- **Critical/High** — 错误、安全问题、数据丢失风险。始终报告。
- **Medium** — 性能问题、错误处理不足。结合上下文报告。
- **Low** — 风格建议、小改进。若无明确价值则静默丢弃。

## 子命令参考

| 命令 | 用途 |
|---------|---------|
| `ocr delegate preview` | 输出待审查文件及模式/引用元数据。 |
| `ocr delegate rule <path...>` | 解析审查规则并按内容分组。 |

## 通用标志

两个子命令中，`--from main` 等价于 `--from main --to HEAD`。范围审查比较 `merge-base(from, to)..to`，不包含索引变更、未暂存变更和未跟踪文件。无范围或提交标志时使用工作区模式。在 `preview` 和 `rule` 中传入相同的范围或提交标志以使用同一目标。范围标志与提交标志互斥。

| 标志 | 说明 |
|------|-------------|
| `--from <ref>` | 范围模式的起始引用。 |
| `--to <ref>` | 范围模式的目标引用；指定 `--from` 时默认为 `HEAD`。 |
| `-c, --commit <hash>` | 单提交模式。 |
| `--repo <path>` | 仓库根目录（默认为当前工作目录）。 |
| `--rule <path>` | 自定义 rule.json 路径。 |
| `--exclude <patterns>` | 逗号分隔的排除模式。 |
| `-b, --background <text>` | 业务上下文。 |
| `-B, --background-file <path>` | 从 Markdown 文件读取业务上下文（优先于 `-b`）。 |

## 与其他集成模式对比

| 模式 | 谁调用 LLM？ | 使用场景 |
|------|-------------------|----------|
| [Agent 技能](../agent-skill/) | OCR | Agent 调用 `ocr review`；OCR 管理完整审查流程。 |
| [命令（Claude Code）](../claude-code/) | OCR | Claude Code 中的 Slash 命令；OCR 管理审查。 |
| **委托模式** | 主 Agent | OCR 提供骨架；Agent 管理审查。 |

## 另见

- [Agent 技能](../agent-skill/) — OCR 代表 Agent 执行完整审查流程。
- [命令（Claude Code）](../claude-code/) — 带自动修复的 Slash 命令变体。