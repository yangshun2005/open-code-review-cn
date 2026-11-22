---
title: 命令（Claude Code 插件）
sidebar:
  order: 2
---

安装套件中的命令，让 OCR 在 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 内完成整个流程：检查 diff、对问题分类并自动应用有用的修复。

## 仓库中提供的内容

仓库中包含 Claude Code 插件，位于目录 [`plugins/open-code-review/claude-code/`](https://github.com/alibaba/open-code-review/tree/main/plugins/open-code-review/claude-code)。命令提示词本身位于 [`plugins/open-code-review/claude-code/commands/review.md`](https://github.com/alibaba/open-code-review/blob/main/plugins/open-code-review/claude-code/commands/review.md)，是下文所述流程的唯一权威来源。

## 安装

### 方式 1：插件市场（推荐）

**在 Claude Code 内**执行以下两条命令：

```bash
/plugin marketplace add alibaba/open-code-review
/plugin install open-code-review@open-code-review
```

它们会注册斜杠命令 `/open-code-review:review`，可通过 `/plugin` 更新。

### 方式 2：直接复制命令文件

如果不使用插件市场，可将命令文件直接放入 `.claude/commands/`。它将被注册为 `/open-code-review`（不带 `:review` 后缀）。

**项目级**（与仓库一起提交，使整个团队都能使用该命令）：

```bash
mkdir -p .claude/commands
curl -o .claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/claude-code/commands/review.md
```

**用户级**（在本机每个项目中都可用）：

```bash
mkdir -p ~/.claude/commands
curl -o ~/.claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/claude-code/commands/review.md
```

### 其他支持命令的智能体

命令文件就是带一个 frontmatter 字段的普通 Markdown，没有任何 Claude Code 特有的内容。如果智能体支持类似的**命令**约定（从目录加载 Markdown 提示词作为可调用命令），请使用上述复制文件的方式：将 `open-code-review.md` 放入智能体读取命令的目录，并按该智能体的方式调用。提示词正文与智能体无关：它只告诉模型选择哪些 `ocr` 标志以及如何对输出分类。

> **提示：** 如果不想自行配置 LLM，可尝试[委托模式](../delegate/)。它允许主智能体（Claude Code）提供模型，因此无需单独配置 LLM。

## 使用

在 Claude Code 内按名称调用命令。通过插件市场安装的使用 `/open-code-review:review`，直接复制文件的使用 `/open-code-review`：

```
/open-code-review:review
/open-code-review:review review this PR against main
/open-code-review:review focus on race conditions in commit abc123
```

提示词会解析请求并选择合适的 `ocr review` 标志：无参数时为工作区模式（已索引、未索引和未跟踪的更改），提及提交时为 `--commit`，提及分支范围时为 `--from` / `--to`。也可直接传递 OCR 标志（例如 `/open-code-review:review --commit abc123` 或 `--from main --to feature`）。

## 命令的作用

命令提示词很短，包含三个步骤：

1. **启动审查。** 执行 `ocr review --audience agent`，标志由请求确定（如果描述了需求上下文，可选 `--background`）。输出以 5 分钟超时捕获。
2. **过滤与评估。** 为每条评论分配 **High** / **Medium** / **Low** 级别。低置信度的评论（可能的误报、吹毛求疵、上下文不足）会被静默丢弃；其余则显示。
3. **修复。** 自动为 High/Medium 项应用有用的修复。与[智能体技能](../agent-skill/)不同，此命令**默认自动修复**：它面向"检查并整理"流程，而非"给我看 diff"。

如需让命令在修改代码前请求许可，或使用更严格的分类规则，请编辑提示词的本地副本。Claude Code 每次调用时都会重新读取命令，因此无需重启。

## 另请参阅

- [智能体技能](../agent-skill/) — SDK 层面的等价物：相同的底层 CLI，但默认设置不同（修复前请求许可）。