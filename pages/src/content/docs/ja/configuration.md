---
title: 配置
sidebar:
  order: 5
---

配置文件位于 `~/.opencodereview/config.json`。有三种编辑方式。

- **交互式 TUI** —— `ocr config provider` / `ocr config model`。会显示引导式菜单。
- **命令行** —— `ocr config set <key> <value>`。适用于脚本或 CI。
- **手动编辑（不推荐）** —— 直接编辑此 JSON 文件（下次执行 `ocr config set` 写入时会重新格式化）。

## 配置模型

### 推荐：交互式配置

```bash
ocr config provider
```

选择内置或自定义的 provider，输入 API key，选择 model，将所有内容保存到配置文件后，运行一次 `ocr llm test` 来验证端点。之后如需切换 model：

```bash
ocr config model
```

### 非交互式配置（CI / 无 TUI 环境）

使用 `ocr config set` 写入相同的配置。

```bash
ocr config set provider                    anthropic
ocr config set model                       claude-opus-4-6
ocr config set providers.anthropic.api_key sk-ant-xxxxxxxxxx
```

### 内置 provider

以下 provider 随 OCR 附带，已预设 Base URL 和协议——选择后只需输入 API key。如果 `providers.<name>.api_key` 未设置，将自动回退到相应的环境变量。

| 名称 | 协议 | Base URL | API key 环境变量 |
|---|---|---|---|
| `anthropic` | anthropic | `https://api.anthropic.com` | `ANTHROPIC_API_KEY` |
| `openai` | openai | `https://api.openai.com/v1` | `OPENAI_API_KEY` |
| `dashscope` | openai | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` |
| `dashscope-tokenplan` | openai | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_TOKENPLAN_KEY` |
| `volcengine` | openai | `https://ark.cn-beijing.volces.com/api/v3` | `ARK_API_KEY` |
| `deepseek` | openai | `https://api.deepseek.com` | `DEEPSEEK_API_KEY` |
| `tencent-tokenhub` | openai | `https://tokenhub.tencentmaas.com/v1` | `TENCENT_TOKENHUB_API_KEY` |
| `hy-tokenplan` | openai | `https://api.lkeap.cloud.tencent.com/plan/v3` | `TENCENT_HUNYUAN_TOKENPLAN_KEY` |
| `iflytek` | openai | `https://spark-api-open.xf-yun.com/v1` | `SPARK_API_KEY` |
| `kimi` | openai | `https://api.moonshot.cn/v1` | `MOONSHOT_API_KEY` |
| `z-ai` | openai | `https://open.bigmodel.cn/api/paas/v4` | `Z_AI_API_KEY` |
| `mimo` | openai | `https://api.xiaomimimo.com/v1` | `MIMO_API_KEY` |
| `minimax` | openai | `https://api.minimax.io/v1` | `MINIMAX_GLOBAL_API_KEY` |
| `minimax-cn` | openai | `https://api.minimaxi.com/v1` | `MINIMAX_API_KEY` |
| `baidu-qianfan` | openai | `https://qianfan.baidubce.com/v2` | `QIANFAN_API_KEY` |
| `siliconflow`  | openai | `https://api.siliconflow.com/v1` | `SILICONFLOW_GLOBAL_API_KEY` |
| `siliconflow-cn`  | openai | `https://api.siliconflow.cn/v1` | `SILICONFLOW_API_KEY` |
| `novita` | openai | `https://api.novita.ai/openai` | `NOVITA_API_KEY` |
| `xai` | openai | `https://api.x.ai/v1` | `XAI_API_KEY` |

### 覆盖内置 provider 的 Base URL

每个内置 provider 都有预设的 Base URL（见上表）。要将内置 provider 指向其他端点——例如，自建的 LiteLLM 网关，其地址通常与预设默认值 `http://localhost:4000/v1` 不同——请设置 `providers.<name>.url`：

```bash
ocr config set provider                   litellm
ocr config set model                      openai/gpt-5.4
ocr config set providers.litellm.api_key  "$LITELLM_API_KEY"
ocr config set providers.litellm.url      https://gateway.internal:8000/v1
```

设置的 `url` 优先于预设的 Base URL。如果 `providers.<name>.url` 未设置（或已删除），OCR 将回退到预设默认值——仅在端点不同时才需要设置。

### 自定义 provider

上表中未列出的 provider 名称均被视为自定义，至少需要指定 `url` 和 `protocol`（`protocol` 可以是 `anthropic`、`openai` 或 `openai-responses`）。

```bash
ocr config set provider                             my-gateway
ocr config set custom_providers.my-gateway.url      https://gateway.internal.com/v1
ocr config set custom_providers.my-gateway.protocol openai
ocr config set custom_providers.my-gateway.model    llama-3-70b
ocr config set custom_providers.my-gateway.api_key  "$MY_API_KEY"
```

如果 provider 或模型需要 OpenAI Responses API（`/v1/responses`），请使用 `openai-responses` 协议。

```bash
ocr config set provider                                               openai-responses-gateway
ocr config set custom_providers.openai-responses-gateway.url          https://api.openai.com/v1
ocr config set custom_providers.openai-responses-gateway.protocol     openai-responses
ocr config set custom_providers.openai-responses-gateway.model        gpt-5
ocr config set custom_providers.openai-responses-gateway.api_key      "$OPENAI_API_KEY"
```

`url` 可以指定 API 的 Base URL 或完整的 `/responses` 端点，OCR 会将两种格式都规范化。

在 Ollama 上运行的本地模型，本质上是指向本地 OpenAI 兼容端点的自定义 provider。

```bash
ocr config set provider                          ollama
ocr config set custom_providers.ollama.url       http://127.0.0.1:11434/v1
ocr config set custom_providers.ollama.protocol  openai
ocr config set custom_providers.ollama.model     qwen3:32b
ocr config set custom_providers.ollama.api_key   ollama
```

Ollama 会忽略 API key，但自定义 provider 需要非空的 `api_key`（自定义 provider 没有环境变量回退）。因此请设置任意占位符值。模型本身必须支持原生工具调用——选择前请参阅 FAQ 中的 ["No tool calls parsed"（本地模型 / Ollama）](../faq/#no-tool-calls-parsed-ollama)。

### 超时（Timeouts）

每个 LLM 请求都有 HTTP 超时，默认值为 **300 秒**。对于较慢的本地模型（或较大的文件），可能需要更长时间。按作用域从窄到宽，有三种设置。

- `providers.<name>.timeout_sec` / `custom_providers.<name>.timeout_sec` —— 按 provider 设置，单位为秒。
- `llm.timeout_sec` —— 用于旧版 `llm` 部分，单位为秒。
- `OCR_LLM_TIMEOUT` 环境变量 —— 整数（秒）。在所有解析路径中覆盖配置文件中的值。

`timeout_sec` 键不受 `ocr config set` 支持——请直接编辑 `~/.opencodereview/config.json`。

```json
{
  "custom_providers": {
    "ollama": { "url": "http://127.0.0.1:11434/v1", "protocol": "openai", "timeout_sec": 900 }
  }
}
```

### 额外的重试状态码

某些 LLM 提供商可能会用非标准的 4xx 状态码来表示临时错误，例如对速率限制返回 `403` 或 `400`。使用 `retry_codes`，OCR 将对这些请求使用现有 SDK 的重试机制。

`retry_codes` 是一个整数数组。可以设置在 `llm.retry_codes` 或 `custom_providers.<name>.retry_codes` 中。使用 `ocr config set` 时，用逗号分隔代码。

```bash
ocr config set llm.retry_codes 403,400
ocr config set custom_providers.my-gateway.retry_codes 403,400
```

只能指定 4xx 的 HTTP 状态码。`408`、`409`、`429` 由于 SDK 已经会重试，因此从配置文件读取时会被忽略。如果通过 `ocr config set` 指定，OCR 会发出警告并拒绝保存这些代码。5xx 响应也由 SDK 默认重试，因此不能添加到 `retry_codes` 中。

### 每个文件的提示词上限

OCR 默认在逐文件审查中使用 58,888 个 token 的提示词上限。对于具有更大上下文窗口的模型，可以保存 `max_tokens` 来提高上限。

```bash
ocr config set max_tokens 200000
```

此设置同时适用于 `ocr review` 和 `ocr scan`。如需在不更改已保存配置的情况下一次性覆盖，请使用 `--max-tokens`。

```bash
ocr review --max-tokens 200000
ocr scan --max-tokens 200000
```

运行时标志优先于 `max_tokens`。如果两者均未设置，OCR 将使用内置任务模板的默认值。此上限是按文件计算的，与模型的输出 token 上限以及限制整个运行 token 用量的 `--max-tokens-budget` 相互独立。要恢复内置默认值，请执行 `ocr config unset max_tokens`。

### 验证连接

```bash
ocr llm test
```

### 复用现有环境变量

如果已经设置了 Claude Code 的 `ANTHROPIC_*` 或 OCR 自有的 `OCR_LLM_*` 环境变量，OCR 会自动识别它们，因此无需编写配置文件。

### 使用 CC-Switch

如果使用启用了[路由服务](https://www.ccswitch.io/en/docs?section=proxy&item=service)的 [CC-Switch](https://github.com/farion1231/cc-switch)，只需将提供商的 `url` 指向本地代理，无需额外配置即可使用：

```bash
# Claude（Anthropic 兼容）
ocr config set providers.anthropic.url http://127.0.0.1:15721

# Codex / OpenAI 兼容 — 设置该提供商的 url 键
ocr config set providers.<name>.url http://127.0.0.1:15721/v1
```

`api_key` 可以是任意值。`extra_body`（以及其他提供商特定字段）仍然有效。

### 发送供应商特定字段

某些提供商需要非标准的请求字段（例如 Bedrock 风格的 `thinking`）。使用 `extra_body`（会合并到每个请求中），无需修改源代码即可发送这些字段。

```bash
ocr config set providers.anthropic.extra_body '{"thinking":{"type":"disabled"}}'
```

### 提示词缓存的会话亲和性

OCR 为每个 LLM 对话推导一个提示词缓存亲和性键（`<会话ID>-<任务类型>-<作用域哈希>`），其作用域限定于审查会话及其中的任务。由于提示词缓存按前缀匹配，每个对话的键会将不断增长的对话（例如逐文件审查工具循环）保持在一致的缓存节点上，而不是将整个运行固定到一个热键。键的会话 ID 前缀使您可以将提供商侧的缓存日志与 `ocr session` 的记录进行匹配。

若要启用，请将 `{ocr_session_key}` 模板变量嵌入到提供商期望键的位置的 `extra_headers` 或 `extra_body` 值中。OCR 会在每个请求中将其替换为该对话的键，如果未配置则不发送任何内容：

```bash
# 通过 OpenAI 格式的请求体字段传递（例如：prompt_cache_key）
ocr config set providers.openai.extra_body '{"prompt_cache_key": "{ocr_session_key}"}'

# 通过 HTTP 头传递（例如：x-session-affinity）
ocr config set custom_providers.my-gateway.extra_headers "x-session-affinity={ocr_session_key}"
```

## 配置审查语言

`language` 决定审查评论以何种语言输出。如果未设置，默认使用英语。

```bash
ocr config set language 中文
ocr config set language English
```

## 相关项目

- [快速开始](../quickstart/)——最小化设置和首次审查。
- [CLI 参考](../cli-reference/)——review 命令接受的各个参数。