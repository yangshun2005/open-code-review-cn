---
name: open-code-review-delegate
description: >
  open-code-review (OCR) 的委托模式。此技能不再让 OCR 调用 LLM 端点，
  而是指示宿主代理自行执行代码审查，OCR 仅用于确定性工程：文件选择与
  规则解析。当宿主代理应利用自身 LLM 能力驱动审查时，请使用此模式。
license: Apache-2.0
compatibility: >
  需要安装 `ocr` CLI（通过 `npm install -g
  @alibaba-group/open-code-review` 或 GitHub 发布二进制文件）。不需要
  配置 LLM 端点——委托模式在 OCR 侧无需 LLM。
metadata:
  author: alibaba
  homepage: https://github.com/alibaba/open-code-review
  version: "1.0.0"
---

# Open Code Review — 委托模式

一种执行 AI 代码审查的技能，其中 OCR 提供确定性工程（文件过滤、规则解析），而宿主代理利用自身的智能和工具执行实际审查。

## 前提条件

```bash
which ocr || echo "NOT INSTALLED"
```

如果 `ocr` 未安装：

```bash
npm install -g @alibaba-group/open-code-review
```

委托模式无需 LLM 配置。

## 工作流程

### 步骤 1：预览 — 确定审查内容

```bash
ocr delegate preview --format json [--from <ref> --to <ref>] [--commit <hash>] [--exclude <patterns>]
```

此命令输出：
- **mode**（workspace / range / commit）
- **from / to / commit / merge_base** — 用于构建 git 命令的引用元数据
- **可审查文件列表** — 路径、状态、增删行数
- **排除的文件** — 附带排除原因

**常见调用方式：**

| 场景 | 命令 |
|----------|---------|
| 工作区更改 | `ocr delegate preview` |
| 分支比较 | `ocr delegate preview --from main --to feature` |
| 单个提交 | `ocr delegate preview -c abc123` |

### 步骤 2：获取文件规则

```bash
ocr delegate rule --format json <path1> <path2> ...
```

传入步骤 1 中的可审查文件路径。输出按规则内容分组——共享相同规则的文件归为一组，避免重复。

### 步骤 3：获取差异

根据步骤 1 中的模式/引用信息直接使用 git：

**范围模式**（预览输出中提供 merge_base）：
```bash
git diff <merge_base>..<to> -- <path>
```

**提交模式**：
```bash
git show <commit> -- <path>
```

**工作区模式**：
```bash
# 已跟踪文件
git diff HEAD -- <path>
# 新的未跟踪文件 — 直接读取（整个文件均为新代码）
cat <path>
```

### 步骤 4：审查每个文件

创建包含所有 `reviewable_files` 条目的检查清单。对于每个可审查文件：

使用 `(path, status)` 作为检查清单标识。当暂存删除后跟未跟踪重建时，工作区模式可能报告同一路径两次。

1. 获取其差异（步骤 3）
2. 查阅其规则组（来自步骤 2）作为审查检查清单
3. 进行彻底审查，根据需要酌情使用上下文工具
4. 将文件标记为 `reviewed`，或标记为 `skipped` 并附上具体原因

对于大型更改，按共享规则和差异大小分批次进行有界审查。不要在发现第一个高严重性问题后就停止。

### 步骤 5：格式化输出

每条评论必须遵循以下结构：

| 字段 | 类型 | 必填 | 描述 |
|-------|------|----------|-------------|
| path | string | 是 | 相对文件路径 |
| content | string | 是 | 描述问题的审查评论 |
| start_line | integer | 否 | 新文件中的起始行 |
| end_line | integer | 否 | 新文件中的结束行 |
| category | enum | 否 | bug, security, performance, maintainability, test, style, documentation, other |
| severity | enum | 否 | critical, high, medium, low |

### 步骤 6：分类与报告

在报告之前，验证每个预览文件都已处理。在摘要中包含 `total_files`、`reviewed_files`、`skipped_files` 和 `coverage_rate`。跳过的文件必须包含其原因。

按严重性对发现进行分组：

- **严重/高**：错误、安全问题、数据丢失风险——始终报告
- **中**：性能问题、错误处理缺口、可维护性问题——附上下文报告
- **低**：风格小问题、次要建议——仅在明确有价值时报告

静默丢弃可能的误报。

### 步骤 7：修复（可选）

如果用户请求“审查并修复”：
- 直接应用高/严重修复
- 描述需要手动干预的中等修复
- 跳过低优先级项目，除非微不足道

## 子命令参考

| 命令 | 用途 |
|---------|---------|
| `ocr delegate preview` | 确定要审查的文件 + 模式/引用元数据 |
| `ocr delegate rule <path...>` | 按内容分组的审查规则 |

## 共享标志

| 标志 | 描述 |
|------|-------------|
| `--from <ref>` | 范围模式的源引用 |
| `--to <ref>` | 范围模式的目标引用 |
| `-c, --commit <hash>` | 单提交模式 |
| `--repo <path>` | 仓库根目录（默认：当前工作目录） |
| `--rule <path>` | 自定义 rule.json 路径 |
| `--exclude <patterns>` | 逗号分隔的排除模式 |
| `-b, --background <text>` | 业务上下文 |
| `-B, --background-file <path>` | 来自 Markdown 文件的业务上下文 |
| `-f, --format <text\|json>` | 输出格式；代理集成使用 `json` |

## 注意事项

- **OCR 侧无需 LLM** — 委托模式从不调用 LLM。所有智能均来自宿主代理。
- **规则已分组** — 共享相同规则的文件在输出中归为一组。每次调用可传入任意数量的路径；对于大型更改，在审查时按批次获取规则。
- **工作目录很重要** — `ocr delegate` 操作当前目录下的 Git 仓库。使用 `--repo /path` 覆盖。
- **工作区模式下的未跟踪文件** — `preview` 包含未跟踪文件。对于这些文件，直接读取文件内容，而非使用 `git diff`。
- **背景上下文** — 当有需求上下文时，向 `preview` 传递 `--background`；它会在输出中显示，供审查时参考。
- **覆盖率是强制性的** — 每个 `reviewable_files` 条目必须以已审查或明确跳过结束；不得静默省略文件。