---
title: CI/CD
sidebar:
  order: 4
---

为每个 Pull Request 或合并请求运行 OCR。主仓库提供两个现成的流水线，复制并配置即可：一个用于 GitHub Actions，另一个用于 GitLab CI。两者都是对 [CLI 参考](../cli-reference/#json) 中所述主命令的轻量封装。

## CI/CD 集成的工作原理

本页所有方案遵循同一模式；下文 GitHub Actions 和 GitLab CI 两节是其具体实现：

1. **由 PR / MR 事件触发。** 新建 pull request、更新 merge request 或手动评论 `/open-code-review` 都会触发任务。
2. **在 runner 上安装 `ocr`**，通常使用命令 `npm install -g @alibaba-group/open-code-review`。Runner 是临时的，因此每次运行都要执行。
3. **通过 `ocr config set` 从 CI 密钥配置 LLM**（端点、令牌、模型）。不存在可作为后备来源的已保存 `~/.opencodereview`。
4. **以范围模式运行审查**，输出机器可读结果，使 stdout 只包含纯 JSON 对象：

   ```bash
   ocr review \
     --from "origin/<base-branch>" \
     --to "origin/<head-branch>" \
     --format json \
     --audience agent
   ```

   `--format json` 提供可解析的数据，`--audience agent` 抑制进度行。所有方案使用的对象格式见 [JSON 输出](../cli-reference/#json)。
5. **解析 JSON** 并遍历 `comments[]`。
6. **通过提供商的审查 API 将评论发布回 PR / MR**。没有有效行信息的条目（文件级备注）会并入汇总说明，而不是内联评论。如果批量发布 API 拒绝请求，发布阶段也会回退到普通汇总评论。

始终使用两种凭据：**LLM 凭据**，OCR 用它生成备注；以及 **PR/MR 写入令牌**，发布阶段用它发送评论。在 GitHub 方案中，第二个令牌由 `GITHUB_TOKEN` 免费提供。对于 GitLab，建议显式设置 `GITLAB_API_TOKEN`，但对于来自 Fork 的 MR，会回退使用内置的 `CI_JOB_TOKEN`（它可以通过 `/discussions` 发布讨论）。为可靠起见，建议使用单独的令牌。

## GitHub Actions

原始 workflow 位于 [`examples/github_actions/ocr-review.yml`](https://github.com/alibaba/open-code-review/blob/main/examples/github_actions/ocr-review.yml)。

### 它做什么

- 由 `pull_request_target`（`opened`）**以及** `issue_comment` 事件触发，后者的正文以 `/open-code-review` 或 `@open-code-review` 开头。第二种方式允许审查者在 PR 中留言按需重新运行 OCR。（使用 `pull_request_target` 而非 `pull_request`，是为了让来自 Fork 的 PR 也能访问密钥；OCR 只读取 diff，不执行 PR 中的代码。）
- 通过 `npm install -g @alibaba-group/open-code-review` 安装 OCR，使用 `ocr config set` 写入配置，然后以分支范围模式运行主命令。
- 解析 JSON 对象，并通过 GitHub Pull Request Review API 将每条备注发布为内联审查评论。没有行信息的评论会并入汇总文本。批量发布失败时，workflow 会逐条发布评论，并在汇总评论中输出统计信息。

### 安装

将 workflow 放入你的仓库：

```bash
mkdir -p .github/workflows
curl -o .github/workflows/ocr-review.yml \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/examples/github_actions/ocr-review.yml
```

### 必需的密钥

在 **Settings → Secrets and variables → Actions** 中设置：

| 密钥 | 必需 | 描述 |
|---|---|---|
| `OCR_LLM_URL` | 是 | LLM API 端点（例如 `https://api.openai.com/v1/chat/completions`）。 |
| `OCR_LLM_AUTH_TOKEN` | 是 | LLM API 认证令牌。此 CI 密钥会传给 `ocr config set llm.auth_token`。（OCR 的直接环境变量名为 `OCR_LLM_TOKEN`，而非 `OCR_LLM_AUTH_TOKEN`。） |
| `OCR_LLM_MODEL` | 否 | 模型名称。没有默认值，必须显式设置。 |
| `OCR_LLM_USE_ANTHROPIC` | 否 | 对于 Anthropic Claude 模型，设为 `true`。 |

`GITHUB_TOKEN` 自动提供；workflow 声明 `pull-requests: write` 权限以发布审查评论。

> Workflow 启动时还会执行 `ocr config set llm.extra_body '{"thinking": {"type": "disabled"}}'`，禁用思考模式请求，以兼容不支持该字段的 LLM 提供商。如果你的提供商需要启用思考模式，请删除该行。

### Action 参数

原始 workflow 通过 `uses: alibaba/open-code-review@main` 将审查委托给可复用的复合 action（[`action.yml`](https://github.com/alibaba/open-code-review/blob/main/action.yml)）。除上述凭据外，以下输入参数用于配置审查本身——在 action 步骤的 `with:` 中传入：

| 参数 | 默认值 | 描述 |
|---|---|---|
| `effort` | `''` | 审查强度预设，传给 `ocr review --effort`：`low`、`medium` 或 `high`（不区分大小写）。空值保留 CLI 默认值（已配置值或 medium）。需要 OCR v1.10.0 或更新版本——在更旧版本上 action 会提前退出并给出明确错误。 |
| `max_tokens_budget` | `''` | 总令牌限制（输入 + 输出），传给 `ocr review --max-tokens-budget`。空值或 `'0'` 表示"无限制"。每轮 LLM 前检查：已超限的子任务获得最后一轮以发送发现，不再启动新子任务，超出预算的文件和跳过的文件标记为 `failed(budget)`。如果部分条目已检查且唯一停止原因是令牌限制，退出码为 0。执行错误（如超时或提供商错误）时退出码非零。所有选中条目失败时同样如此，即使原因仅为限制。CLI 会输出已获得的结果。退出码非零时，Action 可将输出作为构建产物上传，但会跳过向 PR 发布评论。 |
| `llm_reasoning_effort` | `''` | 对支持 `reasoning_effort` 请求字段的模型（如 GLM-5.x、OpenAI 推理模型）设置推理深度：`minimal`、`low`、`medium`、`high`、`max`（不区分大小写）。该值通过 `llm_extra_body` 注入请求体，因此适用于所有已发布版本的 CLI；`llm_extra_body` 中显式的 `reasoning_effort` 键优先于此参数。空值（默认）不发送任何内容。仅适用于 OpenAI 兼容协议——Anthropic API 拒绝未知请求体字段，因此在 Anthropic 协议上 action 会立即退出；请通过 `llm_extra_body` 中的显式键控制 Anthropic 的思考模式。 |
| `stream_progress` | `'false'` | 设为 `'true'` 时，将实时 `[ocr]` 进度行（human audience，stderr）流式输出到 workflow 日志，而不是静默直到运行结束。仅影响显示：stderr 仍会写入文件，用于构建产物和评论发布。 |

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

完整参数列表见 [`action.yml`](https://github.com/alibaba/open-code-review/blob/main/action.yml)——包括发布模式（`sticky_summary`、`incremental`）、按重要性/类别路由以及推送间检查点。

### 配置

以下所有修改都在刚复制的 workflow 文件（`.github/workflows/ocr-review.yml`）中进行。

#### 背景上下文

`--background` 是对结果影响最大的单个标志；参见[适用于所有模式的建议](../#tips-that-apply-to-every-pattern)。传入 PR 标题（如果标题遵循 `feat(auth): add OAuth2 support` 之类的语义约定，效果尤其好）：

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

通过 `env:` 传递由 PR 控制的值，不要将 `${{ }}` 直接插入 `run:`。GitHub 在 shell 解析行*之前*进行文本替换，因此包含 shell 元字符的 PR 标题或分支名可能导致在 runner 上执行命令。

#### 自定义规则

使用 `--rule` 传入项目规则文件：

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

Schema 见[审查规则](../../review-rules/)。

#### 并发

默认并行运行 8 个子代理——每个子任务一个。对于大型 PR，减小此数值以避免超出 LLM 提供商的速率限制：

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

标准 workflow 在 PR **打开**时以及 PR 中以 `/open-code-review` 或 `@open-code-review` 开头的评论时触发。两种常见的修改方式：

在更多 PR 生命周期事件上触发（例如推送新提交后重新审查）：

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
```

使用不同的评论关键字：

```yaml
if: |
  github.event_name == 'pull_request' ||
  (github.event_name == 'issue_comment'
    && github.event.issue.pull_request
    && startsWith(github.event.comment.body, '/review'))
```

`github.event.issue.pull_request` 检查确保评论是在 PR 中留下的，而非普通 Issue。

#### 固定 OCR 版本

标准 workflow 安装最新发布版本。要固定特定版本：

```yaml
- name: Install OpenCodeReview
  run: npm install -g @alibaba-group/open-code-review@1.0.0
```

#### 以 GitHub App 身份发布

默认情况下，审查评论由 `github-actions[bot]` 发送。要以 `OpenCodeReview Bot` 之类的品牌机器人身份发布，请用 GitHub App 安装令牌替换 `GITHUB_TOKEN`。

1. **创建应用**：*Settings → Developer settings → GitHub Apps → New GitHub App*。禁用 webhook：此场景不需要。在 *Repository permissions* 中授予：
   - **Pull requests**：Read and write；
   - **Contents**：Read-only（用于获取 diff）；
   - **Metadata**：Read-only（必需）。

2. **创建私钥**：在应用设置页面创建并下载 `.pem` 文件。记下同一页面上的 **App ID**。

3. **安装应用**：安装到 OCR 需要检查的仓库。安装后 URL 中包含 Installation ID，例如 `https://github.com/settings/installations/12345` → ID 为 `12345`。

4. **添加三个密钥**：在 *Settings → Secrets and variables → Actions* 中：

   | 密钥 | 值 |
   |---|---|
   | `GITHUB_APP_ID` | App ID。 |
   | `GITHUB_APP_PRIVATE_KEY` | `.pem` 文件的完整内容，包括 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----` 行。 |
   | `GITHUB_APP_INSTALLATION_ID` | Installation ID。 |

5. **创建令牌并使用**：在评论发布阶段：

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

现在审查将以应用身份发布，而非 `github-actions[bot]`。

#### 将发现上传到 GitHub Code Scanning（SARIF）

`--format sarif` 将 [SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) 报告写入 stdout。将其重定向到文件，并使用 CodeQL 的 `upload-sarif` action 上传，使发现出现在 **Security → Code scanning** 中：

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

SARIF 是机器可读格式，因此 OCR 会抑制 stdout 中的进度行，`results.sarif` 中只包含报告。`--preview` 不支持 `--format sarif`——要获取报告，请运行完整 review（或 `ocr scan`）。

### 故障排查

| 症状 | 原因 / 修复 |
|---|---|
| `Cannot find merge-base` | checkout 阶段使用了浅克隆，但范围审查需要完整历史。原始 workflow 为 `actions/checkout` 设置了 `fetch-depth: 0`；编辑文件时请保留此设置。 |
| `Failed to parse OCR output` | `OCR_LLM_URL` 或 `OCR_LLM_AUTH_TOKEN` 缺失或设置错误。在 *Settings → Secrets and variables → Actions* 中重新检查值。 |
| 审查评论出现在错误的行上 | 通常意味着审查开始与评论发布之间 diff 发生了变化。此时发布脚本会回退到普通 Issue 评论，无需额外操作。 |

> **注意。** 环境变量 `OCR_DEBUG` 在 OCR 中**尚未实现**，因此 `OCR_DEBUG: "1"` 不起作用。此处描述它以防将来实现。要现在获取详细输出，请查看 workflow 写入 `/tmp/ocr-result.json` 和 `/tmp/ocr-stderr.log` 的原始审查 JSON 和 stderr（见下文故障排查），或在本地运行 `ocr review`。

## GitLab CI

原始流水线位于 [`examples/gitlab_ci/.gitlab-ci.yml`](https://github.com/alibaba/open-code-review/blob/main/examples/gitlab_ci/.gitlab-ci.yml)。

### 它做什么

- 由 `merge_requests` 事件触发（所有 MR 事件：创建、更新、重新打开）。
- 在 `node:20` 镜像中运行，安装 OCR，使用 `ocr config set` 配置，然后以 MR diff 模式运行主命令。
- 使用内置 Python 脚本解析 JSON 对象，并通过 MR 的 `versions` 端点计算正确的 `base_sha` / `start_sha` / `head_sha` 和精确定位，将每条备注发布为 GitLab Discussion（内联到 diff）。无法在 diff 内发布的评论回退为普通 MR 备注，最后发布汇总备注。

### 安装

将流水线放入仓库根目录：

```bash
curl -o .gitlab-ci.yml \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/examples/gitlab_ci/.gitlab-ci.yml
```

如果你已有 `.gitlab-ci.yml` 并希望保留，请将方案放到其他路径并通过 `include:` 引入：

```yaml
include:
  - local: 'ci/ocr-review.gitlab-ci.yml'
```

### 必需的 CI/CD 变量

在 **Settings → CI/CD → Variables** 中设置：

| 变量 | 必需 | 掩码 | 描述 |
|---|---|---|---|
| `OCR_LLM_URL` | 是 | 否 | LLM API 端点 URL。 |
| `OCR_LLM_AUTH_TOKEN` | 是 | 是 | API 认证令牌。此 CI 变量会传给 `ocr config set llm.auth_token`。（OCR 的直接环境变量名为 `OCR_LLM_TOKEN`，而非 `OCR_LLM_AUTH_TOKEN`。） |
| `OCR_LLM_MODEL` | 否 | 否 | 模型名称。没有默认值，必须显式设置。 |
| `GITLAB_API_TOKEN` | 否 | 是 | 具有 `api` 范围的项目 / 用户 / 组访问令牌。可选：如果缺失，会回退使用内置的 `CI_JOB_TOKEN`（例如用于来自 Fork 的 MR）。为可靠起见，建议使用单独的 `GITLAB_API_TOKEN`。 |

> GitLab 拒绝短于 8 个字符的变量，