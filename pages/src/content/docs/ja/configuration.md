---
title: 配置
sidebar:
  order: 5
---

配置文件位于 `~/.opencodereview/config.json`。有三种编辑方式。

- **交互式 TUI** —— `ocr config provider` / `ocr config model`。会显示引导式菜单。
- **命令行** —— `ocr config set <key> <value>`。适合脚本和 CI。
- **手动编辑（不推荐）** —— 直接编辑此 JSON 文件（下次 `ocr config set` 写入时会被重新格式化）。

## 配置模型

### 推荐：交互式配置

```bash
ocr config provider
```

选择内置或自定义 provider，输入 API key，选择 model，将所有内容保存到配置文件，然后运行一次 `ocr llm test` 验证端点。之后切换 model：

```bash
ocr config model
```

### 非交互式配置（CI / 无 TUI 环境）

用 `ocr config set` 写入相同的配置。

```bash
ocr config set provider                    anthropic
ocr config set model                       claude-opus-4-6
ocr config set providers.anthropic.api_key sk-ant-xxxxxxxxxx
```

### 内置 provider

以下 provider 随 OCR 内置，Base URL 和协议已预设。多数需要 API key。未设置 `providers.<name>.api_key` 时使用对应的环境变量。`chatgpt` 则使用通过 `ocr auth login` 创建的 ChatGPT 凭据。

| 名称 | 协议 | Base URL | API key 环境变量 |
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
| `siliconflow`  | openai | `https://api.siliconflow.com/v1` | `SILICONFLOW_GLOBAL_API_KEY` |
| `siliconflow-cn`  | openai | `https://api.siliconflow.cn/v1` | `SILICONFLOW_API_KEY` |
| `novita` | openai | `https://api.novita.ai/openai` | `NOVITA_API_KEY` |
| `xai` | openai | `https://api.x.ai/v1` | `XAI_API_KEY` |

内置 provider 的模型列表是 `ocr config model` 的候选项，不用于限制 `--model`。指定既不在内置列表也不在 `providers.<name>.models` 中的模型时，OCR 会向 stderr 输出警告。模型由 provider 在发送请求时验证。自定义 provider 仍适用原有的 `--model` 验证规则。

`minimax` 和 `minimax-cn` 的新模型选择按 `MiniMax-M3.1-Flash`、`MiniMax-M3` 的顺序显示候选项。已保存的模型以及显式指定的旧模型、自定义模型 ID 仍会被 OCR 接受。网关有自己特有的模型 ID，MiniMax 直连用的 ID 不一定可用。

默认请求省略 `thinking` 和 `reasoning_effort`，使用 [MiniMax API 的默认值](https://platform.minimax.io/docs/api-reference/text-openai-api)。Flash 必须使用 adaptive thinking，effort 默认值为 `max`。在 `extra_body` 中可指定 `thinking: {"type":"adaptive"}` 以及 `low`、`medium`、`high`、`xhigh`、`max` 之一的 `reasoning_effort`。M3 还支持 `thinking: {"type":"disabled"}`。已保存的 `extra_body` 会被保留，因此切换到 Flash 前请删除禁用 thinking 的配置。

## ChatGPT 登录预览

此预览新增了用于公开 Responses API 的内置 `chatgpt` provider。没有 API key 环境变量。登录、同意和用量限制请参阅 [ChatGPT 预览指南](../chatgpt-preview/)。

用 `ocr config set` 设置 provider 和任意请求字段。从 `ocr llm models` 中选择，或显式指定模型 slug：

```bash
ocr auth login --provider chatgpt
ocr config set provider chatgpt
ocr config set providers.chatgpt.model <model-slug>
ocr config set providers.chatgpt.extra_body '{"reasoning":{"effort":"low"}}'
ocr llm test
```

不在账户专属列表中的模型，只要显式指定也会发送。`extra_body` 仅接受 `reasoning`、`text`、`prompt_cache_key`。端点、协议、凭据的覆盖会被拒绝。

### 覆盖内置 provider 的 Base URL

每个内置 provider 都有预设 Base URL（见上表）。要将内置 provider 指向其他端点——例如自建 LiteLLM 网关，其地址通常不同于预设默认值 `http://localhost:4000/v1`——请设置 `providers.<name>.url`：

`chatgpt` 预览是例外。公开端点固定，URL 覆盖会被拒绝。

```bash
ocr config set provider                   litellm
ocr config set model                      openai/gpt-5.4
ocr config set providers.litellm.api_key  "$LITELLM_API_KEY"
ocr config set providers.litellm.url      https://gateway.internal:8000/v1
```

设置的 `url` 优先于预设 Base URL。未设置（或删除）`providers.<name>.url` 时，OCR 回退到预设默认值——仅在端点不同时才需要设置。

### AWS Bedrock

`bedrock` 使用默认的 `anthropic-bedrock` 协议，与 `anthropic` 相同的 Messages API，但不使用 API key，而是从标准 AWS 凭据链进行 SigV4 签名，主机由区域决定。没有需要设置的 `api_key`，也不接受其作为签名的替代。

```bash
ocr config set provider                      bedrock
ocr config set model                         us.anthropic.claude-sonnet-4-6
ocr config set providers.bedrock.aws_region  us-west-2
ocr config set providers.bedrock.aws_profile example-profile
```

若要将 `providers.bedrock.protocol` 设为 `openai` 以连接 OpenAI 兼容网关，请设置 `providers.bedrock.url` 为网关 URL，并通过 `providers.bedrock.api_key` 或 `providers.bedrock.api_key_cmd` 指定其 API key。通过 `ocr config provider` 更改模型时，已保存的 API key 会被保留。

| 字段 | 含义 |
|---|---|
| `providers.bedrock.aws_region` | 处理请求的 `bedrock-runtime` 主机区域。未设置时回退到 `AWS_REGION` 或有效配置文件。 |
| `providers.bedrock.aws_profile` | 用于解析凭据的命名配置文件。未设置时回退到 `AWS_PROFILE` 或周围链。 |

两者均可选。未设置时与其他 AWS 工具一样由标准链决定。显式固定后，无需先导出 `AWS_PROFILE` 即可复现运行，在默认值不同的 CI 运行器上尤其有效。

模型标识符的作用域是账户**和**区域，因此 OCR 内置的列表只是起点而非封闭集合。账户中有效的推理配置文件 ID 或应用程序推理配置文件 ARN，即使不在列表中也会被接受。可用 `aws bedrock list-inference-profiles --region <region>` 查看该账户提供的内容。注意新系列中 `-v1:0` 之类的版本后缀无效。

默认的 `anthropic-bedrock` 协议中主机由区域决定，因此 `ocr llm test` 显示区域和配置文件而非 URL。

```
Source: provider:bedrock
Region: us-east-1
Profile: example-profile
Model:  claude-sonnet-5
✓ Connection test successful
```

`llm.protocol` 和 `OCR_LLM_PROTOCOL` **不能**选择 bedrock。该块只描述一个 URL 和一个 token，没有放置区域或配置文件的位置，bedrock 也不会使用其中的任何值。因此会显式拒绝，而非静默忽略。

### 自定义 provider

可以使用 `mimo-v2.6-flash` 或 `foo.api_key` 这样的名称。在设置含点的新名称字段之前，先用 `ocr config set provider <name>` 创建并选择它。此操作会更改当前 provider。现有条目可在不选择的情况下通过 `providers.<name>.<field>` 或 `custom_providers.<name>.<field>` 编辑。名称开头/结尾的点、连续的点、空或仅含空白的分隔部分不可使用。不含点的名称在设置字段时仍会自动创建。

上表之外的 provider 名称均视为自定义，至少需要指定 `url` 和 `protocol`（`protocol` 为 `anthropic`、`openai`、`openai-responses` 或 `anthropic-bedrock`）。

实现 Chat Completions 的远程 OpenAI 兼容 provider 使用 `protocol openai`。`url` 指定服务文档中记载的 API 路由（通常是 `/v1` 结尾的 URL）。OCR 在发送请求时追加 `/chat/completions`。以下示例以自定义名称注册 OpenAI 的公开 Chat Completions 端点。

```bash
ocr config set provider                                      openai-chat-gateway
ocr config set custom_providers.openai-chat-gateway.url      https://api.openai.com/v1
ocr config set custom_providers.openai-chat-gateway.protocol openai
ocr config set custom_providers.openai-chat-gateway.model    gpt-4.1
ocr config set custom_providers.openai-chat-gateway.api_key  "$OPENAI_API_KEY"
```

其他远程 OpenAI 兼容服务使用相同字段。将 `url` 替换为服务文档中的 API 路由，`model` 替换为模型目录中的准确 ID。所选模型和端点必须支持原生工具调用，因为 OCR 通过 Chat Completions 发送工具。自定义 provider 没有 API key 环境变量回退，因此请显式设置 `api_key` 或设置 `api_key_cmd`。通过 `ocr config set provider <name>` 选择 provider 会更改活动 provider 及 OCR 使用的 provider 配置。

若 provider 或模型需要 OpenAI Responses API（`/v1/responses`），请使用 `openai-responses` 协议。

```bash
ocr config set provider                                               openai-responses-gateway
ocr config set custom_providers.openai-responses-gateway.url          https://api.openai.com/v1
ocr config set custom_providers.openai-responses-gateway.protocol     openai-responses
ocr config set custom_providers.openai-responses-gateway.model        gpt-5
ocr config set custom_providers.openai-responses-gateway.api_key      "$OPENAI_API_KEY"
```

`anthropic-bedrock` 协议的自定义 provider 不需要 `url`（主机由区域决定）。它接受与内置相同的 AWS 字段，因此可将第二个区域或配置文件作为单独条目。

```bash
ocr config set provider                                bedrock-eu
ocr config set custom_providers.bedrock-eu.protocol    anthropic-bedrock
ocr config set custom_providers.bedrock-eu.aws_region  eu-west-1
ocr config set custom_providers.bedrock-eu.aws_profile eu-profile
ocr config set custom_providers.bedrock-eu.model       eu.anthropic.claude-sonnet-4-6
```

`url` 可指定 API 的 Base URL 或完整的 `/responses` 端点，OCR 会规范化两种形式。

在 Ollama 上运行的本地模型只是指向本地 OpenAI 兼容端点的自定义 provider。

```bash
ocr config set provider                          ollama
ocr config set custom_providers.ollama.url       http://127.0.0.1:11434/v1
ocr config set custom_providers.ollama.protocol  openai
ocr config set custom_providers.ollama.model     qwen3:32b
ocr config set custom_providers.ollama.api_key   ollama
```

Ollama 会忽略 API key，但自定义 provider 需要非空的 `api_key`（自定义 provider 没有环境变量回退）。因此请设置任意占位值。模型本身必须支持原生工具调用——选择前请参阅 FAQ 的 ["No tool calls parsed"（本地模型 / Ollama）](../faq/#no-tool-calls-parsed-ollama)。

### 超时（Timeouts）

任务时限与请求级超时相互独立。

- `ocr review --timeout` 和 `ocr scan --timeout` 以**分钟**为单位设置并行任务的时限（默认 **15**，`0` 禁用任务期限）。该时间包含任务内所有 LLM 调用、工具执行和重试等待。review 中会乘以与 effort 对应的评审轮数。
- HTTP 请求级超时以**秒**为单位（默认 **300**）。增大 `--timeout` 不会改变它，禁用任务期限也不会禁用请求超时。若任务剩余时间更短，则以该时间为准。

每个 LLM 请求都有 HTTP 超时，默认 **300 秒**。较慢的本地模型（或大文件）可能需要更长时间。按作用域从窄到宽有三个设置。

- `providers.<name>.timeout_sec` / `custom_providers.<name>.timeout_sec` —— 按 provider，单位为秒。
- `llm.timeout_sec` —— 用于旧版 `llm` 段，单位为秒。
- `OCR_LLM_TIMEOUT` 环境变量 —— 整数（秒）。在所有解析路径上覆盖配置文件的值。

两个 `timeout_sec` key 都可通过 `ocr config set` 设置：

```json
{
  "custom_providers": {
    "ollama": { "url": "http://127.0.0.1:11434/v1", "protocol": "openai", "timeout_sec": 900 }
  }
}
```

例如，`OCR_LLM_TIMEOUT=900 ocr review --timeout 30` 允许在任务时限内单个请求最长运行 15 分钟。若既未设置该环境变量也未设置 `timeout_sec`，即使指定 `--timeout 30`，请求也会在 5 分钟时超时。

超过请求级期限时，调用会终止而不会自动重发。读取响应正文或流时超时同理。对于总是耗时的请求，应延长请求超时，而不是用相同时限重试。现有 SDK 的重试策略不变。对于可重试的连接错误或 HTTP 错误，按退避和提供商的 `Retry-After` 指示最多重试 5 次。SDK 的每次尝试期限也适用于重试等待时间。取消或任务过期会同时停止请求和重试等待。

诊断消息区分 `LLM request timeout`（检查 `OCR_LLM_TIMEOUT` 或 provider 的 `timeout_sec`）和 `caller deadline exceeded`。后者表示调用方处理上下文的期限已到。若是 review/scan 任务过期，请检查 `--timeout`。后台内存压缩和 `ocr llm test` 等处理各有独立期限。

### 通过命令获取 API key

不将 key 保存到配置文件，而用 `api_key_cmd` 在运行时从密钥管理器（1Password、`pass`、`gopass` 等）获取。去除前后空白后的单行 stdout 即为 key。旧版 `llm` 块也有等效的 `auth_token_cmd`。

```bash
ocr config
```