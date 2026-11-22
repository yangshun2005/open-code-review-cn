---
name: open-code-review
description: >
  使用 OCR 原生审查流水线和独立配置的模型提供方，审查工作区变更、PR、提交或分支对比。
  产出行级问题；仅在用户要求时修复代码。适用于用户需要原生模式或已配置 OCR 提供方的场景。
  若想使用宿主 Agent 的模型而无需单独的 OCR 凭证，请改用 open-code-review-delegate。
license: Apache-2.0
compatibility: >
  需要安装 `ocr` CLI（通过 `npm install -g @alibaba-group/open-code-review` 或 GitHub release 二进制）。
  首次运行前需配置受支持的 LLM 提供方（协议：Anthropic、OpenAI Chat Completions、OpenAI Responses、AWS Bedrock）。
metadata:
  author: alibaba
  homepage: https://github.com/alibaba/open-code-review
  version: "1.0.0"
---

# Open Code Review

## 工作流程

### 第 1 步：收集业务上下文

分析审查目标（提交、分支或变更），提取简明的业务上下文。通过 `--background` 传入该上下文以提升审查质量。

### 第 2 步：运行代码审查

**不要预先检查 `ocr` 是否已安装**——跳过 `command -v ocr` 或 `ocr --version` 之类的探测。假定 CLI 可用并直接运行审查，这样在常见路径上可省去一次工具调用。仅当审查因 `command not found` 失败时，才按故障排查部分安装。

使用合适的参数运行 OCR 命令。**有业务上下文时始终通过 `--background` 传入**：

```bash
ocr review --audience agent --background "business context here" [user-args]
```

**参数处理：**

- **背景上下文**（推荐）：使用 `--background "context"` 或 `-b "context"` 提供业务上下文，以提升审查质量
- **默认**（无用户参数）：审查已暂存、未暂存和未跟踪的变更（工作区模式）
- **指定提交**：使用 `--commit` 或 `-c` 审查单个提交与其父提交的差异
- **分支对比**：使用 `--from <ref>` 和 `--to <ref>` 审查两个引用之间的差异
- **当前分支对比基线**：`--from <ref>` 默认目标为 `HEAD`，等价于 `--from <ref> --to HEAD`。这会审查从 merge-base 到 HEAD 的已提交变更，不含已暂存、未暂存和未跟踪的变更。两个引用都省略则审查工作区变更。
- **超时**：每个审查组的有效超时 = `--timeout` × 审查轮数。默认 `--timeout 15` 配合默认强度 `medium`（2 轮）为 30 分钟；`low`/`high` 分别为 15/45 分钟。
- **并发**：默认并发为 8 个文件 worker；若触发速率限制，可用 `--concurrency <n>` 降低
- **预览模式**：使用 `--preview` 或 `-p` 预览将审查哪些文件，不调用 LLM
- **输出文件**：使用 `--output <path>` 将完整结果写入文件而非 stdout。若命令因 `unknown flag: --output` 失败，不要继续用普通 stdout 审查。询问用户是否升级（`npm i -g @alibaba-group/open-code-review@latest`），等待答复后再继续。用户确认且升级成功后，用 `--output` 重新运行。
- **安装**：若找不到 `ocr` 命令，运行 `npm i -g @alibaba-group/open-code-review` 安装

**常见调用模式：**

| 用户说 | 运行的命令 |
|-----------|---------------|
| "review my changes" / "review the working copy" | `ocr review --audience agent -b "context"` |
| "review this PR" / "review feature branch" | `ocr review --audience agent -b "context" --from main --to <branch>` |
| "review the current branch against main" | `ocr review --audience agent -b "context" --from main` |
| "review commit abc123" | `ocr review --audience agent -b "context" --commit abc123` |
| "what would be reviewed?"（试运行） | `ocr review --preview` |

**输出模式：**

- 始终使用 `--audience agent` 以抑制进度 UI，仅输出最终摘要
- **防止输出截断**：对于大型审查或受限工具环境，传入 `--output /tmp/ocr_out.txt`，并用文件读取工具完整查看文件，而不是将 stdout 通过 `tail` 或 `head` 管道处理，后者会丢弃较早的审查评论。

**失败时：** 若 `ocr review` 以非零退出（例如 LLM 连接错误），不要盲目重试——查阅下方故障排查部分找到对应修复后再重新运行。

### 第 3 步：报告

OCR 输出中每条评论都包含结构化的 `severity`（critical / high / medium / low）和 `category`（bug / security / performance / maintainability / test / style / documentation / other）。按严重程度分组呈现结果，丢弃 `low` 严重程度中可能是误报或吹毛求疵的条目。

### 第 4 步：修复

应用修复前，检查用户是否要求自动修复：

- 若用户明确要求"审查并修复"或类似表述，则进行自动修复
- 若用户仅要求"审查"而无修复意图，应用任何更改前先征求许可

修复问题和建议时：

- 聚焦 critical、high 和 medium 严重程度的条目
- 在安全且定义明确时直接对代码应用修复
- 对于需要人工干预的复杂修复，清楚描述需要做什么
- 提交前始终与用户确认修复

## 输出格式

OCR 输出中的每条评论包含：

- `path`：文件路径
- `content`：审查评论文本
- `start_line` / `end_line`：行范围（均为 0 表示定位失败）
- `category`：问题类别（bug、security、performance、maintainability、test、style、documentation、other）
- `severity`：问题严重程度（critical、high、medium、low）
- `suggestion_code`：可选的修复建议
- `existing_code`：可选的原始代码片段
- `thinking`：可选的 LLM 推理过程

使用以下模板按严重程度分组呈现结果：

```markdown
## Code Review Results

**Files reviewed**: N
**Issues found**: X critical, Y high, Z medium

### Critical

- **`path/to/file.java:42`** [bug] — Brief description
  > Recommendation: How to fix

### High

- **`path/to/file.java:26`** [bug] — Brief description
  > Recommendation: How to fix

### Medium

- **`path/to/file.ts:88`** [performance] — Brief description
  > Recommendation: How to fix (if applicable)
```

若过滤后没有剩余的 critical、high 或 medium 严重程度问题，则说明："Review complete — no critical, high, or medium issues found in N files."

**处理定位错误的评论：**

当 `start_line` 和 `end_line` 均为 `0` 时，评论未能定位到文件中的确切位置。此时：

1. 阅读评论内容以理解问题
2. 检查评论中提到的目标文件
3. 根据评论上下文识别相关代码段
4. 将修复或建议应用到正确位置

## 自定义审查规则

若用户需要项目特定规则，OCR 按以下优先级解析：

1. `--rule <path>` 标志（最高）
2. `<repo>/.opencodereview/rule.json`
3. `~/.opencodereview/rule.json`
4. 内置系统默认（最低）

默认情况下，第一个匹配的用户规则会替换内置系统规则。当匹配的系统规则和用户规则都应包含时，在规则条目上设置 `merge_system_rule: true`。

规则文件格式：

```json
{
  "rules": [
    {
      "path": "**/*.java",
      "rule": "All new methods must validate required parameters for null",
      "merge_system_rule": true
    },
    {
      "path": "**/*mapper*.xml",
      "rule": "Check SQL for injection risks and missing closing tags"
    }
  ]
}
```

审查前预览某文件适用哪条规则：

```bash
ocr rules check src/main/java/com/example/Foo.java
```

## 高级审查选项

除上述常见标志外，`ocr review` 还提供几组控制项。运行 `ocr review --help` 查看完整列表。

**范围控制**

- `--exclude '<patterns>'` — 逗号分隔的 gitignore 风格模式（例如 `--exclude '**/generated/*,**/testdata/*'`），与 `rule.json` 的排除项合并。
- `--background-file <path>` — 从 Markdown 文件读取审查上下文。优先于 `--background`。

**输出**

- `--format text|json|sarif` — `text`（默认）供人阅读；`json` 供机器读取的问题；`sarif` 用于代码扫描集成，如 GitHub Code Scanning。

**模型**

- `--provider <name>` / `--model <name>` — 仅本次运行覆盖已配置的提供方/模型（例如用不同模型复查差异；用户指定模型名，`ocr llm providers` 列出内置项）。

**预算**

- `--max-tokens <n>` — 每组提示词上限；默认为配置值或模板默认值（`200000`）。
- `--max-tokens-budget <n>` — 限制本次运行的输入 + 输出 token 总量。每轮 LLM 前检查：已超预算的组获得最后一轮提交问题，不再派发新组，部分结果仍会发布，跳过的文件报告为 `failed(budget)`。
- `--no-filter` — 保留所有审查评论，跳过 LLM 后置过滤调用。

## 注意事项

- **必须先配置 LLM** — 若无可用 LLM，`ocr review` 会明确失败。若发生此情况，见下方故障排查部分。
- **工作目录很重要** — `ocr review` 操作当前目录的 Git 仓库。从其他位置运行请用 `--repo /path/to/repo`。
- **工作区模式会审查未跟踪文件** — 直接运行 `ocr review` 会包含已暂存、未暂存*和*未跟踪的变更。若想缩小范围，请选择性暂存。
- **大型差异可能触及 token 限制** — `MAX_TOKENS` 设置提示词预算（审查模板中为 `200000`；`ocr scan` 使用 `58888`）；对话上下文会被压缩以保持在此提示词预算内。模型输出由 `MAX_COMPLETION_TOKENS`（`16384`）单独限制。若某文件的差异本身超过 `MAX_TOKENS` 的约 80%，会在调用 LLM 前被跳过。
- **计划阶段由两个阈值之一触发** — 当组内最大变更文件达到 `PLAN_MODE_LINE_THRESHOLD`（默认 `50`）**或**组内有 2 个以上文件合计变更行数达到 `PLAN_MODE_GROUP_LINE_THRESHOLD`（默认 `100`）时，该组会在主审查前额外运行风险分析阶段。这会增加延迟但提升质量。
- **不要传 `--audience human`** — 它会流式输出进度 UI 污染输出。始终使用 `--audience agent`。
- **评论语言跟随配置** — `language` 配置控制审查评论语言，默认 `English`，接受任意语言名（例如 `English` 或 `中文`）。
- **避免输出截断** — 大型审查会产生冗长输出。切勿将命令输出管道到 `tail` 或 `head`，否则会丢弃较早部分的审查评论。使用 `--output <path>` 并完整读取；在较旧 CLI 上，遵循上方**输出文件**指引。
- **恢复中断的审查** — 失败或中断的范围/提交审查可用 `ocr review --resume <id>` 继续，使用相同的 `--from`/`--to` 或 `--commit` 目标（失败时 id 会打印为 `retry with: --resume <id>`，或用 `ocr session list` 查找）。不支持工作区恢复。

## 验证

审查完成后，通过以下检查验证成功：

1. 命令以代码 0 退出
2. 生成了评论（或出现 "No comments generated" 消息）
3. 警告（如有）显示在 stderr 中

若发生错误，检查 stderr 警告以了解哪些文件失败及原因。

## 故障排查

**`ocr: command not found`**

安装 CLI：

```bash
npm install -g @alibaba-group/open-code-review
```

**`unknown flag: --output`**

CLI 版本低于 v1.10.0。不要继续用普通 stdout 审查。询问用户是否升级（`npm i -g @alibaba-group/open-code-review@latest`），等待答复后再继续。用户确认且升级成功后，用 `--output` 重新运行。

**`ocr review` 因 LLM 连接错误失败**

若 OCR 凭证不可用，提供 `open-code-review-delegate` 而非要求新密钥。若该 skill 缺失，提供 `npx skills add alibaba/open-code-review --skill open-code-review-delegate`。未经用户同意不要切换模式。要在原生模式继续，诊断提供方连接或在下方配置；宿主 Agent 登录不是 OCR 凭证。

交互式设置（推荐）：

```bash
ocr config provider
```

手动设置（备选）：

```bash
ocr config set llm.url https://api.anthropic.com/v1/messages
ocr config set llm.auth_token <api-key>
ocr config set llm.model claude-opus-4-6
ocr config set llm.use_anthropic true
```

用 `ocr llm test` 验证连通性。若原生模式需要凭证，请用户在本地配置，而非将密钥粘贴到对话中。切勿编造或硬编码 API 密钥。

## 参考

- 完整文档：https://github.com/alibaba/open-code-review
- NPM 包：https://www.npmjs.com/package/@alibaba-group/open-code-review
- Issue 跟踪：https://github.com/alibaba/open-code-review/issues