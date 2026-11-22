# OpenCodeReview - GitHub Actions 工作流

本目录提供一个开箱即用的 GitHub Actions 工作流示例，将 OpenCodeReview 集成到你的仓库，自动审查 Pull Request 并发布行内审查评论。将其复制到 `.github/workflows/` 并配置所需的 secrets/vars 即可。

## 快速开始：`ocr-review.yml`

最简单的接入方式：本示例将每一步——检出、安装 OCR、审查、发布评论、上传构建产物——全部委托给官方可复用复合 Action [`action.yml`](../../action.yml)，只需一个 `uses: alibaba/open-code-review@main` 步骤。它同时覆盖自动 PR 审查（`pull_request_target: opened/synchronize/reopened`）和通过评论按需重新审查（`/open-code-review` 或 `@open-code-review`）。无需维护内联脚本——`@main` 始终运行最新 Action；需要可重复运行时参见[可复现固定版本](#可复现固定版本)。

```bash
mkdir -p .github/workflows
cp ocr-review.yml .github/workflows/ocr-review.yml
```

示例的核心是一个 Action 步骤：

```yaml
- uses: alibaba/open-code-review@main
  with:
    llm_url: ${{ secrets.OCR_LLM_URL }}
    llm_auth_token: ${{ secrets.OCR_LLM_AUTH_TOKEN }}
    llm_model: ${{ vars.OCR_LLM_MODEL }}
    llm_use_anthropic: ${{ vars.OCR_LLM_USE_ANTHROPIC }}
```

完整的输入、输出、安全指引以及四种评论发布模式（置顶摘要 + 增量）见 [`action.yml`](../../action.yml)。

## 可复现固定版本

该 Action 是一个编排器：它在运行时从 npm 安装 OCR CLI（`ocr_version`，默认 `latest`）。因此仅固定 Action 引用**不能**冻结审查行为——新的 CLI 版本仍会改变实际运行内容。要完全可复现，需同时固定两者：

```yaml
- uses: alibaba/open-code-review@<full-commit-sha> # vX.Y.Z
  with:
    ocr_version: 'X.Y.Z'
    llm_url: ${{ secrets.OCR_LLM_URL }}
    llm_auth_token: ${{ secrets.OCR_LLM_AUTH_TOKEN }}
    llm_model: ${{ vars.OCR_LLM_MODEL }}
    llm_use_anthropic: ${{ vars.OCR_LLM_USE_ANTHROPIC }}
```

从[发布页面](https://github.com/alibaba/open-code-review/releases)获取提交 SHA，并在旁边保留 `# vX.Y.Z` 注释，以便更新工具（Dependabot、Renovate）跟踪。`action.yml` 内部引用的每个 Action 本身都固定到完整提交 SHA（由 CI 中的 `scripts/verify-action-pins.sh` 强制），因此外层 SHA 会传递性地冻结整个工作流——只有上述两个坐标由你选择。

## 在自托管 Runner 上运行

上述示例运行在 GitHub 托管的 Runner 上（`runs-on: ubuntu-latest`），并从 `alibaba/open-code-review@main` 拉取 Action。如果你希望在自托管 Runner 上运行 OCR——以访问私有网络资源、将 LLM 流量保留在本地，或避免 Runner 分钟费用——OCR 项目自身的 CI 正是这样做的。

参见 [`.github/workflows/ocr-review.yml`](../../.github/workflows/ocr-review.yml)。它在 `node:24.22.1` 容器内以 `runs-on: self-hosted` 运行。一个重要注意事项：它使用 `uses: ./` 调用 Action，仅因为 `action.yml` 就在同一仓库中——这是内部捷径，在你的仓库中无法解析。作为外部用户，请保留 `uses: alibaba/open-code-review@main`（Runner 会自动拉取 Action）；只需更改 Runner 环境。值得借鉴的部分：

- `runs-on: self-hosted`，可选配 `container:` 镜像如 `node:24.22.1`（Action 需要 Node.js；git 缺失时会自动安装）。
- 在容器内运行时，将工作区标记为受信任的 git `safe.directory`（例如 `git config --global --replace-all safe.directory '*'`），以避免 "dubious ownership" 错误。使用 `--replace-all`（而非 `--add`），以便多次自托管运行替换而非累积全局 git 配置条目。
- 显式固定 Action 输入（`sticky_summary`、`incremental`、`upload_artifacts`、`llm_extra_body` 等）。

Action 内部会自行执行完整的 `fetch-depth: 0` 检出 PR，因此审查 diff 无需额外的检出步骤。根据你的环境和 secret 布局调整 Runner 设置。

## 工作原理

```
PR 创建/更新 → 触发 GitHub Actions → OCR 审查 Diff → 在 PR 上发布评论
     或
带触发关键词的评论 ↗
```

1. PR 打开时触发工作流（使用 `pull_request_target` 以访问 Fork 的 secret）。
2. 或者，当 PR 上发布包含 `/open-code-review` 或 `@open-code-review` 的评论时触发工作流。
3. 可复用 Action 安装 OCR，获取 PR head blob，计算 `git merge-base`，并运行 `ocr review --from <merge-base> --to <head> --format json`。
4. 解析 JSON 输出，通过 Pull Request Review API 在 PR 上发布行内审查评论，并发布摘要评论（PR 上的 issue 评论）。

## 配置

### 配置 secrets 和变量

前往仓库的 **Settings → Secrets and variables → Actions**。

**Secrets：**

| Secret | 必需 | 描述 |
|--------|----------|-------------|
| `OCR_LLM_URL` | 是 | LLM API 端点 URL（例如 `https://api.openai.com/v1/chat/completions`） |
| `OCR_LLM_AUTH_TOKEN` | 是 | API 认证令牌（内部映射到环境变量 `OCR_LLM_TOKEN`） |

**Variables：**

| Variable | 必需 | 描述 |
|----------|----------|-------------|
| `OCR_LLM_MODEL` | 是 | 模型名称 |
| `OCR_LLM_USE_ANTHROPIC` | 是 | Anthropic Claude 设为 `true`，OpenAI 兼容设为 `false` |

> **注意：** `GITHUB_TOKEN` 由 GitHub Actions 自动提供，具有所需的 `pull-requests: write` 权限。默认情况下，Action 将 `llm.extra_body` 设为 `{"thinking": {"type": "disabled"}}`，禁用思考模式以兼容各种 LLM 提供商；当模型需要不同行为时，用 `llm_extra_body` 输入覆盖，或使用 `llm_reasoning_effort` 在 OpenAI 兼容协议上调节推理深度。

## 自定义

> 这些配置项是 Action 输入——适用于示例工作流以及任何调用 `alibaba/open-code-review@main` 的工作流。

完整输入列表见 [`action.yml`](../../action.yml)。工作流级设置（触发器、关键词）在工作流文件中编辑。

### 更改触发事件

修改工作流文件中的 `on.pull_request_target.types` 数组：

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened, ready_for_review]
```

### 从不携带 Pull Request 的触发器审查

Action 需要一个 PR 编号来获取 head 并发布评论。它按以下顺序解析：

| 来源 | 适用场景 |
|--------|-----------------|
| `pr_number` 输入 | 只要你设置它就适用。覆盖以下所有来源。 |
| `github.event.pull_request.number`，然后 `github.event.issue.number` | `pull_request`、`pull_request_target`、`issue_comment`。 |
| `github.event.workflow_run.pull_requests[0].number` | `workflow_run`，当 GitHub 填充了该数组时。 |

当以上均无法解析时，Action 会在安装 OCR 或消耗任何 LLM 配额之前停止，而不是审查后再发布失败。

`workflow_run` 是"审查 CI 已通过的 head"的触发器，其载荷仅通过该数组指明 PR——GitHub 仅为此仓库中的 head 分支填充该数组，且当多个 PR 共享同一 head 时可能列出多个。需要特定 PR 时请显式传入 `pr_number`：

```yaml
on:
  workflow_run:
    workflows: [Tests]
    types: [completed]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: alibaba/open-code-review@main
        with:
          llm_url: ${{ secrets.OCR_LLM_URL }}
          llm_auth_token: ${{ secrets.OCR_LLM_AUTH_TOKEN }}
          llm_model: ${{ vars.OCR_LLM_MODEL }}
          llm_use_anthropic: ${{ vars.OCR_LLM_USE_ANTHROPIC }}
          pr_number: ${{ github.event.workflow_run.pull_requests[0].number }}
          base_ref: ${{ github.event.workflow_run.pull_requests[0].base.ref }}
          head_sha: ${{ github.event.workflow_run.head_sha }}
```

`pr_number` 是 `base_ref` / `head_sha` 组合的第三个成员：每个都让调用方提供其事件无法提供的信息。

> `workflow_run` 使用具有写权限的令牌运行默认分支的工作流副本，因此请根据上游结论门控作业，并将检出交给 Action：它检出受信任的 base 并仅获取 head 的 blob，与在 `pull_request_target` 下完全一致。

### 自定义评论触发关键词

默认情况下，当 PR 评论以 `/open-code-review` 或 `@open-code-review` 开头时，工作流也会按需重新审查。`if` 条件比裸关键词检查更具防御性——它门控评论触发，确保只有授权人员才能消耗 LLM 配额：

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

每个子句防范不同的滥用途径：

- `github.event.issue.pull_request` — 评论必须在 PR 上，而非普通 issue。
- `github.event.comment.user.type != 'Bot'` — 忽略机器人评论。`GITHUB_TOKEN` 已抑制其发布评论的事件，但 PAT 或 GitHub App 令牌不会，因此这是防止自触发循环的安全网。
- `author_association == 'MEMBER' | 'OWNER' | 'COLLABORATOR'` — 只有仓库协作者才能触发（计费的）重新审查，防止任意评论者耗尽 LLM 配额。
- `startsWith(...)` 对 — 实际触发关键词。

要更改关键词，只需编辑最后一对（例如 `/review` 和 `@mybot`），或将 `startsWith` 换成 `contains` 以匹配评论正文中任意位置的子串。保持前面的防护不变。

同一谓词也镜像在工作流的 `concurrency.group` 中：匹配的事件共享每个 PR 的组（`ocr-<pr_number>`），使新审查取消任何过期的审查；不匹配的评论落入唯一的 `noop-<run_id>` 组并立即跳过，不干扰正在运行的审查。如果在 `if` 中更改关键词，也需在 `concurrency.group` 中同步更改。

### 使用特定 OCR 版本

Action 要求 `ocr_version` 1.9.6 或更高，因为其安全令牌配置使用
`llm.auth_token_cmd`。安装较旧或无法验证的 CLI 时，Action 会提前失败并给出特定于版本的错误。

```yaml
- uses: alibaba/open-code-review@main
  with:
    ocr_version: 1.9.10
```

### 配置审查和 LLM 超时

任务超时和请求超时相互独立：

| 输入 | 默认值 | 描述 |
|-------|---------|-------------|
| `review_task_timeout` | `'15'` | 传递给 `ocr review --timeout` 的每文件/并发任务超时（分钟）；它不是整个审查的墙钟上限。 |
| `llm_timeout` | `'300'` | LLM HTTP 请求超时（秒），独立应用于每个模型请求。 |

```yaml
- uses: alibaba/open-code-review@main
  with:
    review_task_timeout: '30'
    llm_timeout: '900'
```

### 控制审查力度和令牌预算

| 输入 | 默认值 | 描述 |
|-------|---------|-------------|
| `effort` | `''` | 传递给 `ocr review --effort` 的审查力度预设：`low`、`medium` 或 `high`（不区分大小写）。更高力度运行更多审查轮次。空值保留 CLI 默认（配置值或 medium）。 |
| `max_tokens_budget` | `''` | 传递给 `ocr review --max-tokens-budget` 的总令牌上限（输入+输出）。空或 `'0'` 表示无限制。每轮 LLM 前检查：已超限的组获得最后一轮提交发现，不再派发新组，超预算和跳过的文件报告为 failed(budget)，部分结果仍会发布，审查以 0 退出。 |

```yaml
- uses: alibaba/open-code-review@main
  with:
    effort: high
    max_tokens_budget: '10000000'
```

### 设置推理力度

对于推理深度可调的模型（例如 GLM-5.x、OpenAI 推理模型），`llm_reasoning_effort` 输入通过 Action 现有的 `llm.extra_body` 管道合并到请求体作为 `reasoning_effort`——无需超出已发布版本的 CLI 支持。仅限 OpenAI 兼容协议：Anthropic API 拒绝未知请求体字段，因此在该处设置此输入时 Action 会快速失败——请改用显式 `llm_extra_body` 键调节 Anthropic 思考。`llm_extra_body` 中的显式 `reasoning_effort` 键优先于此输入。

| 输入 | 默认值 | 描述 |
|-------|---------|-------------|
| `llm_reasoning_effort` | `''` | `minimal`、`low`、`medium`、`high`、`max` 之一（不区分大小写）。空值不发送任何内容。 |

```yaml
- uses: alibaba/open-code-review@main
  with:
    llm_reasoning_effort: low
```

### 流式输出实时审查进度

默认情况下，审查以面向机器的 `agent` 受众运行，在工作流日志中保持静默直到完成；stderr 捕获到日志文件并作为构建产物上传。设置 `stream_progress: 'true'` 切换到人类受众并将 stderr 分流到工作流日志，使 `[ocr]` 进度行在审查运行时实时流式输出——stderr 仍会捕获到文件用于构建产物和评论发布。

| 输入 | 默认值 | 描述 |
|-------|---------|-------------|
| `stream_progress` | `'false'` | 将实时 `[ocr]` 审查进度流式输出到工作流日志（stderr 上的人类受众），而非静默直到运行完成。`'true'` / `'false'` 之一。 |

```yaml
- uses: alibaba/open-code-review@main
  with:
    stream_progress: 'true'
```

### 添加自定义审查规则

```yaml
- uses: alibaba/open-code-review@main
  with:
    rule: ./my-rules.json
```

> 安全：当 secrets 在作用域内时，不要将 `rule` 指向来自 PR 分支的文件；请使用 base 分支中的受信任规则文件。

### 控制评论发布（置顶摘要和增量）

Action 发布摘要 issue 评论和行内审查评论。两个输入选择发布模式（组合起来即上述四种模式）；第三个调整增量重叠测试：

| 输入 | 默认值 | 描述 |
|-------|---------|-------------|
| `sticky_summary` | `'true'` | 原地更新现有摘要评论，而非每次运行发布新评论。 |
| `incremental` | `'false'` | 仅追加 `(path, line range)` 不与现有机器人审查评论重叠的行内评论。历史永不删除（非破坏性）。 |
| `incremental_overlap_threshold` | `'0.6'` | `incremental` 用于判断多行评论是否与现有评论重叠的 IoU 阈值。两个单行评论在同一行匹配；单行与多行永不匹配。仅在 `incremental` 启用时读取——`resolve_outdated` 将任何共享行视为重叠，无阈值，因为此处漏判重叠会关闭一个发现仍存在的线程。 |
| `resolve_outdated` | `'false'` | 解决 Action 自身的过期行内线程。`'false'` 不执行任何操作；`'report'` 记录将解决的内容；`'true'` 解决它们。见下文。 |

```yaml
- uses: alibaba/open-code-review@main
  with:
    sticky_summary: 'true'
    incremental: 'true'
    incremental_overlap_threshold: '0.75'
```

> `sticky_summary` 和 `incremental` 必须是带引号的字符串（`'true'`/`'false'`）；Action 按字符串比较，因此未加引号的 YAML 布尔值不会匹配。

### 仅审查上次运行以来的变更（检查点）

`incremental` 过滤运行产生的评论；它仍然每次审查