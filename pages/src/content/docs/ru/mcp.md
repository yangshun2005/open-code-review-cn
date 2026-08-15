---
title: MCP 服务器
sidebar:
  order: 10
---

OCR 可以作为 **Model Context Protocol (MCP) 客户端** 运行。指定一个或多个外部 MCP 服务器，它们提供的工具将与[内置工具](../tools/)（如 `file_read` 和 `code_search`）一起供审查代理使用。

## 何时使用 MCP

如果审查者需要 diff 之外的上下文，请连接 MCP 服务器：

- **问题/工单搜索** — 代理可以获取关联的 Jira 或 GitHub 问题，并检查更改是否符合所述要求。
- **文档/知识库** — 加载内部 API 文档或编程标准，使评论能够引用组织的现行规则。
- **自定义分析** — 提供 linter、schema 验证器或依赖检查器作为工具，供审查者按需调用。

如果只需要读取仓库，内置工具已经可以满足。MCP 旨在访问工作副本之外的资源。

## 配置

#### 添加 MCP 服务器

`ocr config set` 命令可以非交互式地写入这些字段。数组字段（`args`、`env`、`tools`）接受 JSON 数组字符串：

```bash
# 最小配置：仅命令
ocr config set mcp_servers.docs.command npx

# 参数
ocr config set mcp_servers.docs.args '["-y", "@acme/docs-mcp-server"]'

# 限制暴露给审查者的工具
ocr config set mcp_servers.docs.tools '["search_docs", "get_page"]'

# 服务器启动前运行的设置命令
ocr config set mcp_servers.docs.setup "npm install -g @acme/docs-mcp-server"

# 环境变量（KEY=VALUE 条目）
ocr config set mcp_servers.docs.env '["DOCS_TOKEN=secret", "DOCS_REGION=eu"]'
```

#### 删除 MCP 服务器

使用 `unset` 删除服务器：

```bash
ocr config unset mcp_servers.docs
```

MCP 服务器位于用户配置文件（`~/.opencodereview/config.json`）的 `mcp_servers` 键下。

| 字段 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `command` | 字符串 | ✓ | 启动 MCP 服务器的可执行文件（例如 `npx`、`uvx` 或绝对路径）。 |
| `args` | 字符串数组 | | 传递给 `command` 的参数。 |
| `tools` | 字符串数组 | | 允许注册的工具名称列表。空值将注册服务器的所有工具。 |
| `setup` | 字符串 | | 在服务器启动前一次性执行的 shell 命令（例如安装依赖）。在仓库根目录执行，超时时间为 5 分钟。 |
| `env` | 字符串数组 | | 格式为 `KEY=VALUE` 的额外环境变量。 |

## 工具过滤

默认情况下，服务器声明的每个工具都会被注册。如果服务器提供的工具超出审查者所需，请在 `tools` 中设置允许列表：更少且精确的工具有助于代理集中注意力并减少 token 消耗。列表中实际在服务器上不存在的名称会被跳过并发出警告，因此拼写错误会输出到 stderr，而不会悄然忽略。

## 名称冲突

MCP 工具与内置工具共享同一个命名空间。如果服务器声明的工具名称与**内置/保留**工具（`file_read`、`code_search`、`task_done` 等）或已被其他 MCP 服务器注册的工具冲突，OCR 将**跳过**该工具并记录警告。先注册者优先；请为不同服务器的工具赋予唯一名称，以免丢失。

## `setup` 命令

`setup` 在服务器子进程启动前从仓库根目录执行一次。使用它来按需安装或构建服务器：

```json
"setup": "npm install -g @acme/docs-mcp-server"
```

该命令有 **5 分钟超时**。如果它以非零退出码结束，OCR 会记录命令、工作目录和输出，然后跳过该服务器并继续审查。

## 故障排除

所有 MCP 诊断信息都会输出到 **stderr**，并带有 `[ocr]` 前缀，因此绝不会污染 stdout 中的 `--format json` 输出：

- `Running setup for MCP server "x": …` — 正在执行设置命令。
- `failed to start MCP server "x": …` — 子进程未在 30 秒初始化超时内连接，或 `command` 不在 `PATH` 中。
- `tool "y" conflicts with built-in tool, skipping` — 请重命名服务器工具或将其从 `tools` 中移除。
- `allowed tool "y" not found in server's tool list` — `tools` 中的名称与服务器的任何工具都不匹配；请检查拼写。

## 另请参阅

- [工具](../tools/) — 与 MCP 工具并行的六个内置工具。
- [配置](../configuration/) — 完整的配置文件及所有键。
- [CLI 参考](../cli-reference/) — `ocr config` 命令和审查标志。