# OpenCodeReview - GitFlic CI 演示

本演示展示了如何将 OpenCodeReview 集成到 [GitFlic](https://gitflic.ru) CI/CD 流水线中，自动审查合并请求并将发现的问题以 MR 讨论的形式发布——尽可能在变更行的内联位置显示。

与 GitHub Actions 和 GitLab CI 示例类似，发布逻辑位于 CI 层而非 `ocr` 二进制文件中。这里使用一个无依赖的小型 Python 脚本——[`post_review.py`](post_review.py)——它读取 `ocr review --format json` 的输出并发布到 GitFlic 讨论 API。该脚本处理的唯一 GitFlic 特定问题是**旧侧行号**：即使评论是针对 diff 的新侧，GitFlic 也要求提供旧侧行号，而 `ocr review` 仅报告新侧位置，因此脚本根据审查所基于的同一 merge-base diff 重新计算旧侧行号。

## 工作原理

```
MR 创建/更新 → 合并请求流水线 → ocr review → post_review.py → MR 讨论
```

1. 合并请求流水线触发 `code-review` 任务
2. 在 `node:20` 镜像中通过 npm 安装 OCR（该镜像同时附带 `python3` 和 `git`）
3. 运行 `ocr review --from origin/<目标分支> --to $CI_COMMIT_SHA --format json --audience agent`
4. 运行 `python3 post_review.py`，该脚本读取 JSON 并发布：
   - **变更行的内联讨论**（`POST .../discussions/create`，包含 `newLine`/`oldLine`/`newPath`/`oldPath`）
   - **回退备注**，汇总无法内联放置的评论
   - **摘要备注**，包含总计信息

MR 上下文（所有者、项目、MR ID、分支引用）会自动从 GitFlic 预定义的 CI 变量（`CI_PROJECT_NAMESPACE`、`CI_PROJECT_NAME`、`CI_MERGE_REQUEST_LOCAL_ID`、`CI_MERGE_REQUEST_TARGET_BRANCH_NAME`、`CI_COMMIT_SHA`）中获取，因此 `post_review.py` 在 CI 中无需任何参数。在 CI 之外，所有值都可以通过参数传入——运行 `python3 post_review.py -h` 查看帮助。

## 配置

### 1. 启用合并请求流水线

进入**项目设置 → CI/CD 设置**，启用**合并请求流水线**。新的合并请求将自动触发流水线。

### 2. 复制流水线文件

将 **两个** 文件 `gitflic-ci.yaml`（GitFlic 要求仓库根目录下必须使用此确切文件名）和 `post_review.py` 复制到你的仓库中。如果你将 `post_review.py` 放在仓库根目录以外的位置，请相应调整 `gitflic-ci.yaml` 中的 `python3 post_review.py` 路径。

### 3. 配置 CI/CD 变量

进入**设置 → CI/CD → 变量**，添加以下变量：

| 变量 | 必填 | 描述 |
|----------|----------|-------------|
| `OCR_LLM_URL` | 是 | LLM API 端点 URL |
| `OCR_LLM_AUTH_TOKEN` | 是 | LLM API 认证令牌 |
| `GITFLIC_TOKEN` | 是 | 用于发布讨论的 GitFlic 访问令牌 |
| `OCR_LLM_MODEL` | 是 | 模型名称（例如 `gpt-4o`）——OCR 没有内置默认模型，未设置时会报错 |
| `GITFLIC_API_URL` | 否 | 自托管 GitFlic 的 REST API 基础 URL（默认：`https://api.gitflic.ru`） |

> **注意：** GitFlic CI/CD 不接受值短于 8 个字符的变量，因此 `use_anthropic` 不能作为 CI 变量设置。流水线将其设置为 `false`；要使用 Anthropic Claude 模型，请直接编辑 `gitflic-ci.yaml`。

### 4. 创建 GitFlic 访问令牌

在**用户设置 → 访问令牌**中创建令牌（或使用专用服务账户——其名称将成为讨论中显示的机器人名称），并将其存储在 `GITFLIC_TOKEN` 变量中。令牌所有者必须拥有足够的项目访问权限以对合并请求发表评论。

## 注意事项与限制

- **内联定位** — GitFlic 要求代码评论必须同时包含 `newLine`/`oldLine`/`newPath`/`oldPath` 四个字段；缺少任何字段时，它会静默创建一条普通评论。`post_review.py` 根据审查所基于的同一 merge-base diff（`git diff merge-base(from, to)..to`）计算旧侧位置，并将新增行锚定到最近的前一行旧行。
- **速率限制** — GitFlic 云 API 每个令牌允许每小时 500 个请求。一次审查最多发布 `评论数 + 2` 个请求，完全在限制范围内。
- **自托管 GitFlic** — 将 `GITFLIC_API_URL` 设置为你的实例的 REST API 基础 URL。
- **重复审查** — 每次推送到 MR 都会触发新的流水线和新的审查。要跳过已审查过的 MR，请在运行审查步骤之前检查现有讨论中是否包含 `OpenCodeReview` 标记。

## 测试

`post_review.py` 附带 [`post_review_test.py`](post_review_test.py)——使用标准库 `unittest`，无需网络或 git：

```bash
cd examples/gitflic_ci
python3 post_review_test.py
```

行映射测试用例移植自上游 Go 测试，确保脚本与二进制文件保持经过验证的一致性。

## 调试

在不影响 MR 的情况下本地测试发布步骤：

```bash
ocr review --from origin/main --to HEAD --format json > /tmp/r.json
python3 post_review.py /tmp/r.json \
  --owner <所有者> --project <项目> --mr <ID> \
  --from origin/main --to HEAD --dry-run
```

`--dry-run` 会打印每条讨论（包含计算出的位置）而不是实际发布，且不需要 `GITFLIC_TOKEN`。