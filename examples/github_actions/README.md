# OpenCodeReview - GitHub Actions 工作流

本目录提供了一个可直接使用的 GitHub Actions 工作流演示，可将 OpenCodeReview 集成到您的仓库中，自动审查 Pull Request 并发布行内审查评论。将其复制到 `.github/workflows/` 目录并配置所需的 secrets/vars。

## 快速开始：`ocr-review.yml`

最简单的接入方式：此演示将每个步骤——检出、OCR 安装、审查、评论发布、构建产物上传——都委托给 [`action.yml`](../../action.yml) 中的官方可复用复合操作，通过单个 `uses: alibaba/open-code-review@main` 步骤完成。它涵盖了自动 PR 审查（`pull_request_target: opened/synchronize/reopened`）以及通过评论触发的按需重新审查（`/open-code-review` 或 `@open-code-review`）。无需维护内联脚本——`@main` 始终运行最新操作；当您需要可重复的运行结果时，请参阅[可复现固定](#可复现固定)。

```bash
mkdir -p .github/workflows
cp ocr-review.yml .github/workflows/ocr-review.yml
```

该演示的核心是一个单一的操作步骤：

```yaml
- uses: alibaba/open-code-review@main
  with:
    llm_url: ${{ secrets.OCR_LLM_URL }}
    llm_auth_token: ${{ secrets.OCR_LLM_AUTH_TOKEN }}
    llm_model: ${{ vars.OCR_LLM_MODEL }}
    llm_use_anthropic: ${{ vars.OCR_LLM_USE_ANTHROPIC }}
```

有关完整的输入、输出、安全指南以及四种评论发布模式（粘性摘要 + 增量），请参阅 [`action.yml`](../../action.yml)。

## 可复现固定

该操作是一个编排器：它在运行时从 npm 安装 OCR CLI（`ocr_version`，默认为 `latest`）。因此，仅固定操作引用**不会**冻结审查行为——新的 CLI 发布仍会改变实际运行的内容。要实现完全可复现的设置，请同时固定两者：

```yaml
- uses: alibaba/open-code-review@<full-commit-sha> # vX.Y.Z
  with:
    ocr_version: 'X.Y.Z'
    llm_url: ${{ secrets.OCR_LLM_URL }}
    llm_auth_token: ${{ secrets.OCR_LLM_AUTH_TOKEN }}
    llm_model: ${{ vars.OCR_LLM_MODEL }}
    llm_use_anthropic: ${{ vars.OCR_LLM_USE_ANTHROPIC }}
```

从[发布页面](https://github.com/alibaba/open-code-review/releases)获取提交 SHA，并在其旁边保留 `# vX.Y.Z` 注释，以便更新工具（Dependabot、Renovate）能够跟踪它。[`action.yml`](../../action.yml) *内部*引用的每个操作本身都固定到完整的提交 SHA（由 CI 中的 `scripts/verify-action-pins.sh` 强制执行），因此外部 SHA 可传递地冻结整个工作流——只有上述两个坐标由您选择。

## 在自托管运行器上运行

上述演示在 GitHub 托管的运行器（`runs-on: ubuntu-latest`）上运行，并从 `alibaba/open-code-review@main` 拉取操作。如果您更倾向于在自己的自托管运行器上运行 OCR——例如访问私有网络资源、保持 LLM 流量在本地，或避免运行器分钟费用——OCR 项目本身在其自己的 CI 中正是这样做的。

请参阅 [`.github/workflows/ocr-review.yml`](../../.github/workflows/ocr-review.yml) 了解该工作流。它在 `node:24` 容器内的 `runs-on: self-hosted` 上运行。一个重要的注意事项：它使用 `uses: ./` 调用操作，仅因为 `action.yml` 位于同一仓库中——这是一个内部快捷方式，在您的仓库中无法解析。作为外部用户，请保留 `uses: alibaba/open-code-review@main`（运行器会自动获取操作）；只需更改运行器环境。值得借鉴的地方：

- `runs-on: self-hosted`，可选地使用 `container:` 镜像，如 `node:24`（操作需要 Node.js；如果缺少 git，会自动安装）。
- 在容器内运行时，将工作区标记为受信任的 git `safe.directory`（例如 `git config --global --replace-all safe.directory '*'`），以避免“dubious ownership”错误。使用 `--replace-all`（而非 `--add`），以便在多个自托管操作中重复运行时替换而非累积全局 git 配置中的条目。
- 显式固定操作输入（`sticky_summary`、`incremental`、`upload_artifacts`、`llm_extra_body` 等）。

该操作会在内部自行执行完整的 `fetch-depth: 0` 检出 PR，因此无需额外的检出步骤即可获取审查差异。根据您的环境和 secret 布局调整运行器设置。

## 工作原理

```
PR 创建/更新 → 触发 GitHub Actions → OCR 审查差异 → 在 PR 上发布评论
     或
带有触发关键字的评论 ↗
```

1. 当 PR 被打开时，工作流触发（使用 `pull_request_target` 以访问 fork 的 secrets）。
2. 或者，当在 PR 上发布包含 `/open-code-review` 或 `@open-code-review` 的评论时，工作流触发。
3. 可复用操作安装 OCR，获取 PR 头部的 blobs，计算 `git merge-base`，并运行 `ocr review --from <merge-base> --to <head> --format json`。
4. 它解析 JSON 输出，通过 Pull Request Review API 在 PR 上发布行内审查评论，以及一条摘要评论（PR 上的 issue 评论）。

## 设置

### 配置 secrets 和 variables

转到您的仓库的 **Settings → Secrets and variables → Actions**。

**Secrets：**

| Secret | 必需 | 描述 |
|--------|----------|-------------|
| `OCR_LLM_URL` | 是 | LLM API 端点 URL（例如 `https://api.openai.com/v1/chat/completions`） |
| `OCR_LLM_AUTH_TOKEN` | 是 | API 认证令牌（内部映射到环境变量 `OCR_LLM_TOKEN`） |

**Variables：**

| Variable | 必需 | 描述 |
|----------|----------|-------------|
| `OCR_LLM_MODEL` | 是 | 模型名称 |
| `OCR_LLM_USE_ANTHROPIC` | 是 | `true` 表示 Anthropic Claude，`false` 表示 OpenAI 兼容 |

> **注意：** `GITHUB_TOKEN` 由 GitHub Actions 自动提供，并具有所需的 `pull-requests: write` 权限。该操作还会设置 `llm.extra_body` 以禁用思考模式，从而兼容各种 LLM 提供商。

## 自定义

> 这些旋钮是操作输入——它们适用于演示工作流以及任何调用 `alibaba/open-code-review@main` 的工作流。

有关完整的输入列表，请参阅 [`action.yml`](../../action.yml)。工作流级别的设置（触发器、关键字）在工作流文件中编辑。

### 更改触发事件

修改工作流文件中的 `on.pull_request_target.types` 数组：

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened, ready_for_review]
```

### 自定义评论触发关键字

默认情况下，当 PR 评论以 `/open-code-review` 或 `@open-code-review` 开头时，工作流还会按需重新审查。`if` 条件比简单的关键字检查更具防御性——它限制了评论触发器，只有授权的人类才能消耗 LLM 配额：

```yaml
if: |
  github.event_name == 'pull_request_target'
  || (
    github.event_name == 'issue_comment'
    && github.event.issue.pull_request
    && github.event.comment.user.type != 'Bot'
    && (
      github.event.comment.author_association == 'MEMBER'
      || github.event.comment.author_association == 'OWNER'
      || github.event.comment.author_association == 'COLLABORATOR'
    )
    && (
      startsWith(github.event.comment.body, '/open-code-review')
      || startsWith(github.event.comment.body, '@open-code-review')
    )
  )
```

每个子句都针对不同的滥用向量进行防护：

- `github.event.issue.pull_request` — 评论必须位于 PR 上，而非普通 issue。
- `github.event.comment.user.type != 'Bot'` — 忽略机器人评论。`GITHUB_TOKEN` 已经抑制了其自身发布评论所产生的事件，但 PAT 或 GitHub App 令牌不会，因此这是防止自触发循环的安全网。
- `author_association == 'MEMBER' | 'OWNER' | 'COLLABORATOR'` — 只有仓库协作者才能触发（计费的）重新审查，防止任意评论者耗尽 LLM 配额。
- `startsWith(...)` 对 — 实际的触发关键字。

要更改关键字，只需编辑最后一对（例如 `/review` 和 `@mybot`），或将 `startsWith` 替换为 `contains` 以匹配评论正文中任意位置的子字符串。请保持前面的防护子句不变。

相同的谓词也反映在工作流的 `concurrency.group` 中：匹配的事件共享每个 PR 的分组（`ocr-<pr_number>`），因此新的审查会取消任何过时的审查，而不匹配的评论则进入唯一的 `noop-<run_id>` 分组并立即跳过，不会中断正在进行的审查。如果您在 `if` 中更改了关键字，请在 `concurrency.group` 中同步更改。

### 使用特定 OCR 版本

```yaml
- uses: alibaba/open-code-review@main
  with:
    ocr_version: 1.0.0
```

### 添加自定义审查规则

```yaml
- uses: alibaba/open-code-review@main
  with:
    rule: ./my-rules.json
```

> 安全：当 secrets 在范围内时，不要将 `rule` 指向来自 PR 分支的文件；请使用来自基础分支的可信规则文件。

### 控制评论发布（粘性摘要与增量）

该操作会发布一条摘要 issue 评论以及行内审查评论。两个输入选择发布模式（组合起来，它们提供了上述四种模式）；第三个输入调整增量重叠测试：

| 输入 | 默认值 | 描述 |
|-------|---------|-------------|
| `sticky_summary` | `'true'` | 就地更新现有的摘要评论，而不是每次运行都发布新评论。 |
| `incremental` | `'false'` | 仅追加其 `(path, line range)` 与现有机器人审查评论不重叠的行内评论。历史记录永远不会被删除（非破坏性）。 |
| `incremental_overlap_threshold` | `'0.6'` | `incremental` 用于判断多行评论是否与现有评论重叠的 IoU 阈值。两条单行评论在同一行上匹配；单行与多行评论永不匹配。除非 `incremental` 为 `'true'`，否则忽略。 |

```yaml
- uses: alibaba/open-code-review@main
  with:
    sticky_summary: 'true'
    incremental: 'true'
    incremental_overlap_threshold: '0.75'
```

> `sticky_summary` 和 `incremental` 必须是带引号的字符串（`'true'`/`'false'`）；该操作将它们作为字符串进行比较，因此未加引号的 YAML 布尔值将无法匹配。

### 调整重试和延迟设置

当单独发布审查评论时（回退模式），该操作会遵循 GitHub 的速率限制头（`retry-after`、`x-ratelimit-*`）并采用指数退避。重试策略遵循 GitHub 关于 REST API 速率限制的文档指南——有关主/次速率限制及推荐重试行为的详细信息，请参阅 [REST API 的速率限制](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2026-03-10)：

- **主速率限制已耗尽**（`x-ratelimit-remaining=0`）：等待直到 `x-ratelimit-reset`。
- **带有 `retry-after` 头的次速率限制**：精确等待该时长。
- **无头的次速率限制**：至少等待一分钟，然后对持续失败使用指数退避。

以下是评论发布模块读取的环境变量，具有合理的默认值；在**作业 `env:` 级别**设置它们以进行调整（它们会传播到操作中）：

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `OCR_RETRY_BASE_DELAY` | `60000` | 无重试头时指数退避的基础延迟（毫秒） |
| `OCR_RETRY_MAX_DELAY` | `300000` | 应用于每次计算等待的最大延迟（毫秒）上限 |
| `OCR_MAX_RETRIES` | `3` | 每次评论在速率受限时的最大重试次数 |
| `OCR_SUCCESS_DELAY` | `2000` | 评论发布成功后的延迟（毫秒） |
| `OCR_FAILURE_DELAY` | `1000` | 不可重试失败后的延迟（毫秒） |
| `OCR_LOW_REMAINING_THRESHOLD` | `3` | 当 x-ratelimit-remaining 低于或等于此值时，主动增加请求间隔 |
| `OCR_LOW_REMAINING_SPACING` | `10000` | 剩余配额较低时使用的请求间隔（毫秒） |
| `OCR_READ_SUCCESS_DELAY` | `500` | 读取 API 调用（`listReviews` / `listReviewComments` / `listIssueComments`）成功后的延迟（毫秒），用于幂等性检查。读取比写入更廉价，因此默认值更短 |
| `OCR_READ_LOW_REMAINING_SPACING` | `5000` | 剩余配额较低时读取调用的请求间隔（毫秒） |

例如，要将每次评论的重试次数提高到 5，请在**作业的** `env:` 上设置 `OCR_MAX_RETRIES`——而不是在 `uses:` 步骤上。复合操作不会将调用方的步骤级 `env:` 转发到其内部步骤的进程环境中，因此步骤级的值会被静默忽略；作业级的值会被操作的评论发布步骤继承，并通过 `process.env` 读取：

```yaml
jobs:
  code-review:
    runs-on: ubuntu-latest
    env:
      OCR_MAX_RETRIES: 5
    steps:
      - uses: alibaba/open-code-review@main
        with:
          llm_url: ${{ secrets.OCR_LLM_URL }}
          # ...其他输入
```

这些变量是可选的。请参阅 GitHub 的 [REST API 的速率限制](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)。

#### 幂等性：避免重复的审查评论

当批量 `createReview` 调用因 `5xx` 错误失败时，请求可能仍然已经到达 GitHub 服务器（只是响应丢失了）。在逐条重试之前，操作会查询现有的 reviews 和 review comments——每条都带有每次运行的 HTML 注释标记（例如 `<!-- ocr-<runId>-<attempt>-<token> -->`）——并且只重试实际缺失的评论。这可以防止重复的审查发布。

摘要评论也会去重：在粘性模式（默认）下，操作通过其持久标记找到现有摘要并就地更新，而不是发布新评论；在非粘性模式下，如果本次运行的摘要已存在，则复用。如果读取 API 不可用，它会跳过发布摘要，而不是冒重复的风险。

如果读取 API 本身不可用（速率受限或 `5xx`），检查返回 *unknown* 而不是假设评论未发布。在这种情况下，操作**跳过重试**以避免重复风险，并在摘要中呈现这种不确定性，而不是静默产生重复。

### 限制 LLM 并发

```yaml
- uses: alibaba/open-code-review@main
  with:
    review_concurrency: 5
```

### 提供背景上下文

```yaml
- uses: alibaba/open-code-review@main
  with:
    background: ${{ github.event.pull_request.title }}
```

当 PR 标题遵循语义化约定（例如 `feat(auth): add OAuth2 support`）时特别有用。

> 注意：`github.event.pull_request.title` 仅在 `pull_request_target` 事件中存在，因此在评论触发的重新审查中为空。要覆盖两种触发类型，请让 pr-context 步骤也输出标题并回退到它：
>
> ```yaml
> # 在 pr-context 脚本内部（仅对 issue_comment 运行）：
> core.setOutput('title', pullRequest.title);
> ```
> ```yaml
> - uses: alibaba/open-code-review@main
>   with:
>     background: ${{ steps.pr-context.outputs.title || github.event.pull_request.title }}
> ```

### 使用 GitHub App 自定义审查评论作者

默认情况下，审查评论使用内置的 `GITHUB_TOKEN` 发布，显示为 `github-actions[bot]`。您可以通过创建 GitHub App 并使用其凭据来自定义。

有关 GitHub Apps 的更多详细信息，请参阅 [GitHub Apps 文档](https://docs.github.com/en/apps)。

#### 步骤 1：创建 GitHub App

1. 转到您的组织或个人账户 **Settings → Developer settings → GitHub Apps → New GitHub App**
2. 填写以下内容：
   - **GitHub App name**：例如 `OpenCodeReview Bot`
   - **Homepage URL**：您的仓库或文档 URL
   - **Webhook**：取消勾选 "Active"（此用例不需要）
3. 在 **Repository permissions** 下，设置：
   - **Pull requests**：Read and write
   - **Contents**：Read-only（用于获取差异）
   - **Metadata**：Read-only（必需）
4. 点击 **Create GitHub App**

#### 步骤 2：生成私钥

1. 创建应用后，向下滚动到 **Private keys**
2. 点击 **Generate a private key**
3. 安全下载并保存 `.pem` 文件

记下应用设置页面上的 App ID。

#### 步骤 3：安装应用

1. 在左侧边栏中，点击 **Install App**
2. 选择