---
name: open-code-review
description: >
  使用 alibaba/open-code-review 的 `ocr` CLI 对 Git 变更执行 AI 驱动的代码审查。
  当用户要求审查代码、审查 Pull Request、审查已暂存/未暂存的更改、审查提交，
  或比较分支以发现代码质量问题时使用。生成行级审查评论，并可在请求时自动应用修复。
  配合适当的审查规则，可以检测各种类型的问题，包括缺陷、安全漏洞、性能问题和代码质量问题。
license: Apache-2.0
compatibility: >
  需要安装 `ocr` CLI（通过 `npm install -g
  @alibaba-group/open-code-review` 或 GitHub 发布二进制文件）。首次运行前需要配置
  一个 LLM（兼容 Anthropic 或 OpenAI）。
metadata:
  author: alibaba
  homepage: https://github.com/alibaba/open-code-review
  version: "1.0.0"
---

# 开放代码审查

此 Codex 插件技能有意镜像了 `skills/open-code-review/SKILL.md` 中的标准技能。更新 OCR 代理指令时，请保持两个文件同步；避免使用符号链接，因为插件安装可能只会具体化插件子树。

一个用于调用 [open-code-review](https://github.com/alibaba/open-code-review) (`ocr`) 的技能——这是一个开源的 AI 代码审查 CLI，它读取 Git 差异并生成结构化的、行级的审查评论。

## 前置条件检查

在开始审查之前，请验证环境：

```bash
# 1. 检查 CLI 是否已安装
which ocr || echo "未安装"

# 2. 验证 LLM 连接
ocr llm test
```

如果 `ocr` 未安装，请先安装：

```bash
npm install -g @alibaba-group/open-code-review
```

如果 `ocr llm test` 失败，用户必须配置一个 LLM。通过以下选项之一指导他们：

**选项 A — 环境变量（最高优先级，推荐用于 CI）：**

```bash
export OCR_LLM_URL=https://api.anthropic.com/v1/messages
export OCR_LLM_TOKEN=<api-key>
export OCR_LLM_MODEL=claude-opus-4-6
export OCR_USE_ANTHROPIC=true
```

**选项 B — 持久化配置：**

```bash
ocr config set llm.url https://api.anthropic.com/v1/messages
ocr config set llm.auth_token <api-key>
ocr config set llm.model claude-opus-4-6
ocr config set llm.use_anthropic true
```

在此处停止并请用户提供凭据——切勿编造或硬编码 API 密钥。

## 工作流程

### 步骤 1：收集业务上下文

分析审查目标（提交、分支或更改）以提取简洁的业务上下文。通过 `--background` 传递此上下文以提高审查质量。

### 步骤 2：运行代码审查

使用适当的标志运行 OCR 命令。**在可用时，始终通过 `--background` 传递业务上下文**：

```bash
ocr review --audience agent --background "此处填写业务上下文" [用户参数]
```

**参数处理：**

- **背景上下文**（推荐）：使用 `--background "上下文"` 或 `-b "上下文"` 提供业务上下文以获得更好的审查质量
- **默认**（无用户参数）：审查已暂存、未暂存和未跟踪的更改（工作区模式）
- **特定提交**：使用 `--commit` 或 `-c` 审查单个提交与其父提交的差异
- **分支比较**：使用 `--from <引用>` 和 `--to <引用>` 审查两个引用之间的差异
- **超时**：默认每个文件超时 10 分钟；使用 `--timeout <分钟>` 调整
- **并发**：默认并发为 8 个文件工作进程；如果遇到速率限制，使用 `--concurrency <n>` 减少
- **预览模式**：使用 `--preview` 或 `-p` 预览将要审查的文件，而无需运行 LLM
- **安装**：如果找不到 `ocr` 命令，请运行 `npm i -g @alibaba-group/open-code-review` 进行安装

**常见调用模式：**

| 用户说 | 要运行的命令 |
|-----------|---------------|
| “审查我的更改” / “审查工作副本” | `ocr review --audience agent -b "上下文"` |
| “审查这个 PR” / “审查功能分支” | `ocr review --audience agent -b "上下文" --from main --to <分支>` |
| “审查提交 abc123” | `ocr review --audience agent -b "上下文" --commit abc123` |
| “将审查什么？”（试运行） | `ocr review --preview` |

**输出模式：**

- 始终使用 `--audience agent` 以抑制进度 UI 并仅输出最终摘要

### 步骤 3：分类并报告

对于审查输出中的每条评论，按优先级分类并向用户报告所有问题：

- **高**：明显的缺陷、安全问题、明确的错误，或具有精确修复建议的有充分依据的建议
- **中**：合理但依赖上下文的担忧、风格/性能建议，或需要手动实施的修复
- **低**：可能是误报、缺乏足够上下文、吹毛求疵或无意义的建议

按优先级分组报告所有评论。

### 步骤 4：修复

在应用修复之前，检查用户是否请求了自动修复：

- 如果用户明确请求“审查并修复”或类似操作，则继续进行自动修复
- 如果用户仅请求“审查”而没有修复意图，请在应用任何更改前征求许可

修复问题和建议时：

- 专注于高优先级和中优先级项目
- 在安全且定义明确的情况下，直接将修复应用于代码
- 对于需要手动干预的复杂修复，清楚描述需要做什么
- 在提交之前，始终与用户验证修复

## 输出格式

每条评论包含：

- `path`：文件路径
- `content`：审查评论文本
- `start_line` / `end_line`：行范围（两者均为 0 表示定位失败）
- `suggestion_code`：可选的修复建议
- `existing_code`：可选的原始代码片段
- `thinking`：可选的 LLM 推理过程

按优先级过滤评论后，使用此模板呈现结果：

```markdown
## 代码审查结果

**已审查文件数**：N
**发现的问题数**：X 个高优先级 / Y 个中优先级

### 高优先级

- **`path/to/file.java:42`** — 简要描述
  > 建议：如何修复

### 中优先级

- **`path/to/file.ts:88`** — 简要描述
  > 建议：如何修复（如果适用）
```

如果过滤后审查未发现问题，只需说明：“审查完成——在 N 个文件中未发现问题。”

**优先级分类：**

- **高**：明显的缺陷、安全问题、明确的错误，或具有精确修复建议的有充分依据的建议
- **中**：合理但依赖上下文的担忧、风格/性能建议，或需要手动实施的修复
- **低**：静默丢弃（可能是误报、缺乏上下文、吹毛求疵或无意义的建议）

**处理定位失败的评论：**

当 `start_line` 和 `end_line` 均为 `0` 时，评论未能定位到文件中的确切位置。在这种情况下：

1. 阅读评论内容以理解问题
2. 检查评论中提到的目标文件
3. 根据评论的上下文识别相关的代码部分
4. 将修复或建议应用到正确的位置

## 自定义审查规则

如果用户想要项目特定的规则，OCR 按以下优先级顺序解析它们：

1. `--rule <路径>` 标志（最高）
2. `<仓库>/.opencodereview/rule.json`
3. `~/.opencodereview/rule.json`
4. 内置系统默认值（最低）

默认情况下，第一个匹配的用户规则会替换内置的系统规则。当匹配的系统规则和用户规则都应包含时，在规则条目上设置 `merge_system_rule: true`。

规则文件格式：

```json
{
  "rules": [
    {
      "path": "**/*.java",
      "rule": "所有新方法必须验证必需参数是否为空",
      "merge_system_rule": true
    },
    {
      "path": "**/*mapper*.xml",
      "rule": "检查 SQL 是否存在注入风险和缺失的闭合标签"
    }
  ]
}
```

要在审查前预览哪个规则适用于文件：

```bash
ocr rules check src/main/java/com/example/Foo.java
```

## 注意事项

- **必须首先配置 LLM** — 如果没有可用的 LLM，`ocr review` 将大声失败。在首次审查之前，始终运行 `ocr llm test`。
- **工作目录很重要** — `ocr review` 对当前目录下的 Git 仓库进行操作。使用 `--repo /path/to/repo` 从其他位置运行。
- **在工作区模式下会审查未跟踪的文件** — 直接运行 `ocr review` 会包含已暂存、未暂存*和*未跟踪的更改。如果需要更窄的范围，请有选择地暂存。
- **大型差异可能超出令牌限制** — 具有非常大差异的文件可能会被截断。默认的 `MAX_TOKENS` 为每个请求 58888。
- **计划阶段在 50 行时触发** — 超过 50 行更改的差异会在主审查之前运行一个额外的风险分析阶段。这会增加延迟但提高质量。
- **不要传递 `--audience human`** — 它会流式传输进度 UI，污染输出。始终使用 `--audience agent`。
- **评论语言遵循配置** — 将 `language` 配置设置为 `English` 或 `Chinese`（默认：Chinese）以控制审查评论的语言。

## 验证

审查完成后，通过检查以下内容来验证成功：

1. 命令以退出代码 0 结束
2. 生成了评论（或出现“未生成评论”消息）
3. 警告（如果有）显示在 stderr 中

如果发生错误，请检查 stderr 警告以了解哪些文件失败以及失败原因。

## 参考

- 完整文档：https://github.com/alibaba/open-code-review
- NPM 包：https://www.npmjs.com/package/@alibaba-group/open-code-review
- Issue 跟踪器：https://github.com/alibaba/open-code-review/issues