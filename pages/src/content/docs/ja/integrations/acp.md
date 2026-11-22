---
title: ACP
sidebar:
  order: 6
---

## 前提条件 {#prerequisites}

- 安装 [OCR CLI](../../installation/) 并配置[审查模型](../../configuration/)。可用 `ocr llm test` 验证连接。
- 构建适配器需要检出包含 `acp/` 目录的源码、Git 以及 Go 1.26.10 或更高版本。构建父项目的 OCR CLI 也需要 Go 1.26.10 或更高版本。
- 使用支持 ACP v1 stdio 和自定义 Agent 启动命令的客户端。

适配器需与 OCR CLI 分开构建。以下步骤使用本地构建的版本。

## 构建并连接客户端 {#build-and-connect-your-client}

在仓库根目录执行。

```bash
make -C acp build
command -v ocr
```

构建产物为 `dist/ocr-acp`。将 `command -v ocr` 输出的绝对路径指定给 `--ocr-binary`。

在客户端的 Agent 配置中添加以下配置。将所有 `/absolute/path` 和解析模型的值替换为实际值。

```json
{
  "agent_servers": {
    "OpenCodeReview": {
      "type": "custom",
      "command": "/absolute/path/open-code-review/dist/ocr-acp",
      "args": ["--ocr-binary", "/absolute/path/ocr"],
      "env": {
        "OCR_ACP_PARSER_PROVIDER": "anthropic",
        "OCR_ACP_PARSER_MODEL": "deepseek-flash",
        "OCR_ACP_PARSER_BASE_URL": "https://your-gateway.example",
        "OCR_ACP_PARSER_API_KEY": "YOUR_PARSER_API_KEY"
      }
    }
  }
}
```

字段名因客户端而异，请参阅 ACP 配置说明。

## 执行审查与扫描 {#run-a-review-or-scan}

在 OpenCodeReview 会话中发送以下命令。

| 请求 | 命令 |
| --- | --- |
| 审查已暂存、未暂存和未跟踪的更改 | `/review` |
| 最多执行 1 轮审查 | `/review --effort low` |
| 审查当前检出的最新提交 | `/review --commit HEAD` |
| 比较两个已有引用 | `/review --from main --to HEAD` |
| 扫描目录 | `/scan --path internal/agent` |
| 扫描多个路径 | `/scan --path internal/agent,internal/config` |

请将示例中的引用和路径替换为项目中的实际值。审查需要 Git 仓库，指出的路径以该仓库根目录为基准解析。扫描使用会话的工作目录。`--effort low` 最多执行 1 轮审查，`medium` 最多 2 轮，`high` 最多 3 轮。若无新发现，可能提前结束。省略时沿用 OCR 的配置。减少轮数可能遗漏问题，请权衡速度与质量。

支持 ACP 命令补全的客户端中，输入 `/` 可查看命令和参数提示。不提供分支或路径的动态补全。若客户端附带本地文件链接，请与 `/scan` 一起发送并省略 `--path`。链接不能与 `/review` 或显式扫描路径同时使用。不支持或含义不明的链接将被拒绝，不会自动扩大扫描范围。

适配器仅接受以下 CLI 选项，不能直接传递任意选项。

- 审查：`--commit`、`--from`、`--to`、`--effort`、`--no-filter`、`--background`、`--background-file`。
- 扫描：`--path`、`--batch`、`--no-plan`、`--no-dedup`、`--no-summary`、`--background`。

审查全部更改请使用 `/review`。不支持 `--staged`。会话内命令不接受 `--format`、`--audience` 等输出选项，也不接受 `--repo`、`--model`、`--provider` 等覆盖选项。请在 OCR 侧配置审查模型。

## 启用自然语言请求 {#enable-natural-language-requests}

解析模型负责将自然语言请求转换为审查或扫描命令，或确认不明之处。它需与 OCR 的审查模型分开配置。仅选择客户端自身的模型不会配置这两个模型。

在 agent 的 `env` 对象中添加以下环境配置，并将模型和密钥占位符替换为提供商的值。

```json
{
  "OCR_ACP_PARSER_PROVIDER": "openai",
  "OCR_ACP_PARSER_MODEL": "YOUR_TOOL_CALLING_MODEL",
  "OCR_ACP_PARSER_API_KEY": "YOUR_PARSER_API_KEY"
}
```

此示例使用 OpenAI 兼容的 Chat Completions 协议。Anthropic Messages 协议请指定 `anthropic`。使用兼容网关时，还需在 `OCR_ACP_PARSER_BASE_URL` 中设置 API 基础 URL。凭据请保存在本地配置中，或通过 agent 进程的环境变量传递。不要包含在共享的项目配置中提交。GUI 应用可能不会继承终端中导出的环境变量。

基础 URL 的路径规则因协议而异。

| 协议 | `OCR_ACP_PARSER_BASE_URL` 示例 | 请求目标 |
| --- | --- | --- |
| `openai` | `https://gateway.example/v1` | `https://gateway.example/v1/chat/completions` |
| `anthropic` | `https://gateway.example` | `https://gateway.example/v1/messages` |

也可使用分别以 `/chat/completions` 或 `/v1/messages` 结尾的完整端点。此时不会追加相同后缀。Anthropic 的基础 URL 若以 `/v1` 结尾会变成 `/v1/v1/messages`，请按网关实际的 API 路径指定。

| 环境变量 | 启动标志 | 用途 |
| --- | --- | --- |
| `OCR_ACP_PARSER_PROVIDER` | `--parser-provider` | `openai` 或 `anthropic` |
| `OCR_ACP_PARSER_MODEL` | `--parser-model` | 支持工具调用的模型 |
| `OCR_ACP_PARSER_BASE_URL` | `--parser-base-url` | 覆盖 API 基础 URL（可选） |
| `OCR_ACP_PARSER_API_KEY` | 无 | 解析用 API 密钥。仅通过环境变量 |

启动标志优先于对应的环境变量。解析模型不读取 OCR 配置或 `OCR_LLM_*` 变量。支持的协议为 `openai` 和 `anthropic`，此处不能使用 `openai-responses` 和 `anthropic-bedrock`。

Anthropic 的解析请求因使用必需的 `submit_intent` 工具调用，会显式禁用 Thinking。不会更改 OCR 审查模型的 Thinking 设置。

配置解析模型后，请开始新会话进行尝试。

```text
请审查工作目录中的更改。
请审查当前检出的最新提交。
扫描 internal/agent，查找潜在缺陷。
```

请求不明确时，需先回答确认才能执行。已指示模型用与用户相同的语言返回问题和提示。固定的验证消息和报告标签仍为英文。解析模型不可用时，斜杠命令仍可使用。解析模型配置不完整时，启动会报出明确错误。

“当前检出的最新提交”对应 `/review --commit HEAD`。会话仅保留 1 个待确认请求。连续确认时保留多个兼容的已知字段，并优先采用显式指定的新值。不混用不同审查类型的字段。完成或取消后清除状态，不会恢复到其他会话。

## 查看结果与取消 {#read-results-and-cancel-work}

进度使用现有 OCR CLI 日志和最终 JSON，无需修改 CLI。显示最后报告的处理和总耗时。不推测显示分组阶段、各阶段耗时和模型响应等待时间。

单个 **OCR review** 或 **OCR scan** 项显示进度和本地测量的执行时间。展开后可查看 **Command:**、工作目录和大小受限的纯文本日志。诊断信息保留在详情中，不替换进度标题。命令和日志不会在会话正文中重复显示。初始展开状态由客户端决定。

最终报告以完成状态、文件数和发现数、按严重程度分类的计数开头。每条发现的标题显示编号、严重程度和文件位置，其下放置分类、说明和带语言标记的代码块。建议代码需注明未应用。发现仅在最终正文中显示一次。有效的文件位置会变为链接，不存在的文件、超出范围的行和工作根目录外的路径显示为普通文本。显示和点击行为取决于客户端版本。

部分失败的详情和预算上限通知会保留。末尾显示获取到的累计 Token 数和 OCR 报告的执行时间。执行详情还显示 OCR 提供的工具调用总数以及输入、输出、缓存 Token 数，不补全缺失的明细。实时计时器测量本地执行时间，可能与 OCR 报告的时间不同。Token 总数包含所有模型请求，而非仅新生成回答的 Token 数。

可通过客户端的取消操作停止。适配器会取消处理，并等待受管进程的终止处理完成。要为包含解析的整个回合设置时限，请在 agent 的 `args` 数组中添加 `"--turn-timeout", "10m"`。默认值为 `0`，即禁用整个回合的超时。解析另有默认 15 秒的限制。超时时适配器会提示重试。

## 故障排查 {#troubleshooting}

| 症状 | 检查事项 |
| --- | --- |
| agent 无法启动 | 检查两个可执行文件的绝对路径和执行权限。用 `ocr llm test` 检查 OCR 配置，删除不完整的解析模型配置，或指定所有必需的值。 |
| 斜杠命令可用，但自然语言不可用 | 另行设置 `OCR_ACP_PARSER_*` 环境变量。检查提供商、模型、密钥和网关 URL。 |
| 自然语言解析超时 | 解析默认限制为 15 秒，此阶段 OCR 尚未启动。根据诊断中的请求阶段、HTTP 状态和提供商响应排查原因。延长 `--turn-timeout` 不会延长解析本身的限制。可重试，或用 `/review`、`/scan` 绕过解析模型。 |
| 命令或标志被拒绝 | 使用上述支持的选项。用 `/scan --path` 代替 `/review --path`，提交或范围审查请指定已有的 Git 引用。 |
| 审查失败或仅返回部分结果 | 展开 OCR review/scan 查看诊断信息，阅读最终结果中的失败详情。检查 OCR 的模型配置和提供商运行状态。 |
| 无法点击结果位置 | 检查文件是否存在于处理目标根目录内，行范围是否有效。仅显示文本的回退是预期行为。 |
| 处理耗时过长 | 取消、查看进度详情，或设置整个回合的超时。审查可用 `--effort low` 减少轮数。 |
| 重新构建后仍为旧行为 | 检查配置的二进制路径，开始新的 agent 会话。若复用了旧进程，请重启 agent 或客户端。 |

连接有问题时，请查看客户端的 ACP 日志和适配器的 stderr。分享前请删除凭据和私有源码信息。

## 升级与支持范围 {#upgrade-and-support-boundaries}

更新源码检出，重新执行 `make -C acp build`，然后开始新的 OpenCodeReview 会话。运行中的进程和过往消息不会重新加载。不支持会话恢复。新会话不会继承等待回答的确认状态。

适配器目前使用本地 stdio 传输。不支持 HTTP 传输、额外的工作区根目录、文件自动编辑以及图像或音频提示。其他 ACP 客户端需各自验证兼容性。仅协议测试通过并不能确认所有客户端的界面行为。

## 相关项目 {#see-also}

- [配置](../../configuration/) — OCR 审查模型和提供商的配置。
- [CLI 参考](../../cli-reference/) — 审查和扫描的选项详情。
- [ACP 简介](https://agentclientprotocol.com/get-started/introduction) — Agent Client Protocol 官方简介。