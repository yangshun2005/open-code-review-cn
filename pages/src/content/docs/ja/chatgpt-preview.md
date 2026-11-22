---
title: ChatGPT 登录预览
---

OpenCodeReview 可通过 OpenAI 公开的 Responses API 使用符合条件的 ChatGPT 套餐额度。这是开源 CLI 的可选预览功能，OpenCodeReview 不会另行收取订阅费用。账户、工作区、地区与模型的使用资格由 OpenAI 决定。

`chatgpt` provider 使用公开的 Sign in with ChatGPT 流程。`ocr auth login`、`status`、`logout` 默认使用 Sign in with ChatGPT，仍可显式指定 `--provider chatgpt`。

## 登录并选择模型

```bash
ocr auth login --provider chatgpt
ocr auth status --provider chatgpt
ocr llm models
ocr config set provider chatgpt
ocr config set providers.chatgpt.model gpt-6-luna
ocr config set providers.chatgpt.extra_body '{"reasoning":{"effort":"low"}}'
ocr llm test
```

OAuth 注册会请求 OpenID Connect 与 OpenAI 的全部以下 scope：`openid`（身份验证）、`profile` 与 `email`（账户信息）、`offline_access`（通过刷新令牌离线更新）、`resource.invoke`（资源调用）、`chatgpt.tokens.use.direct`（直接使用 ChatGPT 套餐额度）。首次注册时发送 `agent_name_hint=OpenCodeReview`。不请求连接器权限，也不复用 Codex CLI 的客户端注册。仅请求此文档化流程所需的 scope，不请求任何额外权限。

首次登录时 OpenAI 会签发客户端注册，并按账户保存。首次注册时发送应用名作为提示，各安装间使用相同名称，重新登录时省略。每次都会发送标识本地安装的稳定不透明 `ext_agent_host_id`，同一安装使用相同 ID。

每次认证都会生成新的 state、nonce 与 PKCE 值。在代码交换前校验 callback 的 state。使用 issuer 的 RSA JWKS 验证 ID token 签名，确认 issuer、audience、subject、有效期与 nonce 后，才信任身份与授予的 scope。

模型列表按服务器顺序显示当前账户可见的候选与显示名。未配置模型时，provider 选择列表中的第一个可见模型。显式配置的模型或 `--model` 的 slug 即使不在列表中也会原样发送给 OpenAI，是否可用由 OpenAI 判定。此 provider 未内置固定模型列表或别名。

`extra_body` 中的推理 effort 是 API 参数。另一个 review `--effort` 标志控制 OpenCodeReview 的评审轮次与工具预算。

登录会打开系统浏览器，仅监听 `127.0.0.1`。指定 `--no-browser` 时显示一次性本地 URL。CLI 不会显示包含已保存 ID token hint 的认证 URL。此预览不支持设备码认证。

若登录成功但无 ChatGPT 套餐权限，OpenCodeReview 会保存账户 ID 并提示套餐使用已禁用。要让当前保存的注册触发同意页面，请执行：

```bash
ocr auth login --provider chatgpt --enable-plan
# 其他已保存的注册：
ocr auth login --provider chatgpt --enable-plan --account <saved-client-id>
```

此显式操作会发送 `prompt=consent`、完整的请求 scope 与 resource，以及已保存的客户端 ID 与主机 ID。不能与 `--new-account` 同时使用。常规重新登录不会强制同意。在返回的授权允许套餐使用前，推理处于禁用状态。也可改用 API key provider。OpenCodeReview 不会自动切换计费路径。

## 账户与退出登录

```bash
ocr auth login --provider chatgpt --new-account
ocr auth status --provider chatgpt
ocr auth select <saved-client-id> --provider chatgpt
ocr auth login --provider chatgpt --account <saved-client-id>
ocr auth logout --provider chatgpt --account <saved-client-id>
```

每个签发的客户端 ID 都绑定到已验证的 issuer 与 subject。使用同一邮箱的多个注册也会被区分。重新登录会复用相同客户端 ID。若代码交换返回 `invalid_grant`，则使用回调中签发的客户端 ID，以新的 state、nonce 与 PKCE 仅重启一次认证。在签名 ID 验证完成前，此待定注册不会启用。第二次仍失败则停止登录并保留现有凭据。

凭据数据库位于 `~/.opencodereview/auth/chatgpt/accounts.json`。另一个 `host.json` 保存稳定的安装主机 ID。凭据文件以原子方式替换。

在 Unix 上，凭据文件权限设为 `0600`（仅所有者可读写），保存目录设为 `0700`。Windows 上的访问权限取决于从本地用户配置文件继承的 ACL，OpenCodeReview 既不设置也不验证 DACL。Go 的 [`os.Chmod`](https://pkg.go.dev/os#Chmod) 在 Windows 上仅修改只读属性。请使用通过 ACL 限制为本人账户访问的用户配置文件，登录前检查权限，避免共享或广泛可访问的保存位置。仅位于用户配置文件内并不保证访问私有。

保存内容的修改与 refresh token 轮换使用 OS 文件锁，但浏览器认证在锁外执行，以便使用其他账户。完成时重新读取保存内容并校验注册的 revision。该注册的退出登录、refresh 或其他登录完成会使待定结果失效。其他账户的更新会保留。access token 在到期前通过轮换 refresh token 更新。

更新收到新令牌后，若因请求取消或暂时无法获取签名验证公钥而中断验证，OCR 会保留已收到的令牌。请重新执行原命令。重启 CLI 后，下次请求也会恢复验证。

若更新返回的 ID token 签名或账户身份验证失败，OCR 会停止重试并要求重新登录。使用错误中显示的客户端 ID 执行以下命令：

```bash
ocr auth login --provider chatgpt --account <saved-client-id>
```

登录成功后，验证失败的凭据会被新凭据替换。

退出登录会使用最新 refresh token 尝试撤销可更新的会话，包括因等待 ID token 验证而保留的新 refresh token。随后清除 access、refresh 与 ID token，保留账户注册与主机 ID。退出后的重新登录不发送 `id_token_hint`。若无法确认服务器端撤销，CLI 会提示已清除本地 token，并引导从 ChatGPT 设置中断开应用。

## 通信与用量

此 provider 仅向 `https://api.openai.com/v1/responses` 发送请求。拒绝覆盖端点、协议与凭据。以 `store: false` 流式传输，发送完整历史，将本地函数归入 `ocr` 命名空间，并为后续轮次保留调用 ID 与加密的推理内容。仅 `response.completed` 表示成功。失败、不完整或中断的流（包括输出开始后的用量限制错误）都会停止请求。

预览的请求字段限制为 OpenAI 支持的范围。`extra_body` 仅可指定 `reasoning`、`text`、`prompt_cache_key`。不能修改模型、历史、工具、流式方式与保存策略。响应中可使用 provider 的原始用量数据。现有的任意原始评审记录会在不包含认证头的情况下记录流。

**ChatGPT 套餐用量：** 符合条件的请求使用所选账户的 ChatGPT 套餐。[在 ChatGPT 设置中管理用量](https://chatgpt.com/settings/usage)。用量限制错误可能表示套餐整体或应用专属限制。CLI 不会推测重置时间。

当前要求请参阅 OpenAI 的[开源 SIWC 概述](https://developers.openai.com/siwc/token-sharing-open-source)、[登录规范](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)、[预览限制](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)。

`ocr auth` 与 `ocr llm models` 命令请参阅 [CLI 参考](../cli-reference/)，provider 配置请参阅[配置指南](../configuration/)。