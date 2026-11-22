# Open Code Review Codex 插件使用指南

本文档介绍如何在本地 Codex 中使用 Alibaba Open Code Review。

## 概述

此插件不会将 Open Code Review 替换为 Codex 内部的 LLM 后端。它是一种集成，通过提供技能（skill）让 Codex 能够调用本地的 `ocr` CLI。

```text
Codex
  └─ Open Code Review 插件
      └─ ocr review --audience agent
```

## 准备工作

需要先安装 `ocr` CLI。

```bash
npm install -g @alibaba-group/open-code-review
```

验证安装：

```bash
command -v ocr
ocr version
```

同时需要配置 OCR 自身的 LLM 设置。

```bash
ocr llm test
```

如果此命令执行失败，则需要先完成 OCR 的 LLM 配置，这与 Codex 插件的安装是相互独立的。

## 在 Codex 中安装

在 Codex 中，将此仓库添加为 marketplace。

```bash
codex plugin marketplace add alibaba/open-code-review
codex
```

在 Codex 中打开 `/plugins`，然后安装并激活 `Open Code Review`。

如需在本地 checkout 或 fork 中进行测试，可以使用以下命令：

```bash
codex plugin marketplace add .
codex
```

## 使用示例

在新的 Codex 会话中，按如下方式请求：

```text
@Open Code Review review my current changes
```

分支比较：

```text
@Open Code Review review this branch against main
```

审查后仅修改安全项：

```text
@Open Code Review review and fix high-confidence issues
```

## 内部执行的命令

审查当前工作区的更改：

```bash
ocr review --audience agent
```

审查特定提交：

```bash
ocr review --audience agent --commit <sha>
```

分支比较：

```bash
ocr review --audience agent --from <base-ref> --to <head-ref>
```

预览：

```bash
ocr review --preview
```

## 注意事项

- 此插件不会配置 OpenAI Responses API 端点。
- 此插件不要求设置 `OPENAI_API_KEY` 或 `gpt-5.1-codex-max`。
- OCR 本身需要单独的 LLM 配置。
- 仅当用户明确请求时，才会执行文件修改。
- 仅当用户明确请求时，才会创建提交。