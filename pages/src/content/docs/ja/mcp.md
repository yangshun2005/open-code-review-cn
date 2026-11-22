---
title: MCP 服务器
sidebar:
  order: 10
---

OCR 可以作为 **Model Context Protocol（MCP）客户端**运行。指定一个或多个外部 MCP server 后，这些 server 公开的工具即可供审查 Agent 使用，与 `file_read`、`code_search` 等[内置工具](../tools/)并列。

MCP 为专用 Agent 补充外部业务上下文，但不能覆盖内置工具的名称或定义。目前仅 `ocr review` 会连接，`ocr scan` 尚未支持。基准测试结果仅适用于已验证的 Agent 配置，不保证适用于任意 MCP 服务器组合。

建议使用只读上下文工具和最小化的 `tools` 允许列表。OCR 不强制 MCP 工具的只读行为。启用前请确认服务器的权限和数据访问范围。

## 何时使用

当审查者需要 diff 之外的上下文时，引入 MCP server：

- **Issue / 工单引用** —— 让其获取关联的 Jira / GitHub issue，确认变更是否符合所述需求。
- **文档 / 知识库** —— 引入内部 API 文档或编码规范，使评论能引用实际团队规则。
- **自定义分析** —— 将 linter、Schema 校验器、依赖检查器作为工具公开，供审查者按需调用。

只需读取仓库时内置工具已足够 —— MCP 用于触达 checkout 之外的内容。

## 配置

#### 添加本地 MCP server

`ocr config set` 命令以非交互方式写入这些字段。数组字段（`args`、`env`、`tools`）接受 JSON 数组字符串：

```bash
# 最小配置：仅命令
ocr config set mcp_servers.docs.command npx

# 参数
ocr config set mcp_servers.docs.args '["-y", "@acme/docs-mcp-server"]'

# 限制向审查者公开的工具
ocr config set mcp_servers.docs.tools '["search_docs", "get_page"]'

# server 启动前执行的 setup 命令
ocr config set mcp_servers.docs.setup "npm install -g @acme/docs-mcp-server"

# 环境变量（KEY=VALUE 条目）
ocr config set mcp_servers.docs.env '["DOCS_TOKEN=secret", "DOCS_REGION=eu"]'
```

#### 添加远程 MCP server

对于支持 **Streamable HTTP** 的 server，将 `type` 设为 `remote`，并用 `url` 代替本地命令。仅设置 `url` 不够：默认 type 为 `stdio`。

请使用新的 server 名，以免覆盖已有连接：

```bash
ocr config set mcp_servers.search.type remote
ocr config set mcp_servers.search.url https://mcp.example.com/mcp
ocr config set mcp_servers.search.tools '["search", "fetch"]'
```

这些命令将连接保存到用户配置。下次审查时 OCR 会连接，并将 `search` 和 `fetch` 与内置工具一起提供给 Agent。工具允许列表确保 server 可能提供的其他工具不会进入审查。其他已配置的 server 和审查配置不受影响。

配置后，Agent 可在审查期间无需逐次确认即可使用这些工具。工具参数 —— 搜索查询、请求的 URL、Agent 附带的上下文 —— 会离开你的机器，发送到该端点的运营方。这是用户配置，会跨仓库生效：仅在允许外部请求的环境启用，且不要在请求中包含机密信息、非公开代码或内部 URL。连接第三方服务前，请确认运营方的隐私政策和条款。

#### 删除 MCP server

用 `unset` 删除 server：

```bash
ocr config unset mcp_servers.docs
```

MCP server 放在用户配置文件（`~/.opencodereview/config.json`）的 `mcp_servers` 键下。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | string | | 本地子进程用 `stdio`（默认），Streamable HTTP 用 `remote`。 |
| `command` | string | `stdio` 必填 | 启动 MCP server 的可执行文件（`npx`、`uvx`、绝对路径等）。 |
| `args` | string 数组 | | 传给 `command` 的参数（仅 `stdio`）。 |
| `url` | string | `remote` 必填 | HTTP 或 HTTPS 的 MCP 端点。 |
| `headers` | object | | HTTP 头名称与字符串值（仅 `remote`）。值在连接时从 OCR 环境展开 `$VAR` 或 `${VAR}`。展开为空字符串的值**会导致连接失败**，而非按空值发送或忽略。匿名访问时省略。 |
| `tools` | string 数组 | | 要注册的工具名允许列表。空 = 注册 server 提供的全部工具。 |
| `setup` | string | | server 启动前执行一次的 shell 命令（仅 `stdio`，如安装依赖）。在仓库根目录执行，超时 5 分钟。 |
| `env` | string 数组 | | 传给子进程的额外环境变量，`KEY=VALUE` 格式（仅 `stdio`）。 |

需要认证的远程 server，请按其说明设置 `headers`。若传给 `ocr config set` 的 JSON 含环境变量引用，请用单引号包裹，以免 OCR 保存配置前被 shell 展开。允许匿名访问的 server 无需 `headers`。

## 工具过滤

默认注册 server 公开的所有工具。若 server 向审查者公开的工具过多，请在 `tools` 中设置允许列表 —— 工具越少越精准，Agent 越专注，token 成本也越低。列表中包含但 server 实际未提供的名称会被跳过并给出警告，因此拼写错误会显示在 stderr 而非被静默忽略。

## 名称冲突

MCP 工具名与内置工具共享一个命名空间。若 server 公开的工具名与**内置 / 保留**工具（`file_read`、`code_search`、`task_done` 等）或另一 MCP server 已注册的工具冲突，OCR 会**跳过**它并记录警告。先注册者优先。为避免丢失工具，请为每个 server 使用不重复的工具名。

## `setup` 命令

`setup` 在 server 子进程启动前，从仓库根目录执行一次。用于按需安装或构建 server：

```json
"setup": "npm install -g @acme/docs-mcp-server"
```

**超时 5 分钟**。若以非零状态退出，OCR 会记录命令、工作目录和输出，跳过该 server 并继续审查。

## 故障排查

所有 MCP 诊断信息输出到 **stderr**，带 `[ocr]` 前缀，不会污染 stdout 的 `--format json` 输出：

- `Running setup for MCP server "x": …` —— 正在执行 setup 命令。
- `failed to start MCP server "x": …` —— 子进程未能在 30 秒初始化超时内连接，或 `command` 不在 `PATH` 中。
- `remote MCP server "x" has no URL configured, skipping` —— `type` 为 `remote` 但未设置 `url`。这是只设 `url` 却忘记 `type` 的反面情况。
- `failed to connect to remote MCP server "x": …` —— 端点未能在 30 秒初始化超时内连接，或无法返回工具列表。请检查 URL、网络可达性和所需请求头。
- `MCP server "x" header "h" expanded to empty value` —— `headers` 中的 `$VAR` 未在 OCR 环境中设置。连接会失败，而非按无此请求头处理。
- `remote MCP server "x" returned HTTP 401 Unauthorized` —— 请检查 token 或请求头配置。
- `remote MCP server "x" returned HTTP 403 Forbidden` —— 凭证已送达 server，但缺少所需权限。
- `tool "y" conflicts with built-in tool, skipping` —— 请重命名 server 的工具，或从 `tools` 中移除。
- `allowed tool "y" not found in server's tool list` —— `tools` 中的名称与 server 提供的任何工具都不匹配。请检查拼写。

启动或连接失败的 server 会被跳过，审查将在没有其工具的情况下继续。

## 相关

- [工具](../tools/) —— MCP 工具与之并列的 6 个内置工具。
- [配置](../configuration/) —— 完整配置文件及所有键。
- [CLI 参考](../cli-reference/) —— `ocr config` 与 review 的标志。