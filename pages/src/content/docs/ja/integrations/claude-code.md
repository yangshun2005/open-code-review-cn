---
title: Command（Claude Code 插件）
sidebar:
  order: 2
---

通过安装打包好的命令，您可以在 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 中端到端地运行 OCR——审查 diff、对发现进行分类，并自动应用应采纳的修复。

## 仓库内容

仓库在 [`plugins/open-code-review/claude-code/`](https://github.com/alibaba/open-code-review/tree/main/plugins/open-code-review/claude-code) 目录下提供了 Claude Code 插件。命令的 prompt 主体位于 [`plugins/open-code-review/claude-code/commands/review.md`](https://github.com/alibaba/open-code-review/blob/main/plugins/open-code-review/claude-code/commands/review.md)，是下文所述工作流的正式依据。

## 安装

### 方法 1：插件市场（推荐）

**在 Claude Code 中**执行以下两个命令。

```bash
/plugin marketplace add alibaba/open-code-review
/plugin install open-code-review@open-code-review
```

这将注册 `/open-code-review:review` 斜杠命令，并保持可通过 `/plugin` 更新的状态。

### 方法 2：直接复制命令文件

如果想跳过插件市场，可以直接将命令文件放到 `.claude/commands/` 目录下。这会以 `/open-code-review`（不带 `:review` 后缀）注册。

**项目级别**（提交到仓库并与团队共享）：

```bash
mkdir -p .claude/commands
curl -o .claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/claude-code/commands/review.md
```

**用户级别**（适用于机器上的所有项目）：

```bash
mkdir -p ~/.claude/commands
curl -o ~/.claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/claude-code/commands/review.md
```

### 支持命令的其他 agent

命令文件是带有单一 frontmatter 字段的纯 markdown——不包含任何 Claude Code 特有的内容。如果您的 agent 支持类似的 **command** 约定（从目录加载为可调用命令的 markdown prompt），则上述文件复制方法就是安装途径。将 `open-code-review.md` 放到 agent 加载命令的目录中，并按照 agent 的命令调用方式进行调用。prompt 主体不依赖 agent——它只是告诉模型选择哪个 `ocr` 参数以及如何对输出进行分类。

> **提示：** 如果您不想自己配置 LLM，可以试试[委派模式](../delegate/)——宿主 agent（Claude Code）提供模型，因此无需额外配置 LLM。

## 使用方法

在 Claude Code 中按名称调用命令。通过插件市场安装的使用 `/open-code-review:review`，直接复制文件的使用 `/open-code-review`。

```
/open-code-review:review
/open-code-review:review review this PR against main
/open-code-review:review focus on race conditions in commit abc123
```

prompt 会解析您的请求并选择正确的 `ocr review` 参数。无参数 → 工作区模式（staged + unstaged + untracked）、提及 commit → `--commit`、提及分支区间 → `--from` / `--to`。您也可以直接透传 OCR 参数（例如：`/open-code-review:review --commit abc123` 或 `--from main --to feature`）。

## 命令执行的操作

命令的 prompt 非常简短，分为 3 个步骤。

1. **执行审查。** 使用从您的请求中推断出的参数调用 `ocr review --audience agent`（如果描述了需求上下文，则添加可选的 `--background`）。输出在 5 分钟超时内获取。
2. **过滤与评估。** 将每条评论分类为 **High** / **Medium** / **Low**。低置信度（疑似误报、琐碎指摘、上下文不足）的评论会被静默丢弃，其余则显示。
3. **修复。** 对应采纳的 High/Medium 项自动应用修复。与 [Agent Skill](../agent-skill/) 不同，此命令**默认自动修复**——适合“审查并清理”的工作流，而不适合“展示 diff”的工作流。

如果您希望命令在修改代码前先询问，或希望收紧分类标准，请编辑本地的 prompt 副本。Claude Code 每次调用都会重新读取命令，因此无需重启。

## 相关链接

- [Agent Skill](../agent-skill/)——SDK 级别的等价物。使用相同的底层 CLI，但默认值不同（修复前会先询问）。