---
title: 委托模式
sidebar:
  order: 5
---

OCR 负责确定性工程部分（文件选择、规则解析），由宿主 Agent 利用自身 LLM 能力执行实际代码审查。OCR 侧无需 LLM 端点。

## 何时使用委托模式

委托模式专为订阅制 AI 编码 Agent 设计——Claude Code、Codex、Cursor、Open Code、Qoder 等。这些工具内置 LLM 订阅，使用委托模式可直接复用宿主 Agent 的现有订阅额度进行代码审查，无需额外模型配置或 API 密钥。

适用场景：

1. AI 编码 Agent 为订阅制，希望复用其额度进行代码审查——无需额外 API 密钥或模型配置。
2. 仅使用 OCR 的工程能力（文件过滤、规则解析、排除逻辑），LLM 推理交由宿主 Agent。
3. 构建自定义 Agent 流水线，需要结构化输入（文件列表＋规则）用于自有审查步骤。

## 前提条件

需安装 `ocr` CLI：

```bash
which ocr || npm install -g @alibaba-group/open-code-review
```

无需 LLM 配置（`ocr config set …` 或环境变量）——委托模式不会在 OCR 侧调用 LLM。

## 安装 Skill / Command

### Claude Code — Command

```bash
mkdir -p .claude/commands
curl -o .claude/commands/delegate-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/claude-code/commands/delegate-review.md
```

### 任意 Agent — Skill

```bash
npx skills add alibaba/open-code-review --skill open-code-review-delegate
```

或手动复制：

```bash
cp -R /path/to/open-code-review/skills/open-code-review-delegate ~/.claude/skills/
```

## 工作流

### 步骤 1：Preview — 确定审查目标

```bash
ocr delegate preview [--from <ref> [--to <ref>]] [--commit <hash>] [--exclude <patterns>]
```

输出内容：

- **mode** — workspace / range / commit
- **ref 元数据** — from、to、commit、merge\_base
- **可审查文件列表** — 路径、状态、插入/删除行数
- **排除文件** — 附排除原因

常用模式：

| 场景 | 命令 |
|----------|---------|
| 工作区变更 | `ocr delegate preview` |
| 分支比较 | `ocr delegate preview --from main --to feature` |
| 当前分支与 main 比较 | `ocr delegate preview --from main` |
| 单个提交 | `ocr delegate preview -c abc123` |

### 步骤 2：获取文件规则

```bash
ocr delegate rule [--from <ref> [--to <ref>]] [--commit <hash>] <path1> <path2> ...
```

传入步骤 1 中的可审查路径。输出按规则内容分组——共享同一规则的文件归为一组，避免重复。

### 步骤 3：获取 diff

根据步骤 1 的模式和引用信息选择 diff 命令。审查中所有 Git 调用均使用 `git --no-pager`。

以下 diff 命令禁用外部 diff 程序、文本转换和彩色输出，以获取纯文本补丁。

**Range 模式**（有 merge\_base）：
```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color <merge_base>..<to> -- "<path>"
```

**Commit 模式**：
```bash
git --no-pager show --no-ext-diff --no-textconv --no-color <commit> -- "<path>"
```

**Workspace 模式**：
```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color HEAD -- "<path>"        # 已跟踪文件
cat "<path>"                     # 新增未跟踪文件
```

获取上下文：

```bash
git --no-pager log --no-color --oneline -- "<path>"
git --no-pager blame --no-textconv -- "<path>"
git --no-pager show --no-ext-diff --no-textconv --no-color "<ref>:<path>"
```

对于较大的 diff，在所选模式的命令中添加 `--output="<absolute-diff-file>"`。选择仓库外的唯一绝对路径，并创建父目录。文件读取工具也使用同一路径：

```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color --output="<absolute-diff-file>" <merge_base>..<to> -- "<path>"
```

Git 以退出码 0 结束后，分块读取整个文件，完成审查后删除。若命令失败或超时，重试或记录错误并标记为 `skipped`。若输出意外为空，重新运行 preview 进行核对。

### 步骤 4：审查各文件

对每个可审查文件：

1. 获取 diff（步骤 3）
2. 参照对应规则组（步骤 2）作为审查检查清单
3. 按需进行上下文探索，彻底审查

将 preview 中的每个 `(path, status)` 记录为 `reviewed` 或 `skipped`，跳过的项需附原因。报告中包含 `total_files`、`reviewed_files`、`skipped_files`、`coverage_rate`。

### 步骤 5：报告

按严重程度分类：

- **Critical/High** — Bug、安全问题、数据丢失风险。始终报告。
- **Medium** — 性能问题、缺少错误处理。附上下文报告。
- **Low** — 风格建议、轻微改进。除非明确有价值，否则静默丢弃。

## 子命令参考

| 命令 | 用途 |
|----------|------|
| `ocr delegate preview` | 列出可审查文件＋mode/ref 元数据 |
| `ocr delegate rule <path...>` | 按内容分组解析审查规则 |

## 通用标志

两个子命令中，`--from main` 是 `--from main --to HEAD` 的简写。范围审查比较 `merge-base(from, to)..to`，不包含已暂存、未暂存和未跟踪的变更。省略范围和提交标志则为工作区模式。由于使用相同目标，`preview` 和 `rule` 需传入相同的范围或提交标志。范围和提交标志不能同时使用。

| 标志 | 说明 |
|--------|------|
| `--from <ref>` | Range 模式的源引用 |
| `--to <ref>` | Range 模式的目标引用。指定 `--from` 时默认为 `HEAD` |
| `-c, --commit <hash>` | 单提交模式 |
| `--repo <path>` | 仓库根目录（默认：cwd） |
| `--rule <path>` | 自定义 rule.json 路径 |
| `--exclude <patterns>` | 逗号分隔的排除模式 |
| `-b, --background <text>` | 业务上下文 |
| `-B, --background-file <path>` | 从 Markdown 文件读取业务上下文（优先于 `-b`） |

## 与其他集成模式的比较

| 模式 | 谁调用 LLM？ | 用例 |
|--------|-----------------|-------------|
| [Agent Skill](../agent-skill/) | OCR | Agent 调用 `ocr review`，OCR 驱动完整审查 |
| [Command（Claude Code）](../claude-code/) | OCR | Claude Code 斜杠命令，OCR 驱动审查 |
| **委托模式** | 宿主 Agent | OCR 提供脚手架，Agent 驱动审查 |

## 相关项目

- [Agent Skill](../agent-skill/) — OCR 代替 Agent 驱动完整审查。
- [Command（Claude Code）](../claude-code/) — 斜杠命令形式，带自动修复。