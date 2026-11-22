---
title: Agent Skill
sidebar:
  order: 1
---

将 OCR 注册为可调用技能，让 Agent 框架能以正确的标志、前置检查和分类规则运行它——无需在调用方重新实现这些逻辑。

## 仓库中包含的内容

仓库中的 SKILL 清单位于
[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)。
它将 OCR 声明为可调用技能，包含前置检查、运行流程和评论分类规则（High/Medium/Low）。

## 安装

### 方式 1：`npx skills add`（推荐）

在需要该技能的项目中执行：

```bash
npx skills add alibaba/open-code-review --skill open-code-review
```

该命令从[技能注册表](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)下载清单并放入项目，任何支持技能约定的编程 Agent 在下次启动时即可发现它。要更新到最新版本，重新执行该命令即可。

> **前置要求：** 首次运行时，如果 `PATH` 中没有 `ocr` 二进制文件，技能会自动安装 CLI（通过
> `npm install -g @alibaba-group/open-code-review`）。详见下文[技能做什么](#what-the-skill-does)。
> 但 LLM 必须提前配置：技能无法代劳，会停止并提示。参见[配置](../../configuration/)。

### 方式 2：手动复制（全局安装）

如果希望全局安装而非按项目安装，将目录复制到技能目录：

```bash
mkdir -p ~/.claude/skills
cp -R /path/to/open-code-review/skills/open-code-review ~/.claude/skills/
```

之后该技能对本机所有项目可用。

## 技能做什么 {#what-the-skill-does}

SKILL.md 是一个提示词：调用方 Agent 加载后，由 Agent 自行执行其中描述的步骤。一次 `/open-code-review` 请求（或等价请求）的完整流程如下：

1. **前置检查。** 执行 `which ocr` 确认 CLI 在 `PATH` 中，再执行 `ocr llm test` 检查 LLM 可用性。
2. **自动安装缺失的 CLI。** 如果 `which ocr` 返回 "NOT INSTALLED"，Agent 执行
   `npm install -g @alibaba-group/open-code-review` 并继续。不向用户展示提示：这视为常规配置步骤。
3. **LLM 未配置时停止并询问。** 如果 `ocr llm test` 失败，Agent *不会*编造凭据。它会向用户展示两种支持的方式（环境变量或
   `ocr config set …`）并等待 API 密钥。
4. **提取业务上下文。** 确认审查目标（提交、分支、工作副本）并生成简短的 `--background` 字符串。
5. **启动审查。** 执行
   `ocr review --audience agent --background "…" [--commit | --from/--to]`，
   根据用户要求审查工作副本、单个提交还是分支范围来选择标志。
6. **分类与报告。** 按 SKILL.md 中的规则将 JSON 评论分为
   **High** / **Medium** / **Low** 三级（错误和安全问题归为 High；吹毛求疵和可能的误报会被静默丢弃），然后生成 Markdown 摘要。
7. **按需修复。** 如果用户要求"审查**并**修复"（或类似表述），对 High/Medium 项进行安全修复；否则在修改代码前请求许可。

完整提示词（包括精确的分类规则、输出模板和注意事项）位于
[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)。
如需调整上述行为（例如始终在修复前请求许可），修改本地副本即可。

## Anthropic Agent SDK

初始化 SDK 时指定已安装的技能：

```python
from anthropic_agent_sdk import Agent

agent = Agent(
    skill_paths=["/path/to/open-code-review/skills/open-code-review"],
)

agent.run("Review my staged changes — focus on race conditions.")
```

SDK 加载 SKILL.md 提示词后，Agent 执行[技能做什么](#what-the-skill-does)中的流程，包括通过 `npm install` 的备用安装，以及 LLM 未配置时请求凭据。

## 其他 Agent 框架

任何支持注册外部技能的框架都可以使用 SKILL.md：它就是带 frontmatter 的普通 Markdown。如果框架期望不同的 Schema，Markdown 正文仍可作为提示词模板使用。

## 另见

- [命令（Claude Code 插件）](../claude-code/) — 同一技能的 slash 命令形式。