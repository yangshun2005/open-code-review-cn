---
title: 快速开始
sidebar:
  order: 3
---

在几分钟内启动您的第一次代码审查。

## 前置要求

- **Git ≥ 2.41**
- **Node.js ≥ 18**
- **LLM API 密钥**（使用[委托模式](../integrations/delegate/)时无需）

## 步骤 1：安装 CLI

```bash
npm install -g @alibaba-group/open-code-review
```

```bash
ocr version
```

> 其他安装方式请参阅[安装](../installation/)章节。

## 步骤 2：配置 LLM

> 如果您使用[委托模式](../integrations/delegate/)（例如在 Claude Code 内部），模型由主代理提供。请直接跳到步骤 4。

```bash
ocr config provider
```

选择内置或自定义提供商，输入 API 密钥并指定模型。该命令会将设置保存到配置文件中，并运行 `ocr llm test` 以验证连接。如需稍后更改模型：

```bash
ocr config model
```

### 备选方案：非交互式命令

在 CI 或无 TUI 的环境中，可通过 `ocr config set` 直接设置相同参数：

```bash
ocr config set provider                    anthropic
ocr config set model                       claude-opus-4-6
ocr config set providers.anthropic.api_key sk-ant-xxxxxxxxxx
```

## 步骤 3：验证连接

```bash
ocr llm test
```

如果看到类似 `no valid LLM endpoint configured` 的错误，请检查步骤 2 中的配置。401 / 403 状态码表示令牌无效或已过期。

## 步骤 4：运行首次审查

进入任意 Git 仓库并执行：

```bash
cd path/to/your-repo

# 所有本地更改，包括新文件
ocr review

# feature-branch 相对于 main 的更改
ocr review --from main --to feature-branch

# 提交 abc123 引入的更改
ocr review --commit abc123
```

> `ocr review` 的完整标志列表，包括并行执行参数、输出格式、`--audience` 模式及需求上下文，请参阅 [CLI 参考](../cli-reference/)。其余子命令也在该处列出。

### 哪些文件会被纳入审查

```bash
ocr review --preview              # 本地更改
ocr review -c abc123 --preview    # 提交 abc123
```

### 用于自动化的 JSON

`--audience agent` 会隐藏进度界面：标准输出（`stdout`）中仅包含 JSON 和最终摘要。此格式适用于调用代理或 CI 脚本。

```bash
ocr review --format json --audience agent > review.json
```

## 另请参阅

- [安装](../installation/)：所有安装方式及 OCR 数据目录。
- [配置](../configuration/)：所有环境变量、配置键及内置提供商。
- [CLI 参考](../cli-reference/)：所有子命令、标志及输出模式。
- [审查规则](../review-rules/)：配置哪些内容会被纳入审查。
- [集成](../integrations/agent-skill/)：将 OCR 嵌入 Claude Code、Agent skill 或 CI。
- [FAQ](../faq/)：常见错误及其解决方法。