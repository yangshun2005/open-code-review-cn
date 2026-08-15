---
title: MCP 服务器
sidebar:
  order: 10
---

OCR 可以作为 **Model Context Protocol（MCP）客户端**运行。通过指定一个或多个外部 MCP 服务器，这些服务器公开的工具可供审查代理使用，并与 `file_read`、`code_search` 等[内置工具](../tools/)一起使用。

## 何时使用

当审查者需要 diff 之外的上下文时，引入 MCP 服务器：

- **Issue / 工单引用** —— 获取关联的 Jira / GitHub Issue，并检查更改是否符合所述要求。
- **文档 / 知识库** —— 引入内部 API 文档或编码规范，使评论能够引用实际团队规则。
- **自定义分析** —— 将 linter、模式验证器、依赖检查器作为工具公开，供审查者按需调用。

如果仅需读取仓库，内置工具就足够了 —— MCP 用于访问检出范围之外的内容。

## 配置

#### 添加 MCP 服务器

`ocr config set` 命令以非交互方式写入这些字段。数组字段（`args`、`env`、`tools`）接受 JSON 数组字符串：

```bash
# 最小配置：仅命令
ocr config set mcp_servers.docs.command npx

# 参数
ocr config set mcp_servers.docs.args '["-y", "@acme/docs-mcp-server"]'

# 限制向审查者公开的工具
ocr config set mcp_servers.docs.tools '["search_docs", "get_page"]'

# 服务器启动前执行的 setup 命令
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

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `command` | string | ✓ | 启动 MCP 服务器的可执行文件（如 `npx`、`uvx`、绝对路径）。 |
| `args` | string 数组 | | 传递给 `command` 的参数。 |
| `tools` | string 数组 | | 要注册的工具名称允许列表。空 = 注册服务器提供的所有工具。 |
| `setup` | string | | 服务器启动前执行一次的 shell 命令（如安装依赖）。在仓库根目录执行，超时 5 分钟。 |
| `env` | string 数组 | | 附加环境变量，格式为 `KEY=VALUE`。 |

## 工具过滤

默认情况下，服务器通告的所有工具都会被注册。如果服务器向审查者公开了超出必要的工具，请在 `tools` 中设置允许列表 —— 工具越少越精准，代理越能集中注意力，令牌成本也越低。列表中包含但服务器实际不提供的名称会带警告跳过，因此拼写错误不会静默忽略，而是显示在 stderr 中。

## 名称冲突

MCP 工具名称与内置工具共享一个命名空间。如果服务器通告的工具名称与**内置 / 保留**工具（如 `file_read`、`code_search`、`task_done`）或另一个 MCP 服务器已注册的工具冲突，OCR 将**跳过**它并记录警告。先注册的优先。为避免丢失工具，请为每个服务器使用不重复的工具名称。

## `setup` 命令

`setup` 在服务器子进程启动前，从仓库根目录执行一次。用于按需安装或构建服务器：

```json
"setup": "npm install -g @acme/docs-mcp-server"
```

**超时时间为 5 分钟**。如果以非零状态退出，OCR 会记录命令、工作目录和输出，跳过该服务器并继续审查。

## 故障排除

所有 MCP 诊断信息均输出到 **stderr**，并带有 `[ocr]` 前缀，因此不会污染 stdout 的 `--format json` 输出：

- `Running setup for MCP server "x": …` —— 正在执行 setup 命令。
- `failed to start MCP server "x": …` —— 子进程未能在 30 秒初始化超时内连接，或 `command` 不在 `PATH` 中。
- `tool "y" conflicts with built-in tool, skipping` —— 重命名服务器工具，或将其从 `tools` 中移除。
- `allowed tool "y" not found in server's tool list` —— `tools` 中的名称与服务器提供的任何工具都不匹配。请检查拼写。

## 相关项目

- [工具](../tools/) —— 与 MCP 工具并列的 6 个内置工具。
- [配置](../configuration/) —— 完整配置文件及所有键。
- [CLI 参考](../cli-reference/) —— `ocr config` 和 review 标志。