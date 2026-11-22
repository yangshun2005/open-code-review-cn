---
title: 配置
sidebar:
  order: 5
---

配置文件位于 `~/.opencodereview/config.json`。可通过三种方式修改：

- **交互式 TUI** — `ocr config provider` / `ocr config model`，提供分步菜单。
- **命令行** — `ocr config set <key> <value>`，适合脚本和 CI。
- **手动编辑（不推荐）** — 直接修改 JSON 文件（下次通过 `ocr config set` 写入时格式会改变）。

## 模型配置

### 推荐方式：交互式配置

```bash
ocr config provider
```

该命令可选择内置或自定义提供商、输入 API 密钥并选择模型，将全部内容保存到配置文件，然后运行一次 `ocr llm test` 验证端点。之后如需更换模型：

```bash
ocr config model
```

### 非交互式配置（CI / 无 TUI 环境）

使用 `ocr config set` 将参数写入同一配置文件：

```bash
ocr config set provider                    anthropic
ocr config set model                       claude-opus-4-6
ocr config set providers.anthropic.api_key sk-ant-xxxxxxxxxx
```

### 内置提供商

以下提供商随 OCR 一起提供，已预置基础 URL 和协议。大多数需要 API 密钥。若未设置 `providers.<name>.api_key`，OCR 会使用对应的环境变量。`chatgpt` 提供商则使用 `ocr auth login` 创建的 ChatGPT 凭据。

| 名称 | 协议 | 基础 URL | API 密钥环境变量 |
|---|---|---|---|
| `anthropic` | anthropic | `https://api.anthropic.com` | `ANTHROPIC_API_KEY` |
| `bedrock` | anthropic-bedrock | 由 `aws_region` 决定 | —（AWS 凭据链） |
| `chatgpt` | openai-responses | `https://api.openai.com/v1` | 不适用（Sign in with ChatGPT） |
| `openai` | openai | `https://api.openai.com/v1` | `OPENAI_API_KEY` |
| `openai-responses` | openai-responses | `https://api.openai.com/v1` | `OPENAI_RESPONSES_API_KEY` |
| `openrouter` | openai | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| `gemini` | openai | `https://generativelanguage.googleapis.com/v1beta/openai` | `GEMINI_API_KEY` |
| `dashscope` | openai | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` |
| `dashscope-tokenplan` | openai | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_TOKENPLAN_KEY` |
| `volcengine` | openai | `https://ark.cn-beijing.volces.com/api/v3` | `ARK_API_KEY` |
| `deepseek` | openai | `https://api.deepseek.com` | `DEEPSEEK_API_KEY` |
| `tencent-tokenhub` | openai | `https://tokenhub.tencentmaas.com/v1` | `TENCENT_TOKENHUB_API_KEY` |
| `hy-tokenplan` | openai | `https://api.lkeap.cloud.tencent.com/plan/v3` | `TENCENT_HUNYUAN_TOKENPLAN_KEY` |
| `iflytek` | openai | `https://spark-api-open.xf-yun.com/v1` | `SPARK_API_KEY` |
| `kimi` | openai | `https://api.moonshot.cn/v1` | `MOONSHOT_API_KEY` |
| `kimi-global` | openai | `https://api.moonshot.ai/v1` | `MOONSHOT_GLOBAL_API_KEY` |
| `z-ai` | openai | `https://open.bigmodel.cn/api/paas/v4` | `Z_AI_API_KEY` |
| `mimo` | openai | `https://api.xiaomimimo.com/v1` | `MIMO_API_KEY` |
| `minimax` | openai | `https://api.minimax.io/v1` | `MINIMAX_GLOBAL_API_KEY` |
| `minimax-cn` | openai | `https://api.minimaxi.com/v1` | `MINIMAX_API_KEY` |
| `baidu-qianfan` | openai | `https://qianfan.baidubce.com/v2` | `QIANFAN_API_KEY` |
| `siliconflow` | openai | `https://api.siliconflow.com/v1` | `SILICONFLOW_GLOBAL_API_KEY` |
| `siliconflow-cn`  | openai | `https://api.siliconflow.cn/v1` | `SILICONFLOW_API_KEY` |
| `novita` | openai | `https://api.novita.ai/openai` | `NOVITA_API_KEY` |
| `xai` | openai | `https://api.x.ai/v1` | `XAI_API_KEY` |

内置提供商的模型列表仅作为 `ocr config model` 的提示，不限制 `--model`。若模型既不在内置列表中也不在 `providers.<name>.models` 中，OCR 会向 stderr 输出警告；提供商将在发送请求时校验模型。自定义提供商仍适用原有的 `--model` 校验规则。

为 `minimax` 和 `minimax-cn` 选择新模型时，优先推荐 `MiniMax-M3.1-Flash`，其次 `MiniMax-M3`。OCR 仍接受已保存的模型以及显式指定的已弃用或自定义标识符。网关有自己的标识符：模型在 MiniMax 直连 API 中存在，不代表可通过网关使用。

默认情况下请求不包含 `thinking` 和 `reasoning_effort`，因此使用 [MiniMax API 默认值](https://platform.minimax.io/docs/api-reference/text-openai-api)。Flash 需要自适应推理；effort 默认值为 `max`。可在 `extra_body` 中显式设置 `thinking: {"type":"adaptive"}` 和 `reasoning_effort`（值为 `low`、`medium`、`high`、`xhigh` 或 `max`）。M3 还支持 `thinking: {"type":"disabled"}`。已保存的 `extra_body` 不会自动更改：切换到 Flash 前请删除禁用推理的设置。

## ChatGPT 登录预览版

预览版新增了内置 `chatgpt` 提供商，用于公开 Responses API。没有 API 密钥环境变量。登录、同意和使用条款见 [ChatGPT 预览版指南](../chatgpt-preview/)。

使用 `ocr config set` 配置提供商和可选请求字段。通过 `ocr llm models` 选择模型，或显式指定其标识符：

```bash
ocr auth login --provider chatgpt
ocr config set provider chatgpt
ocr config set providers.chatgpt.model <model-slug>
ocr config set providers.chatgpt.extra_body '{"reasoning":{"effort":"low"}}'
ocr llm test
```

显式指定的模型即使不在账户列表中也会发送。`extra_body` 仅接受 `reasoning`、`text` 和 `prompt_cache_key`；URL、协议和凭据覆盖会被拒绝。

### 覆盖内置提供商的 Base URL

每个内置提供商都有预置 Base URL（见上表）。要将内置提供商指向其他端点——例如自建的 LiteLLM 网关，它通常不在预置地址 `http://localhost:4000/v1` 上——请设置 `providers.<name>.url`：

`chatgpt` 预览版是例外：公开地址固定，URL 覆盖会被拒绝。

```bash
ocr config set provider                   litellm
ocr config set model                      openai/gpt-5.4
ocr config set providers.litellm.api_key  "$LITELLM_API_KEY"
ocr config set providers.litellm.url      https://gateway.internal:8000/v1
```

设置的 `url` 优先于预置 Base URL。若未设置（或已清除）`providers.<name>.url`，OCR 会回退到预置默认值——因此仅当端点不同时才需设置。

### AWS Bedrock

默认情况下 `bedrock` 使用 `anthropic-bedrock` 协议，与 `anthropic` 相同的 Messages API，但请求通过标准 AWS 凭据链进行 SigV4 签名，而非传递 API 密钥，主机由区域决定。无需设置 `api_key`，也不接受其作为签名的替代：

```bash
ocr config set provider                      bedrock
ocr config set model                         us.anthropic.claude-sonnet-4-6
ocr config set providers.bedrock.aws_region  us-west-2
ocr config set providers.bedrock.aws_profile example-profile
```

若要将 `providers.bedrock.protocol` 设为 `openai` 以连接 OpenAI 兼容网关，请在 `providers.bedrock.url` 中指定网关地址，并通过 `providers.bedrock.api_key` 或 `providers.bedrock.api_key_cmd` 提供其 API 密钥。在 `ocr config provider` 中选择其他模型时，已保存的 API 密钥会保留。

| 字段 | 说明 |
|---|---|
| `providers.bedrock.aws_region` | 处理请求的 `bedrock-runtime` 主机所在区域。默认取 `AWS_REGION` 或活动配置文件。 |
| `providers.bedrock.aws_profile` | 用于获取凭据的命名配置文件。默认取 `AWS_PROFILE` 或环境链。 |

两个字段均为可选：未设置时由标准链决定，与其他 AWS 工具一致。显式固定可使运行可复现，无需预先导出 `AWS_PROFILE`——这在默认值不同的 CI 运行器上尤为重要。

模型标识符绑定到账户**和**区域，因此 OCR 附带的列表只是起点而非封闭集合：适合你账户的推理配置文件 ID 或应用推理配置文件 ARN 即使不在列表中也会被接受。运行 `aws bedrock list-inference-profiles --region <region>` 查看账户中可用的内容；新模型系列不接受 `-v1:0` 之类的版本后缀。

使用默认 `anthropic-bedrock` 协议时，`ocr llm test` 显示区域和配置文件而非 URL。主机由区域决定：

```
Source: provider:bedrock
Region: us-east-1
Profile: example-profile
Model:  claude-sonnet-5
✓ Connection test successful
```

通过 `llm.protocol` 和 `OCR_LLM_PROTOCOL` **无法**使用 bedrock。该配置块描述单个 URL 和单个令牌，无法指定区域或配置文件，而 bedrock 本身不使用这些值，因此该组合会被拒绝，而非接受后静默忽略。

### 自定义提供商

支持 `mimo-v2.6-flash` 和 `foo.api_key` 形式的名称。在设置带点的新名称字段前，先用 `ocr config set provider <name>` 创建并选择它；该命令会切换活动提供商。现有条目可通过 `providers.<name>.<field>` 或 `custom_providers.<name>.<field>` 编辑而无需选择。名称不得以点开头或结尾、包含连续点、空部分或仅含空格的部分。无点名称在配置字段时仍会隐式创建。

不在上表中的任何提供商名称均视为自定义。至少需设置 `url` 和 `protocol`（`protocol` 可取 `anthropic`、`openai`、`openai-responses` 或 `anthropic-bedrock`）：

支持 Chat Completions 的远程 OpenAI 兼容提供商使用 `protocol openai`。在 `url` 中填写服务文档中的 API 根地址，通常带 `/v1` 后缀；发送请求时 OCR 会追加 `/chat/completions`。此示例中自定义名称指向 OpenAI 公开 Chat Completions 端点：

```bash
ocr config set provider                                      openai-chat-gateway
ocr config set custom_providers.openai-chat-gateway.url      https://api.openai.com/v1
ocr config set custom_providers.openai-chat-gateway.protocol openai
ocr config set custom_providers.openai-chat-gateway.model    gpt-4.1
ocr config set custom_providers.openai-chat-gateway.api_key  "$OPENAI_API_KEY"
```

对于其他远程 OpenAI 兼容服务，使用相同字段：将 `url` 替换为其文档中的 API 根地址，`model` 替换为服务模型目录中的精确标识符。所选模型和端点必须支持内置工具调用，因为 OCR 通过 Chat Completions 传递工具。自定义提供商不会自动从环境变量获取 API 密钥，因此需显式设置 `api_key`（或配置 `api_key_cmd`）。通过 `ocr config set provider <name>` 选择提供商会切换活动提供商及 OCR 使用的提供商配置。

若提供商或模型需要 OpenAI Responses API（`/v1/responses`），请使用 `openai-responses`：

```bash
ocr config set provider                                               openai-responses-gateway
ocr config set custom_providers.openai-responses-gateway.url          https://api.openai.com/v1
ocr config set custom_providers.openai-responses-gateway.protocol     openai-responses
ocr config set custom_providers.openai-responses-gateway.model        gpt-5
ocr config set custom_providers.openai-responses-gateway.api_key      "$OPENAI_API_KEY"
```

使用 `anthropic-bedrock` 协议的自定义提供商无需 `url`——主机由区域决定——并接受与内置提供商相同的 AWS 字段。这样第二区域或配置文件可获得独立条目：

```bash
ocr config set provider                                bedrock-eu
ocr config set custom_providers.bedrock-eu.protocol    anthropic-bedrock
ocr config set custom_providers.bedrock-eu.aws_region  eu-west-1
ocr config set custom_providers.bedrock-eu.aws_profile eu-profile
ocr config set custom_providers.bedrock-eu.model       eu.anthropic.claude-sonnet-4-6
```

`url` 可填 API 基础 URL 或完整的 `/responses` 端点——OCR 会规范化两种形式。

通过 Ollama 运行的本地模型是普通自定义提供商，指向本地 OpenAI 兼容端点：

```bash
ocr config set provider                          ollama
ocr config set custom_providers.ollama.url       http://127.0.0.1:11434/v1
ocr config set custom_providers.ollama.protocol  openai
ocr config set custom_providers.ollama.model     qwen3:32b
ocr config set custom_providers.ollama.api_key   ollama
```

Ollama 忽略 API 密钥，但自定义提供商要求非空 `api_key`（它们没有环境变量回退），因此填写任意占位值。模型本身必须支持内置工具调用——选择模型前请阅读 FAQ 中的[「无法解析工具调用」（本地模型 / Ollama）](../faq/#no-tool-calls-parsed-local-models-ollama)一节。

### 超时

任务超时与单次请求超时相互独立：

- `ocr review --timeout` 和 `ocr scan --timeout` 设置并行任务的时间预算，单位为**分钟**（默认 **15**；`0` 禁用任务截止时间）。它包括该任务中的所有 LLM 调用、工具执行和重试等待。对于 review，预算会乘以由 effort 级别决定的检查轮数。
- 单次 HTTP 请求超时以**秒**为单位（默认 **300**）。增大 `--timeout` 不会改变它，禁用任务截止时间也不会禁用请求超时。若任务剩余预算更少，则以该预算为准。

每次 LLM HTTP 请求都有超时，默认 **300 秒**。较慢的本地模型（或大文件）可能需要更多时间。有三种作用域递增的设置：

- `providers.<name>.timeout_sec` / `custom_providers.<name>.timeout_sec` — 针对单个提供商，单位为秒。
- `llm.timeout_sec` — 针对已弃用的 `llm` 部分，单位为秒。
- 环境变量 `OCR_LLM_TIMEOUT` — 整数秒；对所有配置解析路径覆盖配置文件中的值。

两个 `timeout_sec` 键均可通过 `ocr config set` 设置：

```json
{
  "custom_providers": {
    "ollama": { "url": "http://127.0.0.1:11434/v1", "protocol": "openai", "timeout_sec": 900 }
  }
}
```

例如，`OCR_LLM_TIMEOUT=900 ocr review --timeout 30` 允许单次请求在任务预算内运行最多 15 分钟。若未设置该环境变量或 `timeout_sec`，即使 `--timeout 30`，请求仍会在 5 分钟后超时。

单次请求超时会终止调用且不自动重发，包括读取响应体或流时。对于持续缓慢的请求，应增大请求超时，而非以相同限制重试。SDK 现有重试策略不变：可重试的连接和 HTTP 错误按延迟及提供商 `Retry-After` 提示处理，最多 5 次重试。每次 SDK 尝试的截止时间也限制重试前的等待。任务取消或超时会停止请求及重试等待。

诊断会区分 `LLM request timeout`（检查 `OCR_LLM_TIMEOUT` 或提供商 `timeout_sec`）和 `caller deadline exceeded`：后者表示调用方操作的上下文已过期。若 review/scan 任务超时，检查 `--timeout`；其他操作（如后台记忆压缩和 `ocr llm test`）有自己的截止时间。

### 从命令获取 API 密钥

`api_key_cmd` 参数在运行时从密钥管理器（1Password、`pass`、`gopass 等）获取密钥，而非将其存储在配置文件中。密钥为命令 stdout 的单行输出，去除首尾空白。已弃用的 `llm` 部分也有相同参数，名为 `auth_token_cmd`。

```bash
```