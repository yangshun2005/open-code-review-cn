---
title: 快速入门
sidebar:
  order: 3
---

只需几分钟即可完成首次代码审查。

## 前提条件

- **Git ≥ 2.41**
- **Node.js ≥ 18**
- **LLM API 密钥**（使用[委任模式](../integrations/delegate/)时无需）

## 步骤 1 —— 安装 CLI

```bash
npm install -g @alibaba-group/open-code-review
```

```bash
ocr version
```

> 其他安装方式请参阅[安装](../installation/)。

## 步骤 2 —— 配置 LLM

> 如果使用[委任模式](../integrations/delegate/)（例如在 Claude Code 中运行），宿主 agent 会提供模型 —— 请直接跳到步骤 4。

```bash
ocr config provider
```

选择内置或自定义 provider，输入 API 密钥，选择模型，所有配置将保存到配置文件中，然后运行一次 `ocr llm test` 来验证端点。之后如需切换模型：

```bash
ocr config model
```

### 替代方法：非交互式命令

在 CI 或无 TUI 的环境中，可以使用 `ocr config set` 直接写入相同配置。

```bash
ocr config set provider                    anthropic
ocr config set model                       claude-opus-4-6
ocr config set providers.anthropic.api_key sk-ant-xxxxxxxxxx
```

## 步骤 3 —— 测试连接

```bash
ocr llm test
```

如果出现类似 `no valid LLM endpoint configured` 的错误，请重新检查步骤 2 中的配置。401 / 403 表示 token 错误或已过期。

## 步骤 4 —— 执行首次审查

进入任意 Git 仓库并运行：

```bash
cd path/to/your-repo

# 工作区模式 —— 审查暂存 + 未暂存 + 未跟踪的更改（默认）
ocr review

# 分支区间 —— 审查从 main 分支后 feature-branch 的更改（合并基础模式）
ocr review --from main --to feature-branch

# 单个提交 —— 审查该提交引入的 diff
ocr review --commit abc123
```

> `ocr review` 的完整参数（并发数调优、输出格式、audience 模式、背景上下文等）以及其他所有子命令，请参阅 [CLI 参考](../cli-reference/)。

### 想先预览审查内容

```bash
ocr review --preview              # 工作区
ocr review -c abc123 --preview    # 提交
```

### 面向系统的 JSON 输出

`--audience agent` 会抑制面向人类的进度 UI，仅将 stdout 输出为 JSON / 最终摘要 —— 这是上游 agent 或 CI 脚本所需的。

```bash
ocr review --format json --audience agent > review.json
```

## 相关链接

- [安装](../installation/) —— 所有安装方式及 OCR 状态目录。
- [配置](../configuration/) —— 各环境变量、配置键、内置 provider。
- [CLI 参考](../cli-reference/) —— 各子命令、参数、输出模式。
- [审查规则](../review-rules/) —— 自定义审查内容。
- [集成](../integrations/agent-skill/) —— 将 OCR 集成到 Claude Code、Agent skill 和 CI 中。
- [FAQ](../faq/) —— 已知错误及解决方法。