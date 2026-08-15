# CodeUp CI 集成

在[阿里云云效 CodeUp](https://codeup.aliyun.com)中，每次合并请求时自动运行 `open-code-review` (`ocr`)，并通过 Flow 将结果作为合并请求评论发布。

## 工作原理

1. 合并请求打开/更新时触发云效 Flow 流水线。
2. 流水线安装 Node.js 和 `ocr` CLI。
3. `post_review.py` 针对合并请求的目标分支与源分支之间的差异运行 `ocr review --format json`。
4. 发现的问题被格式化为单个 Markdown 摘要，并通过 [CreateChangeRequestComment](https://help.aliyun.com/zh/yunxiao/developer-reference/createchangerequestcomment) API 发布到合并请求。

每次审查运行会发布一条摘要评论，而非真正的逐行内联评论。内联评论需要先解析合并请求当前的补丁集 ID——这是一个合理的后续工作，已在下方已知限制中记录。

## 设置

1. 将 `codeup-flow.yml` 复制到你的仓库中（或将其内容粘贴到 Flow 控制台的新流水线中），并根据你的组织调整 `endpoint`、`serviceConnection` 和 `runsOn`。
2. 将 `post_review.py` 复制到其旁边（如果将其保存在共享位置，也可以直接引用）。
3. 在 Flow 中配置以下流水线变量，并将密钥标记为受保护：

   | 变量 | 是否必需 | 描述 |
   |---|---|---|
   | `CODEUP_TOKEN` | 是（密钥） | 用于 `x-yunxiao-token` 请求头的个人访问令牌。 |
   | `CODEUP_ORG_ID` | 是 | 你的云效组织 ID。 |
   | `CODEUP_REPO_ID` | 是 | CodeUp 仓库的数字 ID。 |
   | `OCR_LLM_URL` | 是 | 你的 LLM 端点，例如 `https://api.anthropic.com/v1/messages`。 |
   | `OCR_LLM_TOKEN` | 是（密钥） | LLM 端点的 API 密钥。 |
   | `OCR_LLM_MODEL` | 是 | 模型名称，例如 `<provider-model-name>`。 |
   | `OCR_USE_ANTHROPIC` | 如果使用 Anthropic | 当 `OCR_LLM_URL` 是 Anthropic 兼容端点时，设置为 `true`。 |

   `CODEUP_MR_LOCAL_ID`、`CODEUP_TARGET_BRANCH` 和 `CODEUP_SOURCE_BRANCH` 会自动从合并请求触发上下文中填充——有关如何将它们接入步骤环境的详细信息，请参阅 `codeup-flow.yml`。

4. 在流水线的代码源上启用合并请求触发器（**编辑流水线 → 编辑代码源 → 启用代码源触发**，触发事件设置为“合并请求创建/更新”）。

## 可选参数

设置 `OCR_REVIEW_EXTRA_ARGS` 作为流水线变量，以向 `ocr review` 传递额外参数，例如 `--concurrency 4`。

## 已知限制

- **仅支持摘要评论。** 发现的问题以一条合并的 Markdown 评论发布，而非锚定到特定行的单独内联评论。真正的内联评论需要针对合并请求当前的补丁集，为每个发现的问题调用一次 CreateChangeRequestComment，并设置 `file_path` 和 `line_number`——计划作为后续工作。
- 需要完整（非浅克隆）克隆，或至少获取目标分支，因为 `post_review.py` 会对 `origin/<target>` 与 `origin/<source>` 进行差异比较。

## 本地测试

```bash
python3 -m unittest post_review_test -v
```