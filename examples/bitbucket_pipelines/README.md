# OpenCodeReview - Bitbucket Pipelines

本示例演示如何使用 OpenCodeReview（OCR）审查 Bitbucket Cloud 的 Pull Request，并将审查结果发布回 Pull Request。

## 工作原理

```text
PR 创建或更新 → Bitbucket Pipeline → OCR 审查差异 → 在 PR 中发布评论
```

1. 当 Pull Request 被创建或其源分支被更新时，Bitbucket 的 `pullrequest-push` 触发器会启动自定义的 `ocr-pr-review` 流水线。
2. 流水线在 `node:20` 容器中安装 OCR，并通过安全的仓库变量配置 LLM。
3. OCR 比较 `origin/$BITBUCKET_PR_DESTINATION_BRANCH` 与 `$BITBUCKET_COMMIT`，并输出 JSON 结果。
4. 一个无依赖的 Node.js 脚本通过 Bitbucket Pull Request 评论 API 发布每条审查发现。当报告的行属于 PR 差异时，它会创建行内评论；当 Bitbucket 无法定位该行时，则回退为普通评论，并最终发布一条总结评论。

## 设置

### 1. 复制流水线文件

将 [`bitbucket-pipelines.yml`](bitbucket-pipelines.yml) 复制到您希望 OCR 审查的仓库根目录：

```bash
cp examples/bitbucket_pipelines/bitbucket-pipelines.yml ./bitbucket-pipelines.yml
```

如果仓库已有流水线文件，请将 `definitions`、`pipelines.custom` 和 `triggers.pullrequest-push` 条目合并到其中。自定义流水线名称必须保持唯一。

### 2. 配置仓库变量

在 Bitbucket 中，打开 **仓库设置 → Pipelines → 仓库变量** 并添加：

| 变量 | 必填 | 安全 | 描述 |
| --- | --- | --- | --- |
| `OCR_LLM_URL` | 是 | 否 | LLM API 端点，例如 `https://api.openai.com/v1/chat/completions` |
| `OCR_LLM_AUTH_TOKEN` | 是 | 是 | LLM API 认证令牌 |
| `OCR_LLM_MODEL` | 是 | 否 | 模型名称；OCR 没有内置默认值，未设置时会失败 |
| `BITBUCKET_ACCESS_TOKEN` | 推荐 | 是 | 仓库访问令牌，用作 Bearer 令牌以发布 PR 评论 |
| `BITBUCKET_API_TOKEN` | 备选 | 是 | 限定范围的用户 API 令牌；需与 `BITBUCKET_API_TOKEN_EMAIL` 配合使用 |
| `BITBUCKET_API_TOKEN_EMAIL` | 与 API 令牌配合 | 否 | 属于 `BITBUCKET_API_TOKEN` 的 Atlassian 账户邮箱 |
| `OCR_LLM_USE_ANTHROPIC` | 否 | 否 | 设置为 `true` 以使用 Anthropic API 格式；默认为 `false` |

配置**一种** Bitbucket 认证方式：

- `BITBUCKET_ACCESS_TOKEN`（推荐），或
- `BITBUCKET_API_TOKEN` 和 `BITBUCKET_API_TOKEN_EMAIL` 两者。

将 LLM 令牌和 Bitbucket 令牌都标记为安全。不要打印它们，也不要直接将它们写入 `bitbucket-pipelines.yml`。

任何对仓库具有写权限的人都可以使用仓库变量。即使变量被标记为安全，也应限制写权限和对流水线配置的更改仅限受信任的用户。

Bitbucket 会自动提供其余上下文：`BITBUCKET_WORKSPACE`、`BITBUCKET_REPO_SLUG`、`BITBUCKET_PR_ID`、`BITBUCKET_PR_DESTINATION_BRANCH` 和 `BITBUCKET_COMMIT`。

### 3. 创建 Bitbucket 令牌

#### 选项 A：仓库访问令牌（推荐）

1. 打开 **仓库设置 → 安全 → 访问令牌**。
2. 选择 **创建访问令牌** 并为其指定一个描述性名称，例如 `OpenCodeReview Bot`。
3. 授予 **Pull requests: Write** 权限。
4. 将令牌复制到安全的 `BITBUCKET_ACCESS_TOKEN` 仓库变量中。

仓库访问令牌仅限于当前仓库，并在创建内容时以其令牌名称显示，非常适合审查机器人使用。流水线会通过 `Authorization: Bearer` 发送此令牌。

#### 选项 B：限定范围的用户 API 令牌

1. 在 Atlassian 账户安全设置中，选择 **创建和管理 API 令牌 → 创建带范围的 API 令牌**。
2. 选择 Bitbucket 并授予 **Pull requests: Read**（`read:pullrequest:bitbucket`）权限。Bitbucket 在此范围内包含对 Pull Request 发表评论的权限。
3. 将令牌存储为安全的 `BITBUCKET_API_TOKEN` 变量。
4. 将令牌所有者的 Atlassian 账户邮箱存储为 `BITBUCKET_API_TOKEN_EMAIL`。

流水线使用 Basic 认证，以 Atlassian 账户邮箱作为用户名，API 令牌作为密码。

> **应用密码停用：** Bitbucket 已于 2025 年 9 月 9 日停止允许创建新的应用密码，并于 2026 年 6 月 9 日禁用所有现有应用密码。请改用仓库访问令牌或限定范围的 API 令牌。

### 4. 启用 Pipelines

如果 Pipelines 尚未启用，请打开 **仓库设置 → Pipelines → 设置** 并启用它。将根目录下的 `bitbucket-pipelines.yml` 文件提交到仓库的默认分支，以便 Bitbucket 能够发现触发器定义。

`pullrequest-push` 触发器同时覆盖 PR 的创建和更新。它会为每个源分支调用指定的自定义流水线。

## 评论行为

OCR JSON 结果包含路径、内容和新增侧起始/结束行号。发布脚本将这些字段映射到 Bitbucket 的 `content.raw` 和 `inline` 评论属性：

- 具有有效路径和行号的发现将以行内评论形式发布。
- 如果 Bitbucket 以 HTTP 400 拒绝行内位置，脚本将重试将该发现作为普通 PR 评论发布，并在标题中包含文件和行范围。
- 没有可用行号信息的发现将以普通评论形式发布。
- 建议的替换代码包含在围栏 Markdown 代码块中。
- 每次运行都以 `OpenCodeReview summary` 评论结束，包括未发现任何问题的运行。

任何认证、权限、速率限制或服务器错误都会导致发布步骤失败，而不是静默丢失评论。

## 自定义

### 固定 OCR 版本

为了实现可复现的构建，请将安装命令替换为您团队验证过的版本：

```yaml
- npm install -g @alibaba-group/open-code-review@1.7.12
```

### 使用 Anthropic 端点

将 `OCR_LLM_USE_ANTHROPIC` 设置为 `true`。对于兼容 OpenAI 的端点，请保持未设置或设置为 `false`。

### 添加自定义审查规则

从目标分支读取受信任的规则文件，然后将提取的副本传递给 `--rule`：

```yaml
git show \
  "origin/${BITBUCKET_PR_DESTINATION_BRANCH}:.opencodereview/rule.json" \
  > /tmp/ocr-rule.json

ocr review \
  --rule /tmp/ocr-rule.json \
  --from "origin/${BITBUCKET_PR_DESTINATION_BRANCH}" \
  --to "${BITBUCKET_COMMIT}" \
  --format json \
  --audience agent
```

当步骤中可用安全变量时，不要从未经审查的 PR 分支直接加载可执行脚本或受信任的配置。

### 限制 LLM 并发

添加 `--concurrency` 以控制并发的 LLM 请求：

```yaml
ocr review \
  --concurrency 5 \
  --from "origin/${BITBUCKET_PR_DESTINATION_BRANCH}" \
  --to "${BITBUCKET_COMMIT}"
```

### 仅审查选定的目标分支

更改触发器条件，例如：

```yaml
triggers:
  pullrequest-push:
    - condition: BITBUCKET_PR_DESTINATION_BRANCH == "main"
      pipelines:
        - ocr-pr-review
```

### 使用传统的 Pull Request 选择器

对于不使用基于条件的触发器的仓库，可以使用传统语法选择相同的步骤：

```yaml
pipelines:
  pull-requests:
    "**":
      - step: *ocr-pr-review
```

不要为同一分支同时配置两种形式，否则 Bitbucket 可能会运行两次审查。

## 注意事项与限制

- **Fork Pull Request：** Bitbucket Cloud 不会为源为 Fork 的 Pull Request 触发 Pull Request 流水线。
- **合并构建设置：** Bitbucket 通过将目标分支合并到源分支来准备 Pull Request 构建。OCR 仍然使用显式的目标跟踪引用和 `$BITBUCKET_COMMIT`，因此它审查的是 PR 差异，而不是 Bitbucket 的临时合并结果。
- **克隆历史：** 本示例使用 `clone: depth: full`，以便 OCR 能够为长期存在的分支找到合并基础。
- **重复运行：** 每次源分支更新都会产生一组新的发现和新的总结。Bitbucket Cloud 将单个 Pull Request 的评论数限制为 200 条，因此对于频繁更新或非常大的 PR，团队可能需要添加幂等策略或合并发现结果。
- **Bitbucket Cloud：** 本示例中的 API URL 为 `https://api.bitbucket.org/2.0`。Bitbucket Data Center 使用不同的 API，此配置不适用。

## 故障排查

### HTTP 401

检查所选的认证方式是否完整：

- 仓库访问令牌：`BITBUCKET_ACCESS_TOKEN`
- API 令牌：`BITBUCKET_API_TOKEN` 和 `BITBUCKET_API_TOKEN_EMAIL` 两者

对于 API 令牌，邮箱必须是 Atlassian 账户邮箱，而不是 Bitbucket 用户名或令牌标签。

### HTTP 403

检查令牌范围，并确认令牌所有者或仓库令牌可以访问当前仓库并对其 Pull Request 发表评论。

### OCR 审查未产生输出

流水线在失败前会打印 OCR 的 stderr。使用这些诊断信息验证 `OCR_LLM_URL`、`OCR_LLM_AUTH_TOKEN` 和 `OCR_LLM_MODEL`。同时确认目标分支已被获取，并且 PR 更改包含 OCR 支持的文件类型。

### 找不到合并基础

保留 `clone: depth: full` 和显式的目标分支 `git fetch`。

### 流水线重复运行

Pull Request 流水线可能与 `default` 或 `branches` 流水线同时运行。确保只有一个配置的流水线为 PR 事件调用 OCR，并且不要对同一 PR 同时使用 `pullrequest-push` 触发器和传统的 `pull-requests` 选择器。

## 参考

- [Bitbucket 流水线启动条件](https://support.atlassian.com/bitbucket-cloud/docs/pipeline-start-conditions/)
- [Bitbucket Pipelines 变量和密钥](https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/)
- [Bitbucket 克隆行为](https://support.atlassian.com/bitbucket-cloud/docs/git-clone-behavior/)
- [Pull Request 评论 API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-comments-post)
- [仓库访问令牌权限](https://support.atlassian.com/bitbucket-cloud/docs/repository-access-token-permissions/)
- [使用限定范围的 API 令牌](https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/)