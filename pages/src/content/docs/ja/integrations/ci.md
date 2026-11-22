---
title: CI/CD
sidebar:
  order: 4
---

在每个 Pull Request 或 Merge Request 上运行 OCR。上游仓库提供了两个开箱即用的流水线，复制并配置即可使用——一个用于 GitHub Actions，一个用于 GitLab CI。两者都是 [CLI 参考](../cli-reference/#json)中所述核心命令的薄封装。

## CI/CD 集成的工作原理

本页的每个配方都遵循同一模式——下面的 GitHub Actions 和 GitLab CI 章节只是其具体实现。

1. **由 PR / MR 事件触发。** 新建的 pull request、更新的 merge request，或手动的 `/open-code-review` 评论会触发任务。
2. **在 runner 上安装 `ocr`**，通常是 `npm install -g @alibaba-group/open-code-review`。runner 是临时的，因此每次运行都会执行此操作。
3. **通过 `ocr config set` 从 CI secret 配置 LLM**（端点、token、模型）。没有可回退的持久化 `~/.opencodereview`。
4. **以区间模式运行审查**，获取机器可读输出，使 stdout 成为干净的 JSON 外壳。

   ```bash
   ocr review \
     --from "origin/<base-branch>" \
     --to "origin/<head-branch>" \
     --format json \
     --audience agent
   ```

   `--format json` 提供可解析的载荷，`--audience agent` 抑制进度行。各配方消费的外壳结构参见 [JSON 输出](../cli-reference/#json)。
5. **解析 JSON**，遍历 `comments[]`。
6. **通过提供商的 review API 将评论贴回 PR / MR。** 没有有效行信息的条目（文件级发现）不会内联粘贴，而是汇总到摘要注释中。如果内联批量 API 拒绝请求，粘贴步骤也会回退为普通摘要评论。

始终涉及两种凭据：OCR 用于生成发现的 **LLM 凭据**，以及粘贴步骤用于贴回评论的 **PR/MR 写入 token**。GitHub 配方通过 `GITHUB_TOKEN` 自动提供后者。GitLab 建议显式设置 `GITLAB_API_TOKEN`，但对 fork MR 会回退到内置的 `CI_JOB_TOKEN`（它可以通过 `/discussions` 发起讨论）——为保证可靠性，建议使用专用 token。

## GitHub Actions

上游工作流位于 [`examples/github_actions/ocr-review.yml`](https://github.com/alibaba/open-code-review/blob/main/examples/github_actions/ocr-review.yml)。

### 功能说明

- 由 `pull_request_target`（`opened`）**和** `issue_comment` 事件（正文以 `/open-code-review` 或 `@open-code-review` 开头）触发。后者允许审查者通过在 PR 上评论按需重新运行 OCR。（使用 `pull_request_target` 而非 `pull_request`，使来自 fork 的 PR 也能使用 secret。OCR 只读取 diff，不执行 PR 中的代码。）
- 通过 `npm install -g @alibaba-group/open-code-review` 安装 OCR，用 `ocr config set` 写入配置，并以分支区间模式运行核心命令。
- 解析 JSON 外壳，通过 GitHub Pull Request Review API 将每个发现作为内联审查评论粘贴。没有行信息的评论汇总到摘要正文中。批量提交失败时回退为逐条粘贴，并在摘要评论中显示统计信息。

### 安装

将工作流放入仓库：

```bash
mkdir -p .github/workflows
curl -o .github/workflows/ocr-review.yml \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/examples/github_actions/ocr-review.yml
```

### 必需的 secret

在 **Settings → Secrets and variables → Actions** 中设置。

| Secret | 必需 | 说明 |
|---|---|---|
| `OCR_LLM_URL` | 是 | LLM API 端点（例如 `https://api.openai.com/v1/chat/completions`）。 |
| `OCR_LLM_AUTH_TOKEN` | 是 | LLM API 的认证 token。此 CI secret 会传给 `ocr config set llm.auth_token`。（OCR 直接的环境变量是 `OCR_LLM_TOKEN`，而非 `OCR_LLM_AUTH_TOKEN`。） |
| `OCR_LLM_MODEL` | 否 | 模型名。无默认值——必须显式设置。 |
| `OCR_LLM_USE_ANTHROPIC` | 否 | 使用 Anthropic Claude 模型时设为 `true`。 |

`GITHUB_TOKEN` 会自动提供。工作流声明了 `pull-requests: write` 以粘贴审查评论。

> 工作流启动时还会执行
> `ocr config set llm.extra_body '{"thinking": {"type": "disabled"}}'`，
> 为不支持该字段的 LLM 提供商关闭 thinking-mode 请求。如果提供商需要保留 thinking-mode，请删除该行。

### Action 输入

上游工作流通过 `uses: alibaba/open-code-review@main` 将审查委托给可复用的复合 Action（[`action.yml`](https://github.com/alibaba/open-code-review/blob/main/action.yml)）。除上述凭据外，以下输入可调整审查本身——在 Action 步骤的 `with:` 中指定。

| 输入 | 默认值 | 说明 |
|---|---|---|
| `effort` | `''` | 传给 `ocr review --effort` 的审查强度预设：`low`、`medium`、`high`（不区分大小写）。为空时使用 CLI 默认值（已配置的值，否则为 medium）。需要 OCR v1.10.0 及以上，更早版本中 Action 会以明确错误提前失败。 |
| `max_tokens_budget` | `''` | 传给 `ocr review --max-tokens-budget` 的 token 总量（输入 + 输出）上限。为空或 `'0'` 表示无限制。在每轮 LLM 调用前检查：已超限的子任务会获得一次最终轮次以提交发现，后续子任务不再分发，超预算和被跳过的文件报告为 `failed(budget)`。若仅因预算导致部分条目未能审查，退出码为 0。若发生超时或提供商错误等运行时错误，或所有条目均失败（包括全部因预算不足），退出码非零。CLI 会输出已获得的结果。非零退出时，Action 根据配置将输出作为构建产物上传，但跳过 PR 评论发布。 |
| `llm_reasoning_effort` | `''` | 可调整 `reasoning_effort` 请求字段的模型（GLM-5.x、OpenAI reasoning 模型等）的推理深度：`minimal`、`low`、`medium`、`high`、`max`（不区分大小写）。通过 `llm_extra_body` 合并到请求体，因此适用于所有已发布的 CLI 版本。`llm_extra_body` 中显式的 `reasoning_effort` 键优先于此输入。为空（默认）时不发送。仅适用于 OpenAI 兼容协议——Anthropic API 会拒绝未知的请求体字段，因此在该协议下 Action 会立即失败。Anthropic 的 thinking 控制请使用 `llm_extra_body` 的显式键。 |
| `stream_progress` | `'false'` | 设为 `'true'` 时，将 `[ocr]` 进度行实时输出到工作流日志（stderr 的 human audience），而非在审查结束前保持静默。仅切换显示，stderr 仍会捕获到文件，用于构建产物和评论发布。 |

```yaml
- uses: alibaba/open-code-review@main
  with:
    llm_url: ${{ secrets.OCR_LLM_URL }}
    llm_auth_token: ${{ secrets.OCR_LLM_AUTH_TOKEN }}
    llm_model: ${{ vars.OCR_LLM_MODEL }}
    llm_use_anthropic: ${{ vars.OCR_LLM_USE_ANTHROPIC }}
    effort: high
    max_tokens_budget: '10000000'
    llm_reasoning_effort: low
    stream_progress: 'true'
```

完整输入列表参见 [`action.yml`](https://github.com/alibaba/open-code-review/blob/main/action.yml)——包括发布模式（`sticky_summary`、`incremental`）、严重度/分类路由、跨推送检查点等。

### 自定义

以下均为对你刚复制的的工作流文件（`.github/workflows/ocr-review.yml`）的编辑。

#### 背景上下文

`--background` 是效果最大的单个参数——参见[适用于所有模式的提示](../#tips-that-apply-to-every-pattern)。传入 PR 标题（若标题遵循 `feat(auth): add OAuth2 support` 这类语义化约定，效果更好）。

```yaml
- name: Run OCR review
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
    BASE_REF: ${{ github.base_ref }}
    HEAD_REF: ${{ github.head_ref }}
  run: |
    ocr review \
      --background "$PR_TITLE" \
      --from "origin/$BASE_REF" \
      --to "origin/$HEAD_REF" \
      --format json --audience agent
```

PR 可控的值请通过 `env:` 传递，不要将 `${{ }}` 直接展开到 `run:` 中。GitHub 会在 shell 解析行*之前*将 `${{ }}` 作为文本替换，导致含 shell 元字符的 PR 标题或分支名在 runner 上被执行。

#### 自定义规则

通过 `--rule` 传入项目特定的规则文件。

```yaml
- name: Run OCR review
  env:
    BASE_REF: ${{ github.base_ref }}
    HEAD_REF: ${{ github.head_ref }}
  run: |
    ocr review --rule ./my-rules.json \
      --from "origin/$BASE_REF" \
      --to "origin/$HEAD_REF"
```

Schema 参见[审查规则](../../review-rules/)。

#### 并发数

默认为 8 个并行子 agent，每个子任务一个。大型 PR 中请调低，以免触发 LLM 提供商的速率限制。

```yaml
- name: Run OCR review
  env:
    BASE_REF: ${{ github.base_ref }}
    HEAD_REF: ${{ github.head_ref }}
  run: |
    ocr review --concurrency 5 \
      --from "origin/$BASE_REF" \
      --to "origin/$HEAD_REF"
```

#### 触发模式

默认工作流在 PR 被 **opened** 时，以及 PR 评论以 `/open-code-review` 或 `@open-code-review` 开头时触发。常见调整有两种。

在更多 PR 生命周期事件中运行（例如新 commit 推送时重新审查）：

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
```

使用不同的评论关键词：

```yaml
if: |
  github.event_name == 'pull_request' ||
  (github.event_name == 'issue_comment'
    && github.event.issue.pull_request
    && startsWith(github.event.comment.body, '/review'))
```

`github.event.issue.pull_request` 检查确保评论来自 PR 而非普通 issue。

#### 固定 OCR 版本

默认工作流安装最新发布版本。固定版本：

```yaml
- name: Install OpenCodeReview
  run: npm install -g @alibaba-group/open-code-review@1.0.0
```

#### 以 GitHub App 身份发布

默认情况下审查评论由 `github-actions[bot]` 发布。要以 `OpenCodeReview Bot` 这类自定义品牌 bot 发布，请将 `GITHUB_TOKEN` 替换为 GitHub App 的 installation token。

1. 在 *Settings → Developer settings → GitHub Apps → New GitHub App* **创建 app**。禁用 webhook（此场景不需要）。在 *Repository permissions* 中授予：
   - **Pull requests**：Read and write
   - **Contents**：Read-only（用于获取 diff）
   - **Metadata**：Read-only（必需）

2. 从 app 设置页面**生成私钥**，下载 `.pem` 文件。记下同一页面的 **App ID**。

3. 将 app **安装**到希望 OCR 审查的仓库。Installation ID 出现在安装后的 URL 中。例如：`https://github.com/settings/installations/12345` → ID 为 `12345`。

4. 在 *Settings → Secrets and variables → Actions* 中**添加 3 个 secret**。

   | Secret | 值 |
   |---|---|
   | `GITHUB_APP_ID` | App ID。 |
   | `GITHUB_APP_PRIVATE_KEY` | `.pem` 文件的全部内容，包括 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----` 行。 |
   | `GITHUB_APP_INSTALLATION_ID` | Installation ID。 |

5. 在评论粘贴步骤中**生成并使用 token**。

   ```yaml
   - name: Get GitHub App Token
     id: app-token
     uses: actions/create-github-app-token@v1
     with:
       app-id: ${{ secrets.GITHUB_APP_ID }}
       private-key: ${{ secrets.GITHUB_APP_PRIVATE_KEY }}

   - name: Post review comments to PR
     uses: actions/github-script@v7
     with:
       github-token: ${{ steps.app-token.outputs.token }}
       script: |
         # ...existing post script...
   ```

审查将以你的 app 名称发布，而非 `github-actions[bot]`。

#### 上传发现到 GitHub Code Scanning（SARIF）

`--format sarif` 将 [SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) 报告写入 stdout。重定向到文件，并用 CodeQL 的 `upload-sarif` Action 上传，发现将显示在 **Security → Code scanning** 中：

```yaml
- name: Run OCR review
  env:
    BASE_REF: ${{ github.base_ref }}
    HEAD_REF: ${{ github.head_ref }}
  run: |
    ocr review \
      --from "origin/$BASE_REF" \
      --to "origin/$HEAD_REF" \
      --format sarif --audience agent > results.sarif

- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

SARIF 是机器可读格式，因此 OCR 会抑制 stdout 上的进度行，`results.sarif` 只包含报告。`--preview` 不支持 `--format sarif`。要生成报告，请运行完整 review（或 `ocr scan`）。

### 故障排查

| 症状 | 原因 / 修复 |
|---|---|
| `Cannot find merge-base` | checkout 步骤使用了浅克隆，但区间模式审查需要完整历史。上游工作流为 `actions/checkout` 设置了 `fetch-depth: 0`——编辑文件时请保留此设置。 |
| `Failed to parse OCR output` | `OCR_LLM_URL` 或 `OCR_LLM_AUTH_TOKEN` 缺失或错误。请在 *Settings → Secrets and variables → Actions* 中重新检查值。 |
| 审查评论附着到错误的行 | 通常意味着审查开始到评论粘贴之间 diff 发生了偏移。粘贴脚本此时会回退为普通 issue 评论——无需处理。 |

> **注意。** `OCR_DEBUG` 环境变量目前在 OCR 中**未实现**——设置 `OCR_DEBUG: "1"` 没有效果。此处记录以备将来支持。当前如需详细输出，请查看工作流写入 `/tmp/ocr-result.json` 和 `/tmp/ocr-stderr.log` 的原始审查 JSON 与 stderr（参见下方故障排查），或在本地运行 `ocr review`。

## GitLab CI

上游流水线位于 [`examples/gitlab_ci/.gitlab-ci.yml`](https://github.com/alibaba/open-code-review/blob/main/examples/gitlab_ci/.gitlab-ci.yml)。

### 功能说明

- 由 `merge_requests` 事件（创建、更新、重新打开等所有 MR 事件）触发。
- 在 `node:20` 镜像中运行，安装 OCR，用 `ocr config set` 配置，并以 MR diff 模式运行核心命令。
- 通过内联 Python 脚本解析 JSON 外壳，将每个发现作为 GitLab Discussion（在 diff 上内联）发布。使用 MR 的 `versions` 端点计算正确的 `base_sha` / `start_sha` / `head_sha` 以精确定位。无法内联发布的评论回退为普通 MR note，最后以摘要 note 收尾。

### 安装

将流水线放入仓库根目录：

```bash
curl -o .gitlab-ci.yml \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/examples/gitlab_ci/.gitlab-ci.yml
```

如果已有 `.gitlab-ci.yml` 并希望保留，可将配方放到其他路径并通过 `include:` 引入。

```yaml
include:
  - local: 'ci/ocr-review.gitlab-ci.yml'
```

### 必需的 CI/CD 变量

在 **Settings → CI/CD → Variables** 中设置。

| 变量 | 必需 | 掩码 | 说明 |
|---|---|---|---|
| `OCR_LLM_URL` | 是 | 否 | LLM API 端点 URL。 |
| `OCR_LLM_AUTH_TOKEN` | 是 | 是 | API 认证 token。此 CI 变量会传给 `ocr config set llm.auth_token`。（OCR 直接的环境变量是 `OCR_LLM_TOKEN`，而非 `OCR_LLM_AUTH_TOKEN`。） |
| `OCR_LLM_MODEL` | 否 | 否 | 模型名。无默认值——必须显式设置。 |
| `GITLAB_API_TOKEN` | 否 | 是 | 具有 `api` scope 的 project / personal / group access token。可选——缺失时回退到内置的 `CI_JOB_TOKEN`（如 fork MR）。为保证可靠性，建议使用专用 `GITLAB_API_TOKEN`。 |

> GitLab 拒绝少于