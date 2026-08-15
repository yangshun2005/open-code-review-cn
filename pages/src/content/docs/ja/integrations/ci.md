---
title: CI/CD
sidebar:
  order: 4
---

在每个 Pull Request 或 Merge Request 上运行 OCR。上游仓库提供了两个开箱即用的流水线，只需复制并配置即可使用——一个是 GitHub Actions，另一个是 GitLab CI。两者都是
[CLI 参考](../cli-reference/#json) 中所述核心命令的轻量封装。

## CI/CD 集成的工作原理

本页中的每个配方都遵循相同的模式——以下 GitHub Actions 和 GitLab CI 部分只是其具体实现。

1. **由 PR / MR 事件触发。** 新的 pull request、更新的 merge request 或手动的
   `/open-code-review` 评论会触发任务。
2. **在 runner 上安装 `ocr`**。通常是
   `npm install -g @alibaba-group/open-code-review`。由于 runner 是临时的，因此每次执行都会发生此操作。
3. **通过 CI secret 使用 `ocr config set` 配置 LLM**（端点、token、模型）。没有可回退的持久化 `~/.opencodereview`。
4. **以区间模式运行审查**，获取机器可读的输出，使 stdout 成为干净的 JSON 外壳。

   ```bash
   ocr review \
     --from "origin/<base-branch>" \
     --to "origin/<head-branch>" \
     --format json \
     --audience agent
   ```

   `--format json` 提供可解析的载荷，`--audience agent` 抑制进度行。每个配方消费的外壳结构请参阅 [JSON 输出](../cli-reference/#json)。
5. **解析 JSON**，并遍历 `comments[]`。
6. **通过提供商的 review API 将评论贴回 PR / MR。** 没有有效行信息的条目（文件级别的发现）不会以内联方式张贴，而是汇总到摘要注释中。如果内联批量 API 拒绝请求，张贴步骤也会回退到常规摘要评论。

始终涉及两种类型的凭据。OCR 用于生成发现结果的 **LLM 凭据**，以及张贴步骤用于贴回评论的 **PR/MR 写入 token**。GitHub 的配方通过 `GITHUB_TOKEN` 自动提供后者。在 GitLab 中，建议显式设置 `GITLAB_API_TOKEN`，但会回退到内置的 `CI_JOB_TOKEN`（它可以通过 `/discussions` 发起讨论）——为了可靠性，建议使用专用 token。

## GitHub Actions

上游工作流位于
[`examples/github_actions/ocr-review.yml`](https://github.com/alibaba/open-code-review/blob/main/examples/github_actions/ocr-review.yml)。

### 功能说明

- 由 `pull_request_target`（`opened`）**以及** `issue_comment` 事件（正文以
  `/open-code-review` 或 `@open-code-review` 开头）触发。后者允许审查者通过评论 PR 来按需重新运行 OCR。（使用 `pull_request_target` 而非 `pull_request`，使得从 fork 提交的 PR 也能使用 secrets。OCR 只读取 diff，不会执行 PR 中的代码。）
- 通过 `npm install -g @alibaba-group/open-code-review` 安装 OCR，使用 `ocr config set` 写入配置，并以分支区间模式运行核心命令。
- 解析 JSON 外壳，并通过 GitHub Pull Request Review API 将每个发现作为内联审查评论张贴。没有行信息的评论会汇总到摘要正文中。如果批量发送失败，则回退到逐条张贴，并在摘要评论中显示统计信息。

### 安装

将工作流放置到你的仓库中。

```bash
mkdir -p .github/workflows
curl -o .github/workflows/ocr-review.yml \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/examples/github_actions/ocr-review.yml
```

### 必需的 secrets

在 **Settings → Secrets and variables → Actions** 中设置。

| Secret | 必需 | 说明 |
|---|---|---|
| `OCR_LLM_URL` | 是 | LLM API 端点（例如：`https://api.openai.com/v1/chat/completions`）。 |
| `OCR_LLM_AUTH_TOKEN` | 是 | LLM API 的认证 token。此 CI secret 会传递给 `ocr config set llm.auth_token`。（OCR 直接使用的环境变量是 `OCR_LLM_TOKEN`，而非 `OCR_LLM_AUTH_TOKEN`。） |
| `OCR_LLM_MODEL` | 否 | 模型名称。没有默认值——必须显式设置。 |
| `OCR_LLM_USE_ANTHROPIC` | 否 | 对于 Anthropic Claude 模型，设置为 `true`。 |

`GITHUB_TOKEN` 会自动提供。工作流声明了 `pull-requests: write` 权限以张贴审查评论。

> 工作流启动时也会执行
> `ocr config set llm.extra_body '{"thinking": {"type": "disabled"}}'`
> 以关闭不支持此字段的 LLM 提供商的 thinking-mode 请求。如果你的提供商需要保留 thinking-mode，请删除该行。

### 自定义

以下所有内容都是对你刚复制的工作流文件
（`.github/workflows/ocr-review.yml`）的编辑。

#### 背景上下文

`--background` 是效果最显著的单个参数——请参阅 [适用于所有模式的提示](../#tips-that-apply-to-every-pattern)。传入 PR 标题（如果标题遵循 `feat(auth): add OAuth2 support` 之类的语义化约定，效果会更好）。

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

PR 可控的值应通过 `env:` 传递，而不是将 `${{ }}` 直接展开到 `run:` 中。GitHub 会在 shell 解析行 *之前* 将 `${{ }}` 作为文本替换，因此包含 shell 元字符的 PR 标题或分支名可能会在 runner 上被执行。

#### 自定义规则

使用 `--rule` 传递项目特定的规则文件。

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

架构请参阅 [审查规则](../../review-rules/)。

#### 并发数

默认每个文件有 8 个并发子 agent。对于大型 PR，请调低以避免触及 LLM 提供商的速率限制。

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

默认工作流在 PR **opened** 时，以及以 `/open-code-review` 或
`@open-code-review` 开头的 PR 评论时触发。常见的两种调整如下。

在更多 PR 生命周期事件上运行（例如：新 commit 推送时重新审查）：

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

`github.event.issue.pull_request` 的检查确保评论是针对 PR 而非普通 issue。

#### 固定 OCR 版本

默认工作流安装最新发布版本。要固定版本：

```yaml
- name: Install OpenCodeReview
  run: npm install -g @alibaba-group/open-code-review@1.0.0
```

#### 以 GitHub App 身份发布

默认情况下，审查评论由 `github-actions[bot]` 发布。要以 `OpenCodeReview Bot` 之类的自定义品牌 bot 身份发布，请将 `GITHUB_TOKEN` 替换为 GitHub App 的 installation token。

1. 在 *Settings → Developer settings → GitHub Apps → New GitHub App* **创建 app**。禁用 webhook（此用例不需要）。在 *Repository permissions* 中授予：
   - **Pull requests**：Read and write
   - **Contents**：Read-only（用于获取 diff）
   - **Metadata**：Read-only（必需）

2. 在 app 设置页面**生成私钥**，并下载 `.pem` 文件。记下同一页面上的 **App ID**。

3. 将 app **安装**到希望 OCR 审查的仓库。Installation ID 会出现在安装后的 URL 中。例如：`https://github.com/settings/installations/12345` → ID 为 `12345`。

4. 在 *Settings → Secrets and variables → Actions* 中**添加 3 个 secrets**。

   | Secret | 值 |
   |---|---|
   | `GITHUB_APP_ID` | App ID。 |
   | `GITHUB_APP_PRIVATE_KEY` | `.pem` 文件的全部内容。包含 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----` 行。 |
   | `GITHUB_APP_INSTALLATION_ID` | Installation ID。 |

5. 在评论张贴步骤中**生成并使用 token**。

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

#### 将发现上传到 GitHub Code Scanning（SARIF）

`--format sarif` 会将
[SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
报告写入 stdout。将其重定向到文件，并通过 CodeQL 的
`upload-sarif` 操作上传，发现结果将显示在
**Security → Code scanning** 中：

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

由于 SARIF 是机器可读格式，OCR 会抑制 stdout 上的进度行，
`results.sarif` 将只包含报告。`--preview` 不兼容
`--format sarif`。要生成报告，请运行完整的
review（或 `ocr scan`）。

### 故障排除

| 症状 | 原因 / 修复 |
|---|---|
| `Cannot find merge-base` | checkout 步骤使用了浅克隆，但区间模式审查需要完整历史。上游工作流为 `actions/checkout` 设置了 `fetch-depth: 0`——编辑文件时请保留此设置。 |
| `Failed to parse OCR output` | `OCR_LLM_URL` 或 `OCR_LLM_AUTH_TOKEN` 缺失或错误。请在 *Settings → Secrets and variables → Actions* 中重新检查值。 |
| 审查评论出现在错误的行上 | 通常意味着从审查开始到评论张贴期间 diff 发生了偏移。张贴脚本在这种情况下会回退到普通 issue 评论——无需处理。 |

> **注意。** `OCR_DEBUG` 环境变量目前在 OCR 中**未实现**——设置 `OCR_DEBUG: "1"` 不会产生任何效果。此处提及是为了将来支持。如果当前需要详细输出，请检查工作流写入 `/tmp/ocr-result.json` 和 `/tmp/ocr-stderr.log` 的原始审查 JSON 和 stderr（参见下方故障排除），或在本地运行 `ocr review`。

## GitLab CI

上游流水线位于
[`examples/gitlab_ci/.gitlab-ci.yml`](https://github.com/alibaba/open-code-review/blob/main/examples/gitlab_ci/.gitlab-ci.yml)。

### 功能说明

- 由 `merge_requests` 事件（创建、更新、重新打开等所有 MR 事件）触发。
- 在 `node:20` 镜像上运行，安装 OCR，使用 `ocr config set` 配置，并以 MR diff 模式运行核心命令。
- 使用内联 Python 脚本解析 JSON 外壳，并将每个发现作为 GitLab Discussion（内联在 diff 上）发布。使用 MR 的 `versions` 端点计算正确的 `base_sha` / `start_sha` /
  `head_sha` 以精确定位。无法内联发布的评论会回退到普通 MR note，最后以摘要 note 结束。

### 安装

将流水线放置到仓库根目录。

```bash
curl -o .gitlab-ci.yml \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/examples/gitlab_ci/.gitlab-ci.yml
```

如果你已有 `.gitlab-ci.yml` 并希望保留它，可以将配方放在其他路径并通过 `include:`
引入。

```yaml
include:
  - local: 'ci/ocr-review.gitlab-ci.yml'
```

### 必需的 CI/CD 变量

在 **Settings → CI/CD → Variables** 中设置。

| 变量 | 必需 | 掩码 | 说明 |
|---|---|---|---|
| `OCR_LLM_URL` | 是 | 否 | LLM API 端点 URL。 |
| `OCR_LLM_AUTH_TOKEN` | 是 | 是 | API 认证 token。此 CI 变量会传递给 `ocr config set llm.auth_token`。（OCR 直接使用的环境变量是 `OCR_LLM_TOKEN`，而非 `OCR_LLM_AUTH_TOKEN`。） |
| `OCR_LLM_MODEL` | 否 | 否 | 模型名称。没有默认值——必须显式设置。 |
| `GITLAB_API_TOKEN` | 否 | 是 | 具有 `api` scope 的 project / personal / group access token。可选——缺失时回退到内置的 `CI_JOB_TOKEN`（适用于 fork MR 等）。为了可靠性，建议使用专用的 `GITLAB_API_TOKEN`。 |

> 由于 GitLab 拒绝少于 8 个字符的变量，流水线中将 `llm.use_anthropic` 硬编码为
> `false`。要使用 Anthropic Claude 模型，请直接编辑脚本。

> 流水线启动时也会执行
> `ocr config set llm.extra_body '{"thinking": {"type": "disabled"}}'`
> 以关闭不支持此字段的 LLM 提供商的 thinking-mode 请求。如果你的提供商需要保留 thinking-mode，请删除该行。

> **便捷的 bot 命名技巧。** 对于 Project Access Token 和 Group Access Token，
> token 的**名称**会显示在 MR 讨论旁边。将 token 命名为 `OpenCodeReview Bot`，即可无需额外配置地为审查讨论添加品牌名称——当不需要 [以服务账户身份发布](#post-under-a-service-account-identity) 中描述的更持久的服务账户设置时，这很方便。

### 自定义

以下所有内容都是对你刚复制的 `.gitlab-ci.yml` 的编辑。

#### 背景上下文

将 MR 标题传递给 `--background`——如果标题遵循 `feat(auth): add OAuth2 support`
之类的语义化约定，效果会更好。

```yaml
script:
  - |
    ocr review \
      --background "$CI_MERGE_REQUEST_TITLE" \
      --from "origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME" \
      --to "${CI_COMMIT_SHA}" \
      --format json --audience agent
```

#### 自定义规则与并发数

与 GitHub Actions 配方相同的参数——使用 `--rule` 传递项目特定的规则文件，
使用 `--concurrency` 限制并发子 agent（默认为 8）。

```yaml
script:
  - |
    ocr review --rule ./my-rules.json --concurrency 5 \
      --from "origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME" \
      --to "${CI_COMMIT_SHA}"
```

规则架构请参阅 [审查规则](../../review-rules/)。

#### 固定 OCR 版本

```yaml
script:
  - npm install -g @alibaba-group/open-code-review@1.0.0
```

#### 避免每次推送都重新审查

`only: [merge_requests]` 会在 **每次 MR 更新时**触发，因此对于长期存在的 MR 会消耗大量 LLM token。由于 GitLab 没有原生的“仅创建时”事件，推荐的模式是在运行审查前检测是否已有 OCR note，如果有则跳过。将 `ocr review` 调用替换为 Python wrapper。

```python
import json, os, sys, urllib.request

GITLAB_URL = os.environ.get("CI_SERVER_URL", "https://gitlab.com")
PROJECT_ID = os.environ["CI_PROJECT_ID"]
MR_IID     = os.environ["CI_MERGE_REQUEST_IID"]
API_TOKEN  = os.environ["GITLAB_API_TOKEN"]

url = (
    f"{GITLAB_URL}/api/v4/projects/{PROJECT_ID}"
    f"/merge_requests/{MR_IID}/notes?per_page=100"
)
req = urllib.request.Request(url, headers={"PRIVATE-TOKEN": API_TOKEN})
with urllib.request.urlopen(req) as resp:
    notes = json.loads(resp.read().decode())

if any("OpenCodeReview" in n.get("body
```