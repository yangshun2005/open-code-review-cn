---
title: 通过 ChatGPT 登录（预览版）
---

OpenCodeReview 可通过 OpenAI 公开的 Responses API 使用 ChatGPT 套餐的可用额度。此可选预览功能在开源 CLI 中提供。OpenCodeReview 不额外收取订阅费。可用性取决于账号、工作区、地区和模型，由 OpenAI 决定。

`chatgpt` 提供方使用文档化的 Sign in with ChatGPT 流程。`ocr auth login`、`status` 和 `logout` 默认使用 Sign in with ChatGPT。也支持显式参数 `--provider chatgpt`。

## 登录与模型选择

```bash
ocr auth login --provider chatgpt
ocr auth status --provider chatgpt
ocr llm models
ocr config set provider chatgpt
ocr config set providers.chatgpt.model gpt-6-luna
ocr config set providers.chatgpt.extra_body '{"reasoning":{"effort":"low"}}'
ocr llm test
```

OAuth 注册请求完整的 OpenID Connect 与 OpenAI 作用域集合：`openid`（身份验证）、`profile` 和 `email`（账号数据）、`offline_access`（用户不在场时刷新令牌）、`resource.invoke`（调用资源）和 `chatgpt.tokens.use.direct`（直接使用 ChatGPT 套餐额度）。首次注册时发送 `agent_name_hint=OpenCodeReview`。不请求连接器权限，不复用 Codex CLI 的客户端注册。只请求文档化流程所需的作用域，不请求任意额外权限。

首次登录时 OpenAI 签发客户端注册，应用为该账号保存。首次注册时发送实际应用名称，所有安装相同，再次登录时省略该提示。每次登录时应用为该本地安装发送固定的不透明 `ext_agent_host_id`。同一安装始终保存同一主机标识符。

每次授权都会生成新的 state、nonce 和 PKCE 值。交换代码前校验回调状态。ID 令牌签名使用签发方的 RSA JWKS 校验；在接受身份和已授予作用域前，校验 issuer、audience、subject、有效期和 nonce。

模型列表按服务器顺序显示所选账号可用的模型建议和显示名称。未指定模型时，提供方选择第一个可见模型。显式指定的模型 ID 或 `--model` 参数原样发送给 OpenAI，即使不在列表中。账号的模型可用性由 OpenAI 决定。此提供方不内置模型限制或别名。

`extra_body` 中的 reasoning effort 参数属于 API。评审专用标志 `--effort` 设置 OpenCodeReview 的检查轮数和工具预算。

登录会打开系统浏览器，仅监听 `127.0.0.1`。`--no-browser` 参数输出一次性本地 URL。CLI 不打印带已保存 ID 令牌提示的授权 URL。此预览版不支持设备代码登录。

若登录时未获得使用 ChatGPT 套餐的许可，OpenCodeReview 保存账号身份并提示套餐使用已关闭。要为已保存的注册请求同意页面，请执行：

```bash
ocr auth login --provider chatgpt --enable-plan
# 为另一个已保存的注册：
ocr auth login --provider chatgpt --enable-plan --account <saved-client-id>
```

此显式操作发送 `prompt=consent`、完整请求作用域集合和资源，以及已保存的客户端和主机标识符。该参数不能与 `--new-account` 同时使用。普通重新登录无需再次同意。在授予的许可允许使用套餐前，请求保持关闭。可配置使用 API 密钥的提供方；OpenCodeReview 不会自动切换付费方式。

## 账号与退出

```bash
ocr auth login --provider chatgpt --new-account
ocr auth status --provider chatgpt
ocr auth select <saved-client-id> --provider chatgpt
ocr auth login --provider chatgpt --account <saved-client-id>
ocr auth logout --provider chatgpt --account <saved-client-id>
```

每个签发的客户端标识符绑定已验证的 issuer 和 subject，因此即使电子邮件地址相同，注册也各不相同。重新登录使用同一客户端标识符。代码交换时出现 `invalid_grant` 错误后，授权流程会用回调中的客户端标识符及新的 state、nonce 和 PKCE 重新开始一次。待处理的注册在校验签名身份前不会激活。再次出错则登录终止，保留原有凭据。

凭据数据库位于 `~/.opencodereview/auth/chatgpt/accounts.json`。单独的 `host.json` 保存固定的安装标识符。凭据文件原子替换。

在 Unix 上，凭据文件权限为 `0600`，仅所有者可访问，存储目录权限为 `0700`。在 Windows 上，访问权限取决于从本地用户配置文件继承的 ACL；OpenCodeReview 不设置也不检查 DACL。Go 的 [`os.Chmod`](https://pkg.go.dev/os#Chmod) 在 Windows 上仅修改“只读”属性。请使用 ACL 将访问限制为你的账号的用户配置文件，登录前检查权限，避免使用共享或广泛可访问的存储位置。目录位于用户配置文件内本身并不保证访问受限。

存储变更和 refresh 令牌轮换使用操作系统锁，但浏览器授权在锁外执行，以便其他账号保持可用。完成时重新读取存储并校验注册版本。该注册的退出、令牌刷新或其他已完成的登录会使待处理结果失效。其他账号的变更会保留。Access 令牌在到期前通过轮换的 refresh 令牌刷新。

若刷新时获得了新令牌，但校验因请求取消或签名验证公钥暂时不可用而中断，OCR 会保存已获得的令牌。请重试原命令。校验将在下次请求时继续，包括 CLI 重启后。

若新 ID 令牌中的签名或账号数据未通过校验，OCR 停止重试并提示重新登录。请使用已保存的客户端标识符执行错误消息中的命令：

```bash
ocr auth login --provider chatgpt --account <saved-client-id>
```

登录成功后，新凭据将替换未通过校验的凭据。

退出时 OCR 尝试用最新的 refresh 令牌撤销可刷新会话，包括在 ID 令牌校验完成前获得的令牌。随后删除 access、refresh 和 ID 令牌，保留账号注册和主机标识符。退出后下次登录不再发送 `id_token_hint`。若无法确认远程撤销，CLI 会提示本地令牌已删除，并建议在 ChatGPT 设置中停用该应用。

## 请求传输与限额

此提供方仅向 `https://api.openai.com/v1/responses` 发送请求。拒绝覆盖端点、协议和凭据。使用 `store: false` 的流式传输，发送完整历史，本地函数分组到 `ocr` 命名空间，调用标识符和加密 reasoning 保留供后续轮次使用。仅 `response.completed` 视为成功。出现错误、流不完整或中断时请求终止，包括开始输出后的限额错误。

预览版请求字段限于 OpenAI 支持的集合。`extra_body` 接受 `reasoning`、`text` 和 `prompt_cache_key`；不能更改模型、历史、工具、流模式或存储策略。响应保留提供方的原始使用数据。现有的可选原始检查流记录不包含凭据头。

**ChatGPT 套餐使用：** 符合条件的请求使用所选账号的套餐。[在 ChatGPT 设置中管理使用量](https://chatgpt.com/settings/usage)。限额错误可能针对整个套餐或单个应用；CLI 不尝试确定重置时间。

当前要求见 OpenAI 的[开源 SIWC 概览](https://developers.openai.com/siwc/token-sharing-open-source)、[登录契约](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)和[预览版限制](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)。

`ocr auth` 和 `ocr llm models` 命令见 [CLI 参考](../cli-reference/)，提供方设置见[配置指南](../configuration/)。