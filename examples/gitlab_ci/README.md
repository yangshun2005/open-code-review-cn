# OpenCodeReview - GitLab CI 演示

本演示展示了如何将 OpenCodeReview 集成到您的 GitLab CI/CD 流水线中，以自动审查合并请求并将审查评论作为内联讨论发布。

## 工作原理

```
创建/更新 MR → 触发 GitLab 流水线 → OCR 审查 Diff → 在 MR 上发布讨论
```

1. 当合并请求被打开或更新时，流水线被触发
2. 在 `node:20` Docker 镜像中通过 npm 安装 OCR
3. 运行 `ocr review --from origin/<目标分支> --to <提交SHA> --format json --audience agent` 来分析差异（使用提交 SHA 以支持 Fork 的 MR）
4. 解析 JSON 输出并使用 GitLab 的讨论 API 在 MR 上发布内联讨论

## 设置

### 1. 复制流水线和脚本文件

将 **两个** `.gitlab-ci.yml` 和 `post_review.py` 文件复制到您的仓库根目录（或子目录 — 如果您将脚本放在其他位置，请调整 YAML 中的 `python3 post_review.py` 路径）：

```bash
cp .gitlab-ci.yml post_review.py /path/to/your/repo/
```

或者在您现有的 `.gitlab-ci.yml` 中使用 GitLab 的 `include` 功能（脚本路径相对于流水线文件的位置）：

```yaml
include:
  - local: 'ci_demo/gitlab_ci/.gitlab-ci.yml'
```

### 2. 配置 CI/CD 变量

前往您项目的 **设置 → CI/CD → 变量** 并添加：

| 变量 | 必填 | 掩码 | 描述 |
|----------|----------|--------|-------------|
| `OCR_LLM_URL` | 是 | 否 | LLM API 端点 URL（例如 `https://api.openai.com/v1/chat/completions`） |
| `OCR_LLM_AUTH_TOKEN` | 是 | 是 | API 认证令牌 |
| `OCR_LLM_MODEL` | 是 | 否 | 模型名称（例如 `gpt-4o`）— OCR 没有内置默认模型，未设置时会失败 |
| `GITLAB_API_TOKEN` | 否 | 是 | 具有 `api` 权限的 GitLab 访问令牌（未设置时回退到 `CI_JOB_TOKEN`） |
| `OCR_VERSION` | 否 | 否 | `@alibaba-group/open-code-review` 的 npm 版本规格（默认：`latest`）。建议固定版本（例如 `1.8.8` 或 `~1.8`）以获得可复现的审查结果。 |
| `OCR_LANGUAGE` | 否 | 否 | 审查输出语言，通过 `ocr config set language` 写入（例如 `English`、`Chinese`）。默认为 OCR 的内置默认值。 |
| `OCR_LLM_AUTH_HEADER` | 否 | 否 | 自定义认证头名称，通过 `ocr config set llm.auth_header` 写入（例如某些提供商的 `x-api-key`）。 |
| `OCR_LLM_EXTRA_HEADERS` | 否 | 否 | 额外请求头 `K=V,K=V`，通过 `ocr config set llm.extra_headers` 写入。 |
| `OCR_LLM_TIMEOUT` | 否 | 否 | LLM 请求超时时间（秒），由 OCR 从环境变量原生读取。未设置/为空 = 使用 OCR 默认值。 |
| `OCR_REVIEW_CONCURRENCY` | 否 | 否 | 最大并发文件审查数，通过 `ocr review --concurrency` 传递（默认：8）。 |
| `OCR_BACKGROUND` | 否 | 否 | 业务/需求上下文，通过 `ocr review --background` 传递（例如 MR 标题）。 |
| `OCR_RULE` | 否 | 否 | 自定义规则 JSON 文件的路径，通过 `ocr review --rule` 传递。 |

> **注意：** GitLab CI/CD 不支持值少于 8 个字符的变量，因此 `use_anthropic` 不能作为 CI 变量设置。流水线默认将其设置为 `false`。如果您需要使用 Anthropic Claude 模型，需要直接修改 `.gitlab-ci.yml` 脚本。
>
> 流水线还配置了 `llm.extra_body` 以禁用思考模式，确保与各种 LLM 提供商的兼容性。

### 3. 创建 GitLab 访问令牌

您需要一个具有 `api` 权限的令牌来在 MR 上发布讨论。选项：

- **项目访问令牌**（推荐）：设置 → 访问令牌 → 创建并选择 `api` 权限
- **个人访问令牌**：用户设置 → 访问令牌 → 创建并选择 `api` 权限
- **组访问令牌**：用于组织级使用

> **注意：** 内置的 `CI_JOB_TOKEN` 的 API 权限有限，可能不支持所有讨论功能（例如在旧版 GitLab 上创建新线程）。如果未设置 `GITLAB_API_TOKEN`，流水线会自动回退到 `CI_JOB_TOKEN` — 但为了获得最佳效果，建议使用具有 `api` 权限的专用令牌。
>
> **提示：** 对于项目访问令牌和组访问令牌，令牌名称决定了 MR 讨论中显示的机器人名称。例如，将令牌命名为 `OpenCodeReview Bot` 将使审查评论显示为由 `OpenCodeReview Bot` 发布。

## 输出示例

当 MR 被审查时，评论显示为：

- **内联讨论**：直接显示在 MR 差异视图中的变更行上，当 LLM 提供了元数据时，每条评论都带有 `[类别 · 严重级别]` 徽章前缀
- **摘要备注**：一条备注（默认在多次运行中原地更新）汇总发现的问题总数，包含互斥的计数（内联 / 摘要 / 路由 / 跳过 / 失败）和详细的警告列表
- **回退备注**：无法内联发布的发现（无行信息、按策略路由、或无法在差异中解析位置）被收集到摘要备注中，每条都标记了其归入的原因

### 内联讨论示例

评论使用 GitLab 的讨论 API 并携带位置数据发布，因此它们直接显示在"变更"选项卡中相关代码旁边。每条评论都带有一个 HTML 注释 ID 标签（渲染时不可见），脚本使用该标签在重试时避免重复发布。

## 支持的 LLM 提供商

OCR 支持 OpenAI 和 Anthropic 两种 API 格式：

- **兼容 OpenAI 的 API**（默认）：
  - OpenAI（GPT-4o、GPT-4 等）
  - Azure OpenAI
  - 自托管模型（vLLM、Ollama 等）
- **Anthropic API**（修改 `.gitlab-ci.yml` 设置 `use_anthropic: true`）：
  - Anthropic Claude 模型

## 自定义配置

大多数审查行为可以通过 CI/CD 变量配置（见上表）— 无需编辑 YAML。以下方案涵盖其余情况。

### 使用特定 OCR 版本

设置 `OCR_VERSION` CI/CD 变量（例如 `1.8.8` 或 `~1.8`）。未设置时默认为 `latest`。

### 添加自定义审查规则

将 `OCR_RULE` CI/CD 变量设置为自定义规则 JSON 文件的路径（传递给 `ocr review --rule`）。对于仓库内的规则，提交文件并将 `OCR_RULE` 指向其路径。

### 调整重试和延迟设置

发布审查讨论时，脚本包含带指数退避（含抖动）的限流处理、`Retry-After` 头支持，以及基于 GitLab `RateLimit-Remaining` 响应头的主动限速。所有 API 请求 — 包括摘要备注和 MR 版本获取 — 都使用相同的重试逻辑。有关 GitLab 限流策略和推荐处理的详细信息，请参阅 [GitLab 速率限制](https://docs.gitlab.com/security/rate_limits/)。您可以通过 **CI/CD 变量**（设置 → CI/CD → 变量）配置重试和延迟行为：

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `OCR_RETRY_BASE_DELAY` | `2000` | 遇到限流错误时指数退避的基础延迟（毫秒） |
| `OCR_MAX_RETRIES` | `3` | 每次讨论在限流时的最大重试次数 |
| `OCR_MAX_RETRY_DELAY` | `60000` | 单次重试的最大延迟（毫秒），同时限制 `Retry-After` 和退避 |
| `OCR_SUCCESS_DELAY` | `2000` | 成功发布讨论后的延迟（毫秒），用于控制后续请求的节奏 |
| `OCR_FAILURE_DELAY` | `1000` | 非限流失败后的延迟（毫秒），用于控制后续请求的节奏 |
| `OCR_RATE_LIMIT_THRESHOLD` | `10` | 当 GitLab `RateLimit-Remaining` 低于/等于此值时主动减速（设置为 `0` 禁用）。同时适用于写入（加倍节奏延迟）和读取（切换到更长的读取间隔）。 |
| `OCR_READ_SUCCESS_DELAY` | `500` | 成功读取（`list_notes`/`list_discussions`/`get_mr_diffs`）后的延迟（毫秒），用于控制读取 API 调用的节奏，与 GitHub Action 的 `readWithPacing` 对应。 |
| `OCR_READ_LOW_REMAINING_SPACING` | `5000` | 当剩余配额低于/等于 `OCR_RATE_LIMIT_THRESHOLD` 时，读取后使用的更长延迟（毫秒）。 |
| `OCR_ROUTE_SEVERITY_BELOW` | _(空)_ | 可选的严重级别阈值（`critical`、`high`、`medium`、`low`），将等于或低于该级别的发现从内联评论路由到摘要备注（故障开放：绝不丢弃发现）。空值或未知值禁用严重级别路由。 |
| `OCR_ROUTE_CATEGORIES` | _(空)_ | 可选的分隔符分隔的类别列表（`bug`、`security`、`performance`、`maintainability`、`test`、`style`、`documentation`、`other`），从内联路由到摘要备注。未知标记被忽略。与 `OCR_ROUTE_SEVERITY_BELOW` 组合使用以在任一条件下路由。 |

这些变量是可选的 — 如果未配置，将使用合理的默认值。对于具有激进限流配置的自托管 GitLab 实例，或生成大量审查评论的大型 MR，建议增加延迟。`OCR_RATE_LIMIT_THRESHOLD` 变量启用主动限速：当 GitLab 在 `RateLimit-Remaining` 响应头中报告低剩余配额时，脚本自动加倍节奏延迟以避免 429 错误。

当主限流耗尽时（`RateLimit-Remaining: 0`），脚本还会遵循 GitLab 的 `RateLimit-Reset` 头，休眠直到限制重置（防御性地处理纪元秒和秒数到重置两种格式）。这与 GitHub Action 的 `x-ratelimit-reset` 处理方式一致。

### 发布行为（与 GitHub Action 对齐）

发布脚本实现了与 GitHub Action（`scripts/github-actions/post-review-comments.js`）相同的发布行为，以可选的 CI/CD 变量形式暴露。除 `OCR_STICKY_SUMMARY` 默认为 `true` 外（摘要备注在多次运行中原地更新，而不是每次运行累积一条备注），所有变量默认均为无操作/当前行为。

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `OCR_STICKY_SUMMARY` | `true` | 在多次运行中原地更新摘要备注（按标记查找然后 `PUT /notes/:id`）。设置为 `false` 则每次运行发布新备注。 |
| `OCR_INCREMENTAL` | `false` | 跳过行范围与同一路径上先前机器人讨论重叠的评论（因此重新运行只追加新发现）。对多行跨度使用 IoU 阈值。 |
| `OCR_INCREMENTAL_OVERLAP_THRESHOLD` | `0.6` | IoU（0–1）超过该值的两条多行评论被视为相同。单行评论仅在完全相同的行上匹配；单行和多行评论永不匹配。 |
| `OCR_ROUTE_SEVERITY_BELOW` | _(空)_ | 将严重级别等于或低于此级别的发现路由到摘要备注而不是内联发布（例如 `low` 只保留 critical/high/medium 内联）。未知严重级别永不匹配（故障开放）。 |
| `OCR_ROUTE_CATEGORIES` | _(空)_ | 以逗号分隔的类别列表，路由到摘要（例如 `style,documentation`）。被路由的发现永远不会进入内联写入路径，因此不会在重试时重复发布。 |
| `OCR_FAIL_ON_SEVERITY` | _(空)_ | 当任何评论的严重级别等于或高于此级别时使 CI 作业失败（非零退出）（例如 `critical`）。摘要备注仍会在作业失败前发布，因此可见性得以保留。 |

从 GitHub Action 移植的其他行为（始终开启，无变量）：

- **类别/严重级别徽章**：当 LLM 提供了元数据时，每条内联讨论和回退条目都带有 `[类别 · 严重级别]` 前缀（使用中点 U+00B7），与 CLI 的徽章渲染字节匹配。
- **确定性排序**：评论在发布前按 `路径 → 起始行 → 结束行 → 原始索引` 排序，因此相同的重跑产生相同的发布序列（这正是幂等对账可复现的原因）。
- **详细警告**：警告以项目符号列表（`文件（类型）：消息`）而非单纯计数呈现。
- **反引号安全围栏**：回退的 Before/After 代码块使用足够长的围栏以包含代码中的任何反引号（内联建议保持固定的三反引号 `suggestion:-0+0` 形式，以便 GitLab 的"应用建议"按钮继续工作）。
- **幂等重试**：每条内联讨论都带有不可见的 HTML 注释 ID 标签（`<!-- ocr-<流水线>-<作业>-<十六进制> -->`）。当 `POST /discussions` 因 5xx/408/网络错误失败时（请求可能已到达），脚本在重试前查询现有讨论以查找该 ID；如果找到则视为成功（不重复），如果读取 API 不可用则跳过重试以避免重复风险。
- **400 行解析回退**：当讨论 `POST` 返回 400 表示位置问题时，脚本获取 MR 差异（`GET /merge_requests/:iid/diffs`），将评论分类为有效/无效/未知，并将可证明不在差异中的发现丢弃到摘要中，而不是盲目重试。未知情况保留现有的回退行为。

### CI 输出和构建产物

流水线向下游作业暴露以下内容：

- **dotenv 报告**（`.ocr/ocr-stats.env`）：`OCR_COMMENTS_TOTAL`、`OCR_COMMENTS_INLINE`、`OCR_COMMENTS_SUMMARY`、`OCR_COMMENTS_ROUTED`、`OCR_COMMENTS_SKIPPED`、`OCR_COMMENTS_FAILED` 和 `OCR_SUMMARY_URL`。通过 `dotenv` 构建产物在后续阶段中使用它们。
- **构建产物**（`when: always`，保留 1 周）：`.ocr/ocr-result.json`（原始审查 JSON）和 `.ocr/ocr-stderr.log`（OCR 标准错误），以便即使作业失败也能检查失败的审查。路径是项目相对的（在 `.ocr/` 下），因为 GitLab Runner 拒绝上传构建目录之外的构建产物。

### 限制并发

设置 `OCR_REVIEW_CONCURRENCY` CI/CD 变量（传递给 `ocr review --concurrency`）。对于大型 MR，降低此值可限制并发 LLM 请求：

```yaml
variables:
  OCR_REVIEW_CONCURRENCY: "5"
```

### 提供背景上下文

设置 `OCR_BACKGROUND` CI/CD 变量（传递给 `ocr review --background`）。常见选择是 MR 标题：

```yaml
variables:
  OCR_BACKGROUND: "$CI_MERGE_REQUEST_TITLE"
```

当您的 MR 标题遵循语义化约定（例如 `feat(auth): add OAuth2 support`）时，这特别有用，因为标题清晰地总结了 MR 实现的内容。背景信息帮助 OCR 提供更相关和上下文感知的审查评论。

### 更改触发事件

默认情况下，流水线使用 `only: [merge_requests]`，这会在 **所有** MR 事件（创建、更新、重新打开）时触发。GitLab CI 不原生支持细粒度控制以 **仅在 MR 创建时** 触发。

为避免在每次推送到现有 MR 时重新审查（并浪费 LLM API 令牌），您可以在运行 `ocr review` **之前** 检查是否已有 OCR 审查。使用包装脚本，如果 OCR 评论已存在则跳过审查步骤：

```yaml
script:
  # 安装 OpenCodeReview
  - npm install -g @alibaba-group/open-code-review

  # 配置 OCR
  - |
    : "${OCR_LLM_URL:?set OCR_LLM_URL in Settings -> CI/CD -> Variables}"
    : "${OCR_LLM_AUTH_TOKEN:?set OCR_LLM_AUTH_TOKEN in Settings -> CI/CD -> Variables}"
    : "${OCR_LLM_MODEL:?set OCR_LLM_MODEL in Settings -> CI/CD -> Variables}"
    ocr config set llm.url "$OCR_LLM_URL"
    ocr config set llm.auth_token "$OCR_LLM_AUTH_TOKEN"
    ocr config set llm.model "$OCR_LLM_MODEL"
    ocr config set llm.use_anthropic false
    ocr config set llm.extra_body '{"thinking": {"type": "disabled"}}'

  # 检查现有 OCR 审查，仅在未找到时运行审查
  - |
    python3 << 'WRAPPER_SCRIPT'
    import json
    import os
    import subprocess
    import sys
    import urllib.request

    GITLAB_URL = os.environ.get("CI_SERVER_URL", "https://gitlab.com")
    PROJECT_ID = os.environ["CI_PROJECT_ID"]
    MR
```