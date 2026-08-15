---
title: 委派模式
sidebar:
  order: 5
---

OCR 负责确定性工程（文件选择、规则解析），而宿主代理则利用自身的 LLM 能力进行实际的代码审查。OCR 侧无需 LLM 端点。

## 何时使用委派模式

委派模式专为订阅制的 AI 编程代理设计——如 Claude Code、Codex、Cursor、Open Code、Qoder 等。这些工具内置了 LLM 订阅，使用委派模式可以直接将宿主代理的现有订阅额度用于代码审查，无需额外的模型配置或 API 密钥。

在以下情况下使用：

1. 当 AI 编程代理为订阅制，且希望复用其额度进行代码审查时——无需额外的 API 密钥或模型配置。
2. 当仅需使用 OCR 的工程功能（文件过滤、规则解析、排除逻辑），而将 LLM 推理交由宿主代理处理时。
3. 当构建自定义代理流水线，需要结构化输入（文件列表＋规则）用于自有审查步骤时。

## 前提条件

需要安装 `ocr` CLI：

```bash
which ocr || npm install -g @alibaba-group/open-code-review
```

无需 LLM 配置（`ocr config set …` 或环境变量）——委派模式不会在 OCR 侧调用 LLM。

## 安装 Skill / Command

### Claude Code — Command

```bash
mkdir -p .claude/commands
curl -o .claude/commands/delegate-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/claude-code/commands/delegate-review.md
```

### 任意代理 — Skill

```bash
npx skills add alibaba/open-code-review --skill open-code-review-delegate
```

或手动复制：

```bash
cp -R /path/to/open-code-review/skills/open-code-review-delegate ~/.claude/skills/
```

## 工作流程

### 步骤 1：预览——确定审查对象

```bash
ocr delegate preview [--from <ref> --to <ref>] [--commit <hash>] [--exclude <patterns>]
```

输出内容：

- **mode** — workspace / range / commit
- **ref 元数据** — from、to、commit、merge\_base
- **可审查文件列表** — 路径、状态、插入/删除行数
- **排除文件** — 附带排除原因

常用模式：

| 场景 | 命令 |
|----------|---------|
| 工作区更改 | `ocr delegate preview` |
| 分支比较 | `ocr delegate preview --from main --to feature` |
| 单个提交 | `ocr delegate preview -c abc123` |

### 步骤 2：获取文件的规则

```bash
ocr delegate rule <path1> <path2> ...
```

传入步骤 1 中的可审查路径。输出按规则内容分组——共享相同规则的文件会合并为一个组，避免重复。

### 步骤 3：获取 diff

根据步骤 1 中的 mode/ref 信息，直接使用 git：

**Range 模式**（含 merge\_base）：
```bash
git diff <merge_base>..<to> -- <path>
```

**Commit 模式**：
```bash
git show <commit> -- <path>
```

**Workspace 模式**：
```bash
git diff HEAD -- <path>        # 已跟踪文件
cat <path>                     # 新增未跟踪文件
```

### 步骤 4：审查每个文件

对于每个可审查文件：

1. 获取 diff（步骤 3）
2. 将对应的规则组（步骤 2）作为审查检查清单
3. 根据需要探索上下文，进行彻底审查

### 步骤 5：报告

按严重程度分类：

- **Critical/High** — 缺陷、安全问题、数据丢失风险。始终报告。
- **Medium** — 性能隐患、错误处理缺失。附上下文报告。
- **Low** — 风格建议、轻微改进。除非明确有价值，否则静默丢弃。

## 子命令参考

| 命令 | 用途 |
|----------|------|
| `ocr delegate preview` | 列出可审查文件＋mode/ref 元数据 |
| `ocr delegate rule <path...>` | 解析按内容分组的审查规则 |

## 通用标志

| 标志 | 说明 |
|--------|------|
| `--from <ref>` | Range 模式的源引用 |
| `--to <ref>` | Range 模式的目标引用 |
| `-c, --commit <hash>` | 单提交模式 |
| `--repo <path>` | 仓库根目录（默认：当前工作目录） |
| `--rule <path>` | 自定义 rule.json 路径 |
| `--exclude <patterns>` | 逗号分隔的排除模式 |
| `-b, --background <text>` | 业务上下文 |
| `-B, --background-file <path>` | 从 Markdown 文件读取业务上下文 |

## 与其他集成模式比较

| 模式 | 谁调用 LLM？ | 使用场景 |
|--------|-----------------|-------------|
| [Agent Skill](../agent-skill/) | OCR | Agent 调用 `ocr review`，OCR 驱动完整审查 |
| [Command（Claude Code）](../claude-code/) | OCR | Claude Code 斜杠命令，OCR 驱动审查 |
| **委派模式** | 宿主代理 | OCR 提供脚手架，Agent 驱动审查 |

## 相关链接

- [Agent Skill](../agent-skill/) — OCR 代替代理驱动完整审查。
- [Command（Claude Code）](../claude-code/) — 斜杠命令形式，支持自动修复。