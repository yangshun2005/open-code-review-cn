---
title: MCP 服务器
sidebar:
  order: 10
---

OCR 可作为 **Model Context Protocol (MCP) 客户端**运行。指定一个或多个外部 MCP 服务器后，它们提供的工具将与 `file_read`、`code_search` 等[内置工具](../tools/)一同提供给审查代理。

MCP 为专用代理补充外部业务上下文，但无法覆盖内置工具的名称或定义。目前 MCP 已接入 `ocr review`，尚未接入 `ocr scan`。基准测试结果仅适用于经过验证的代理配置，不适用于任意 MCP 服务器组合。

优先使用上下文读取工具，并配置最小化的 `tools` 允许列表。OCR 不为 MCP 工具提供"只读"模式：连接前请核实服务器权限和数据访问范围。

## 何时使用 MCP

当审查者需要 diff 之外的上下文时，可连接 MCP 服务器：

- **任务/工单检索** — 代理可获取关联的 Jira 或 GitHub 任务，检查变更是否符合声明的需求。
- **文档/知识库** — 加载内部 API 文档或编码规范，使评论引用组织现行规则。
- **自定义分析** — 将 linter、Schema 校验器或依赖检查工具作为工具提供，供审查者按需调用。

如果只需读取仓库，内置工具已足够。MCP 用于访问工作副本之外的内容。

## 配置

#### 添加本地 MCP 服务器

`ocr config set` 命令以非交互方式写入这些字段。数组字段（`args`、`env`、`tools`）接受 JSON 数组字符串：

```bash
# Minimal: just a command
ocr config set mcp_servers.docs.command npx

# Arguments
ocr config set mcp_servers.docs.args '["-y", "@acme/docs-mcp-server"]'

# Restrict which tools are exposed to the reviewer
ocr config set mcp_servers.docs.tools '["search_docs", "get_page"]'

# A setup command to run before the server starts
ocr config set mcp_servers.docs.setup "npm install -g @acme/docs-mcp-server"

# Environment variables (KEY=VALUE entries)
ocr config set mcp_servers.docs.env '["DOCS_TOKEN=secret", "DOCS_REGION=eu"]'
```

#### 添加远程 MCP 服务器

对于支持 **Streamable HTTP** 的服务器，将 `type` 设为 `remote`，并用 `url` 代替本地命令。仅设置 `url` 不够：默认类型为 `stdio`。

请使用新的服务器名称，以免这些命令覆盖现有连接：

```bash
ocr config set mcp_servers.search.type remote
ocr config set mcp_servers.search.url https://mcp.example.com/mcp
ocr config set mcp_servers.search.tools '["search", "fetch"]'
```

这些命令将连接保存到用户配置中。下次审查时，OCR 将连接并向代理提供 `search` 和 `fetch`，与内置工具并列。允许的工具列表会将服务器可能提供的其他工具排除在审查之外。其他已配置的服务器和审查参数不受影响。

配置完成后，代理在审查期间调用这些工具，每次调用前不会请求确认。工具参数——搜索查询、请求的 URL 以及代理添加的任何上下文——会离开你的机器，发送到该端点的运营方。由于这是用户配置，它对所有仓库生效：仅在允许外部请求的场景中启用，且不要在请求中传递密钥、闭源代码或内部 URL。连接第三方服务前，请阅读其隐私政策和使用条款。

#### 删除 MCP 服务器

使用 `unset` 删除服务器：

```bash
ocr config unset mcp_servers.docs
```

MCP 服务器位于用户配置文件（`~/.opencodereview/config.json`）的 `mcp_servers` 键下。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | 字符串 | | `stdio`（默认）用于本地子进程，或 `remote` 用于 Streamable HTTP。 |
| `command` | 字符串 | 对 `stdio` 必填 | 启动 MCP 服务器的可执行文件（如 `npx`、`uvx` 或绝对路径）。 |
| `args` | 字符串数组 | | 传给 `command` 的参数（仅 `stdio`）。 |
| `url` | 字符串 | 对 `remote` 必填 | MCP 的 HTTP 或 HTTPS 端点。 |
| `headers` | 对象 | | HTTP 头名称及其字符串值（仅 `remote`）。值会在连接时展开 OCR 环境中的 `$VAR` 或 `${VAR}`；展开为空字符串的值会**导致连接失败**，而不会以空值发送或被丢弃。匿名访问时省略。 |
| `tools` | 字符串数组 | | 要注册的工具名称允许列表。空值注册服务器的所有工具。 |
| `setup` | 字符串 | | 服务器启动前一次性执行的 shell 命令（仅 `stdio`，例如安装依赖）。在仓库根目录执行，超时 5 分钟。 |
| `env` | 字符串数组 | | 子进程的附加环境变量，格式为 `KEY=VALUE`（仅 `stdio`）。 |

对于需要认证的远程服务器，请按相应服务器的说明配置 `headers`。如果传给 `ocr config set` 的 JSON 包含环境变量引用，请用单引号包裹，以免 shell 在 OCR 保存配置前展开它们。匿名访问的服务器完全不需要 `headers`。

## 工具过滤

默认注册服务器声明的每个工具。如果服务器提供的工具多于审查者所需，请在 `tools` 中设置允许列表：更少的精确工具可帮助代理集中注意力并减少 token 消耗。列表中实际不存在于服务器的名称会被跳过并发出警告，因此拼写错误会输出到 stderr，而不会被忽略。

## 名称冲突

MCP 工具与内置工具共用同一命名空间。如果服务器声明的工具名称与**内置/保留**工具（`file_read`、`code_search`、`task_done` 等）或已被其他 MCP 服务器注册的工具相同，OCR 会**跳过**它并记录警告。先注册者胜出；请为不同服务器的工具使用唯一名称，以免丢失。

## `setup` 命令

`setup` 在服务器子进程启动前从仓库根目录执行一次。用于按需安装或构建服务器：

```json
"setup": "npm install -g @acme/docs-mcp-server"
```

该命令设有 **5 分钟超时**。如果以非零代码退出，OCR 会记录命令、工作目录和输出，然后跳过该服务器并继续审查。

## 故障排除

所有 MCP 诊断信息输出到 **stderr**，前缀为 `[ocr]`，因此不会污染 stdout 中的 `--format json` 输出：

- `Running setup for MCP server "x": …` — 正在执行 setup 命令。
- `failed to start MCP server "x": …` — 子进程未在 30 秒初始化超时内连接，或 `command` 不在 `PATH` 中。
- `remote MCP server "x" has no URL configured, skipping` — `type` 为 `remote` 但未设置 `url`；这是设置了 `url` 却未设置 `type` 的反面情况。
- `failed to connect to remote MCP server "x": …` — 端点未在 30 秒初始化超时内连接并返回工具列表。请检查 URL、网络访问和所需请求头。
- `MCP server "x" header "h" expanded to empty value` — `headers` 中的 `$VAR` 变量在 OCR 环境中未设置。这会导致连接失败，而不会被视为缺少请求头。
- `remote MCP server "x" returned HTTP 401 Unauthorized` — 请检查 token 或请求头配置。
- `remote MCP server "x" returned HTTP 403 Forbidden` — 凭据已到达服务器，但权限不足。
- `tool "y" conflicts with built-in tool, skipping` — 请重命名服务器工具或将其从 `tools` 中移除。
- `allowed tool "y" not found in server's tool list` — `tools` 中的名称与服务器任何工具都不匹配；请检查拼写。

无法启动或无法连接的服务器会被跳过；审查将在没有其工具的情况下继续。

## 另请参阅

- [工具](../tools/) — 与 MCP 工具协同工作的六个内置工具。
- [配置](../configuration/) — 完整配置文件及所有键。
- [CLI 参考](../cli-reference/) — `ocr config` 命令和审查标志。