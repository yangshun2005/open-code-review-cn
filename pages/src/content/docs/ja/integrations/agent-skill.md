---
title: Agent Skill
sidebar:
  order: 1
---

通过将 OCR 注册为可调用的技能（skill），代理框架能够使用正确的参数、预检查和分类标准来调用 OCR，无需调用方重新推导这些内容。

## 仓库内容

仓库中提供了
[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)
技能清单。该清单将 OCR 声明为可调用的技能，并包含预检查、调用工作流以及评论分类标准（高/中/低）。

## 安装

### 方法 1：`npx skills add`（推荐）

在需要使用该技能的项目内执行以下命令。

```bash
npx skills add alibaba/open-code-review --skill open-code-review
```

该命令会从
[技能注册表](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)
获取清单并将其放置到项目中，使得遵循技能规范的编码代理在下次调用时能够加载它。要更新技能到最新版本，请重新运行此命令。

> **前提条件：** 首次运行时，如果 `PATH` 中不存在二进制文件，技能将自动安装 `ocr` CLI（通过 `npm install -g @alibaba-group/open-code-review`）——请参阅[技能功能](#技能功能)。但是，**必须**预先配置 LLM。技能无法代劳，它会停止处理并询问。[配置](../../configuration/) 中提供了相关说明。

### 方法 2：手动复制（系统级）

如果你想全局安装技能（而非按项目安装），可以将文件夹复制到技能目录。

```bash
mkdir -p ~/.claude/skills
cp -R /path/to/open-code-review/skills/open-code-review ~/.claude/skills/
```

这样，该技能即可供机器上的所有项目使用。

## 技能功能

SKILL.md 是一个提示词。当调用方代理加载它时，代理会自行执行其中的步骤。完整的 `/open-code-review`（或等效）请求将按以下方式展开。

1. **预检查。** 执行 `which ocr` 以确认 CLI 位于 `PATH` 中，然后执行 `ocr llm test` 以确认 LLM 可达。
2. **若 CLI 缺失则自动安装。** 如果 `which ocr` 报告“未安装”，代理将执行 `npm install -g @alibaba-group/open-code-review` 并继续。此过程不会询问用户——这被视为常规设置步骤。
3. **若 LLM 配置缺失则停止并询问。** 如果 `ocr llm test` 失败，代理*不会*伪造凭据。它会向用户展示两种受支持的方法（环境变量或 `ocr config set …`），并等待用户提供 API 密钥。
4. **提取业务上下文。** 确认审查对象（提交、分支、工作副本），并生成简短的 `--background` 字符串。
5. **执行审查。**
   调用 `ocr review --audience agent --background "…" [--commit | --from/--to]`。
   根据用户希望审查工作副本、特定提交还是分支区间来选择参数。
6. **分类与报告。** 使用 SKILL.md 中的标准将 JSON 评论分类为 **高** /
   **中** / **低**（错误与安全问题归为高，琐碎意见或疑似误报则静默丢弃），并渲染 Markdown 格式的摘要。
7. **按需修复。** 如果用户指示“审查**并**修复”（或类似指令），则对高/中级别的问题内联应用安全修复。否则，在修改代码前会先询问。

完整提示词——包括精确的分类标准、输出模板和注意事项——位于
[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)
中。如果你想对上述任何行为进行更严格的限制（例如，将默认行为改为在修复前始终询问），可以编辑本地副本。

## Anthropic Agent SDK

将 SDK 的初始化指向已安装的技能路径。

```python
from anthropic_agent_sdk import Agent

agent = Agent(
    skill_paths=["/path/to/open-code-review/skills/open-code-review"],
)

agent.run("Review my staged changes — focus on race conditions.")
```

SDK 会加载 SKILL.md 提示词，代理将执行[技能功能](#技能功能)中描述的工作流——包括 `npm install` 的回退，以及在 LLM 配置缺失时提示输入凭据的步骤。

## 其他代理框架

任何提供“注册外部技能”接口的框架都可以引入 SKILL.md——它只是带有 frontmatter 的 markdown。即使框架期望不同的模式，markdown 正文也可以作为提示词模板使用。

## 相关项目

- [命令（Claude Code 插件）](../claude-code/)——同一技能的斜杠命令版本。