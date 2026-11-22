# 安全保证案例

本文档为 Open Code Review (OCR) 提供安全保证案例，论证其通过安全设计原则和针对常见实现弱点的对策满足安全需求。

## 威胁模型

### 系统描述

OCR 是一个 CLI 工具，功能如下：

1. 从本地仓库读取 git diff 输出。
2. 通过 HTTPS 将代码 diff 发送到已配置的 LLM 提供商（OpenAI、Anthropic 等）。
3. 接收 LLM 返回的审查意见并呈现给用户。
4. 可选地启动本地 Web 查看器，用于浏览审查会话历史。

### 参与者

| 参与者 | 信任级别 |
|-------|-------------|
| 本地用户 | 可信 — 调用 CLI，完全控制配置 |
| LLM 提供商 API | 半可信 — 响应在使用前经过验证 |
| Git 仓库 | 半可信 — diff 可能包含对抗性内容 |
| 网络 | 不可信 — 所有通信使用 TLS |
| Web 浏览器（查看器） | 不可信 — 可能通过 DNS 重绑定被利用 |

### 信任边界

```
┌──────────────────────────────────────────────────┐
│  用户机器（可信区域）                              │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌────────────┐  │
│  │ Git 仓库 │───▶│ OCR CLI  │───▶│ 本地文件    │  │
│  │ (diffs)  │    │ (核心)   │    │  (输出)    │  │
│  └──────────┘    └────┬─────┘    └────────────┘  │
│        信任 ────────▶│◀──────── 信任              │
│        边界 1         │         边界 3             │
│                       │                           │
│                  ┌────┴─────┐                     │
│                  │  查看器  │◀── 信任边界 4        │
│                  │ (HTTP)   │    (浏览器访问)      │
│                  └──────────┘                     │
└───────────────────────┼───────────────────────────┘
           信任 ──────▶│◀────── 边界 2
                        │
              ┌─────────┴──────────┐
              │  LLM 提供商 API    │
              │  (仅 HTTPS)        │
              └────────────────────┘
```

1. **Git → CLI**：diff 内容可能包含精心构造的载荷。通过严格的格式验证进行解析。
2. **CLI → LLM API**：API 密钥仅通过 HTTPS 传输。响应在使用前经过验证。
3. **CLI → 本地输出**：文件写入限制在工作目录内。
4. **浏览器 → 查看器**：Host 头允许列表强制执行访问控制；阻止 DNS 重绑定。

### 威胁摘要

| ID | 威胁 | 边界 | 缓解措施 |
|----|--------|----------|------------|
| T1 | 通过精心构造的 diff 内容进行命令注入 | 1 | 所有外部命令仅为 `git`，子命令硬编码；无 shell 展开；使用 `--end-of-options` 防止标志注入 |
| T2 | API 密钥泄露 | 2 | 密钥可来自环境变量、`api_key_cmd`/`auth_token_cmd` 或用户配置文件（见凭据来源）。绝不记录日志、写入审查输出文件或传输到已配置的 LLM 端点之外 |
| T3 | 通过 LLM 建议的文件路径进行路径遍历 | 3 | `pathutil.WithinBase()` 在符号链接解析前后均对仓库根目录验证所有文件路径 |
| T4 | 针对本地查看器的 DNS 重绑定 | 4 | Host 头允许列表拒绝来自非回环来源的请求；可通过 `OCR_VIEWER_ALLOWED_HOSTS` 配置 |
| T5 | API 通信中间人攻击 | 2 | Go 的 `net/http` 默认强制执行 TLS 1.2+ 并完整验证证书；从不设置 `InsecureSkipVerify` |
| T6 | 恶意 LLM 响应 | 2 | 对响应结构进行 JSON Schema 验证；对照实际 diff 范围检查行号边界 |
| T7 | 依赖漏洞 | 全部 | CI 中运行 `govulncheck`；Dependabot 监控更新；`go.sum` 提供完整性验证 |

### 凭据来源

API 密钥绝不硬编码在二进制文件中。运行时可通过以下方式提供：

1. 环境变量（`OCR_LLM_TOKEN`、提供商特定变量如 `ANTHROPIC_API_KEY`）。支持仅使用环境变量：完整的 `OCR_LLM_*` 或 Claude Code `ANTHROPIC_*` 环境无需配置文件。
2. 凭据命令（`api_key_cmd` / `auth_token_cmd`），其 stdout 为密钥。命令字符串可存储在配置中；密钥本身不存储。
3. 可选持久化到用户配置文件（`~/.opencodereview/config.json`），作为 `api_key` 或 `auth_token`。`ocr config set` 和交互式提供商设置以明文写入此文件；`saveConfig`（`cmd/opencodereview/provider_cmd.go`）创建新配置文件时使用 `0600` 权限，并在持久化凭据前将现有配置文件收紧至 `0600`。

`ocr config set` 在回显值时掩码 `api_key`/`auth_token`。敏感请求头在原始日志中被脱敏。密钥不写入审查输出文件。

## 安全设计原则

以下分析将 [Saltzer & Schroeder 的设计原则](https://ieeexplore.ieee.org/document/1451869) 映射到项目实现。

| 原则 | 应用方式 |
|-----------|-------------|
| **最小权限** | `CGO_ENABLED=0` 消除 C 库攻击面。CLI 无需提升权限。除可选的查看器外无网络监听器。 |
| **故障安全默认值** | 凭据不编译在内；必须通过环境变量、`api_key_cmd`/`auth_token_cmd` 或用户配置文件提供。查看器默认绑定到 localhost；非回环主机需显式加入允许列表。 |
| **完全中介** | 每个查看器 HTTP 请求都对照主机允许列表检查（`internal/viewer/hostguard.go`）。来自 agent 工具的每个文件路径都对照仓库根目录验证（`internal/tool/filereader.go:98`、`internal/pathutil/path.go`）。 |
| **机制经济性** | 外部进程执行仅限于 `git` 且子命令硬编码 — 无 shell 调用，无任意命令执行。 |
| **开放设计** | 完全开源（Apache-2.0）。安全性依赖 TLS，而非隐蔽性。 |
| **权限分离** | 凭据材料绝不编译进二进制文件；可选持久化仅限于用户配置文件，`saveConfig` 将其保持在 `0600` 权限（写入前对现有文件 chmod；新文件以 `0600` 创建）。查看器的主机守卫是独立的中间件层。 |
| **最小公共机制** | 每个审查会话写入自己的 JSONL 文件。会话间无共享状态。 |
| **心理可接受性** | 安全默认值（HTTPS、localhost 绑定、主机允许列表）无需用户配置。覆盖项（`OCR_VIEWER_ALLOWED_HOSTS`）显式且已文档化。 |

## 针对常见弱点的对策

以下将 [OWASP Top 10](https://owasp.org/www-project-top-ten/) 和 [CWE/SANS Top 25](https://cwe.mitre.org/top25/) 类别映射到项目。

| 弱点 | 适用性 | 对策 |
|----------|---------------|----------------|
| **A03:2021 注入**（CWE-78 OS 命令注入） | 每个 `exec.Command` 调用都传递显式参数列表；没有任何调用将不可信输入插值到 shell 字符串中。仓库访问始终直接调用 `git`，使用 `--end-of-options` 防止标志注入。四类调用点运行 `git` 以外的内容，且均仅执行本地用户配置的内容，绝不执行远程或 LLM 提供的输入：API 密钥命令（`internal/llm/keycmd_unix.go`、`keycmd_windows.go`）和 agent shell 工具（`cmd/opencodereview/shell_unix.go`、`shell_windows.go`）按设计通过 `sh -c` / `cmd /c` 运行用户编写的脚本；MCP 客户端（`internal/mcp/client.go`）从用户的 MCP 配置中启动服务器命令；查看器的浏览器打开器（`internal/viewer/browser.go`）运行固定的平台命令（或 `$BROWSER`），URL 由用户自己的 `--addr` 构建。 | 已缓解 |
| **A03:2021 注入**（CWE-79 跨站脚本） | 查看器模板输出由 `html/template` 进行 HTML 转义。纵深防御：每个查看器响应都携带严格的 Content-Security-Policy（`default-src 'self'`，无 `unsafe-inline`）以及 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy` 和 `Permissions-Policy`（`internal/viewer/securityheaders.go`）。 | 已缓解 |
| **A01:2021 访问控制失效**（CWE-22 路径遍历） | Agent 文件读取工具在符号链接解析前后使用 `pathutil.WithinBase()` 验证路径（`internal/tool/filereader.go:91-112`）。 | 已缓解 |
| **A02:2021 加密失败** | 所有 API 通信使用 HTTPS/TLS 1.2+。使用 Go 默认 TLS 配置，未削弱。从不设置 `InsecureSkipVerify`。 | 已缓解 |
| **A07:2021 认证失败**（CWE-798 硬编码凭据） | API 密钥绝不硬编码在源码中。可从环境变量、`api_key_cmd`/`auth_token_cmd` 或用户配置文件（`~/.opencodereview/config.json`）读取；`saveConfig` 在创建时强制 `0600` 权限，并在持久化凭据前将现有配置文件收紧至 `0600`。绝不记录日志；`ocr config set` 在显示时掩码。 | 已缓解 |
| **A05:2021 安全配置错误** | 安全默认值：仅 localhost 查看器、仅 HTTPS API 调用、`CGO_ENABLED=0`。CI 中运行 `go vet` 和 `govulncheck` 工具。 | 已缓解 |
| **A06:2021 易受攻击的组件**（CWE-1104） | Dependabot 监控 Go 模块和 GitHub Actions。每次 push/PR 运行 `govulncheck`。依赖通过 `go.sum` 锁定。 | 已缓解 |
| **A08:2021 软件完整性** | 发布二进制文件包含 SHA-256 校验和。发布标签经过加密签名（SSH）。`CGO_ENABLED=0` 生成无外部共享库依赖的静态二进制文件。 | 已缓解 |
| **A09:2021 日志记录失败** | API 密钥和敏感请求头从所有日志输出和遥测中排除。 | 已缓解 |
| **A10:2021 SSRF** | CLI 仅向用户配置的 LLM API 端点发出出站请求。查看器不发出出站请求。 | 不适用 |
| **CWE-416 释放后使用 / CWE-787 越界写入** | Go 是内存安全语言。`CGO_ENABLED=0` 消除 C 内存风险。CI 中运行竞态检测器（`-race`）。 | 不适用（内存安全语言） |

## 自动化验证

| 检查 | 工具 | 时机 |
|-------|------|------|
| 静态分析 | `go vet` | 每次 push 和 PR（CI） |
| 已知漏洞扫描 | `govulncheck` | 每次 push 和 PR（CI） |
| 数据竞态检测 | `go test -race` | 每次 push 和 PR（CI） |
| 依赖监控 | Dependabot | 持续 |
| 构建完整性 | `CGO_ENABLED=0`、`go.sum` 校验和 | 每次构建 |