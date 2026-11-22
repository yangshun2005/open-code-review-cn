---
title: ACP
sidebar:
  order: 6
---

## 前提条件 {#prerequisites}

- 安装 [CLI OCR](../../installation/) 并配置[评审模型](../../configuration/)。用 `ocr llm test` 验证。
- 构建适配器需要包含 `acp/` 目录的源代码、Git 和 Go 1.26.10+。构建 CLI OCR 本身也需要 Go 1.26.10+。
- 使用支持 ACP v1（通过 stdio）且可配置 agent 启动命令的客户端。

适配器与 CLI OCR 分开构建。以下说明假设在本地构建。

## 构建并连接客户端 {#build-and-connect-your-client}

在仓库根目录执行：

```bash
make -C acp build
command -v ocr
```

构建会生成 `dist/ocr-acp`。将 `command -v ocr` 输出的绝对路径填入 `--ocr-binary` 参数。

在客户端的 Agent 设置中添加以下配置。将所有 `/absolute/path` 和解析模型的值替换为你自己的值。

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

字段名称因客户端而异；请参阅其 ACP 配置说明。

## 运行评审或扫描 {#run-a-review-or-scan}

在 OpenCodeReview 对话中发送以下命令：

| 请求 | 命令 |
| --- | --- |
| 检查已索引、未索引和未跟踪的更改 | `/review` |
| 最多执行一轮评审 | `/review --effort low` |
| 检查当前工作副本的最后一个提交 | `/review --commit HEAD` |
| 比较两个已有的 Git 引用 | `/review --from main --to HEAD` |
| 扫描目录 | `/scan --path internal/agent` |
| 扫描多个路径 | `/scan --path internal/agent,internal/config` |

将示例中的 Git 引用和路径替换为你项目的值。评审需要 Git 仓库；问题位置相对于仓库根目录确定。扫描使用会话的工作目录。`--effort low` 最多执行一轮评审，`medium` 两轮，`high` 三轮。如果没有新问题，评审可能提前结束。未指定该标志时，使用 OCR 配置。轮数越少越可能遗漏问题：请根据任务权衡速度与质量。

在支持 ACP 命令提示的客户端中输入 `/` 可查看命令及其参数。没有分支和路径的动态自动补全。如果客户端附加了本地文件引用，请将其与 `/scan` 一起发送，不带 `--path`。引用不能与 `/review` 或显式扫描路径组合使用。不支持和有歧义的引用会被拒绝，而不会自动扩大扫描范围。

适配器接受一组固定的 CLI 参数，不会直接透传任意参数：

- 评审：`--commit`、`--from`、`--to`、`--effort`、`--no-filter`、`--background`、`--background-file`。
- 扫描：`--path`、`--batch`、`--no-plan`、`--no-dedup`、`--no-summary`、`--background`。

使用 `/review` 处理全部更改集；不支持 `--staged`。对话命令中不能设置输出参数（如 `--format` 和 `--audience`），也不能覆盖 `--repo`、`--model` 和 `--provider`。请通过 OCR 本身配置评审模型。

## 自然语言请求 {#enable-natural-language-requests}

解析模型将自然语言请求转换为评审或扫描命令，或提出澄清问题。它独立于 OCR 评审模型配置；选择客户端自带的模型不会配置其中任何一个。

将以下环境变量添加到 agent 的 `env` 对象中，用你的提供商数据替换模型和密钥值：

```json
{
  "OCR_ACP_PARSER_PROVIDER": "openai",
  "OCR_ACP_PARSER_MODEL": "YOUR_TOOL_CALLING_MODEL",
  "OCR_ACP_PARSER_API_KEY": "YOUR_PARSER_API_KEY"
}
```

示例使用 OpenAI 兼容的 Chat Completions 协议。对于 Anthropic Messages 协议，请指定 `anthropic`。使用兼容网关时，还需在 `OCR_ACP_PARSER_BASE_URL` 中设置其 API 基础 URL。将凭据保存在本地设置中或通过 agent 进程环境传递；不要将其添加到仓库中的共享项目设置中。图形应用可能不会继承终端中设置的环境变量。

基础 URL 的路径规则取决于协议：

| 协议 | `OCR_ACP_PARSER_BASE_URL` 示例 | 请求地址 |
| --- | --- | --- |
| `openai` | `https://gateway.example/v1` | `https://gateway.example/v1/chat/completions` |
| `anthropic` | `https://gateway.example` | `https://gateway.example/v1/messages` |

也可以指定以 `/chat/completions` 或 `/v1/messages` 结尾的完整地址：该后缀不会重复添加。以 `/v1` 结尾的 Anthropic 基础 URL 会得到 `/v1/v1/messages` 路径；请根据网关 API 指定路径。

| 环境变量 | 启动标志 | 用途 |
| --- | --- | --- |
| `OCR_ACP_PARSER_PROVIDER` | `--parser-provider` | `openai` 或 `anthropic` |
| `OCR_ACP_PARSER_MODEL` | `--parser-model` | 支持工具调用的模型 |
| `OCR_ACP_PARSER_BASE_URL` | `--parser-base-url` | 可选的 API 基础 URL 覆盖 |
| `OCR_ACP_PARSER_API_KEY` | 无 | 解析模型 API 密钥；仅通过环境变量 |

启动标志优先于对应的环境变量。解析模型不读取 OCR 配置和 `OCR_LLM_*` 变量。此处支持 `openai` 和 `anthropic` 协议；不支持 `openai-responses` 和 `anthropic-bedrock`。

在 Anthropic 解析请求中，为强制调用 `submit_intent` 工具，Thinking 模式被显式禁用。OCR 评审模型的 Thinking 设置不受影响。

配置解析模型后，开始新对话并尝试：

```text
检查我工作目录中的更改。
检查当前工作副本的最后一个提交。
扫描 internal/agent 中的潜在错误。
```

如果请求有歧义，请在开始执行前回答澄清问题。模型被指示用你的语言提问和解释；固定的验证消息和报告签名保持英文。如果解析模型不可用，斜杠命令仍可正常工作。解析模型配置不完整会导致启动时出现明确错误。

"当前工作副本的最后一个提交"对应 `/review --commit HEAD`。会话保存一个未完成的澄清请求，其中可能包含多个兼容字段。连续澄清会保留已知值，显式指定的新值会替换旧值。不同评审类型的字段不会混合。完成或取消后状态被清除，不会在其他会话中恢复。

## 结果与取消 {#read-results-and-cancel-work}

进度使用现有的 CLI OCR 日志和最终 JSON；无需修改 CLI。显示最后报告的操作和总执行时间。分组阶段、其持续时间以及等待模型响应的时间不做推测计算。

一条 **OCR review** 或 **OCR scan** 记录显示当前活动和适配器测量的时间。展开可查看 **Command:**、工作目录和大小受限的文本日志。诊断行保留在详情中，不替换进度标题。命令和日志不会在对话文本中重复；初始展开状态由客户端决定。

最终报告以完成状态、文件数和问题数以及严重性分布开头。每个问题的标题包含编号、严重性和文件位置；随后是类别、说明和带语言标注的代码块。建议明确标记为未应用。问题在最终消息中只出现一次。有效位置变为链接；不存在的文件、超出范围的行和工作根目录之外的路径保持为纯文本。显示和跳转取决于客户端版本。

部分失败和达到预算限制的信息会保留。报告末尾显示可用的总 token 数和 OCR 报告的时间。执行详情还包含工具调用次数以及输入、输出和缓存 token（如果 OCR 提供）。缺失值不会被编造。本地计时器可能与 OCR 时间不同；token 总数涵盖所有模型请求，而不仅仅是新生成的响应。

要停止正在执行的请求，请使用客户端中的取消功能。适配器会取消工作并等待受管进程结束。要限制整个请求的持续时间（包括解析），请在 agent 的 `args` 数组中添加 `"--turn-timeout", "10m"`。默认值为 `0`，表示禁用总超时。解析有单独的限制，默认 15 秒。超时后适配器会建议重试请求。

## 故障排除 {#troubleshooting}

| 症状 | 检查内容 |
| --- | --- |
| Agent 无法启动 | 检查两个可执行文件的绝对路径和执行权限。运行 `ocr llm test` 验证 OCR 配置；删除不完整的解析模型设置或设置所有必需的值。 |
| 斜杠命令可用，自然语言请求不可用 | 配置单独的 `OCR_ACP_PARSER_*` 环境变量。检查提供商、模型、密钥和网关 URL。 |
| 自然语言解析超时 | 解析默认限制为 15 秒；此时 OCR 尚未启动。在诊断中查看请求阶段、HTTP 状态和提供商响应。增大 `--turn-timeout` 不会延长解析自身的超时。重试请求或使用不带解析模型的 `/review`、`/scan`。 |
| 命令或标志被拒绝 | 使用上述列表中的支持参数。用 `/scan --path` 代替 `/review --path`；评审提交或范围时指定已有的 Git 引用。 |
| 评审失败或返回部分结果 | 展开 OCR review/scan 查看诊断并阅读最终错误信息。检查 OCR 模型配置和提供商可用性。 |
| 结果中的位置无法跳转 | 确认文件存在于操作根目录内且行范围正确。其余情况仅显示文本是刻意设计。 |
| 任务执行时间过长 | 取消它，查看执行进度详情或设置总超时。对于评审，`--effort low` 减少轮数。 |
| 重新构建后仍保留旧行为 | 检查设置中的可执行文件路径并开始新的 agent 对话。如果 agent 或客户端仍在使用旧进程，请重启。 |

连接问题请查看客户端的 ACP 日志和适配器的 stderr。在分享日志前删除凭据和敏感信息。

## 升级与支持边界 {#upgrade-and-support-boundaries}

更新源代码，再次执行 `make -C acp build`，并开始新的 OpenCodeReview 对话。活动进程和旧消息不会重新加载。不支持会话恢复；新对话开始时没有保存的未完成澄清。

适配器使用本地 stdio 传输。不支持 HTTP 传输、额外的工作区根目录、自动编辑文件以及图像或音频请求。其他 ACP 客户端需要自行验证兼容性；协议测试通过不能确认每个客户端界面的行为。

## 另请参阅 {#see-also}

- [配置](../../configuration/) — 评审模型和 OCR 提供商设置。
- [CLI 参考](../../cli-reference/) — 评审和扫描参数的详细信息。
- [ACP 简介](https://agentclientprotocol.com/get-started/introduction) — Agent Client Protocol 官方介绍。