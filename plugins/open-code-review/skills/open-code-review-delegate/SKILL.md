---
name: open-code-review-delegate
description: >
  使用宿主 Agent 的模型审查工作区变更、PR、提交或分支对比。OCR 的 CLI 负责文件选择和规则解析；
  本 Skill 定义审查工作流、覆盖要求和输出格式。
  适用于用户没有 OCR 独立 API Key，或希望复用其编码 Agent 订阅或模型配置的场景。若需使用 OCR 完整原生流水线及其自带模型提供方，请选择 open-code-review。
license: Apache-2.0
compatibility: >
  需要安装 `ocr` CLI（通过 `npm install -g
  @alibaba-group/open-code-review` 或 GitHub release 二进制）。不需要配置 LLM 端点——委托模式下 OCR 侧不依赖 LLM。
metadata:
  author: alibaba
  homepage: https://github.com/alibaba/open-code-review
  version: "1.0.0"
---

# Open Code Review — 委托模式

本 Codex 插件 Skill 有意镜像 `skills/open-code-review-delegate/SKILL.md` 中的规范 Skill。更新 OCR 委托说明时请同步两个文件；不使用符号链接，因为插件安装可能只落地插件子树。

## 工作流

### 第 1 步：预览——确定审查范围

跳过 OCR 提供方配置和 `ocr llm test`；宿主 Agent 的认证、用量限制和费用仍然适用。

```bash
ocr delegate preview --format json [--from <ref> [--to <ref>]] [--commit <hash>] [--exclude <patterns>]
```

指定 `--from` 而未指定 `--to` 时，两个 delegate 子命令均默认使用 `HEAD`。范围审查比较 merge-base 与目标提交，并排除已暂存、未暂存和未跟踪的变更。工作区模式请省略范围/提交标志；范围标志与提交标志互斥。

输出内容：
- **mode**（workspace / range / commit）
- **from / to / commit / merge_base** — 用于构造 git 命令的 ref 元数据
- **可审查文件列表** — 路径、状态、新增/删除行数
- **排除的文件** — 含排除原因

**常见调用：**

| 场景 | 命令 |
|----------|---------|
| 工作区变更 | `ocr delegate preview` |
| 分支对比 | `ocr delegate preview --from main --to feature` |
| 当前分支对比 main | `ocr delegate preview --from main` |
| 单个提交 | `ocr delegate preview -c abc123` |

### 第 2 步：获取文件规则

```bash
ocr delegate rule --format json [--from <ref> [--to <ref>]] [--commit <hash>] <path1> <path2> ...
```

传入第 1 步得到的可审查文件路径。输出按规则内容分组——共享同一规则的文件归入同一组，避免重复。

传入与第 1 步相同的范围或提交标志，确保规则针对同一目标解析。例如，将 `ocr delegate preview --from main` 与 `ocr delegate rule --from main --format json <path...>` 配对使用。

### 第 3 步：获取 Diff

根据第 1 步的模式和 ref 选择 diff 命令。审查期间每次调用 Git 都使用 `git --no-pager`。

以下 diff 命令禁用外部 diff 程序、文本转换和颜色，以生成纯补丁。

**范围模式**（preview 输出中提供 merge_base）：
```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color <merge_base>..<to> -- "<path>"
```

**提交模式**：
```bash
git --no-pager show --no-ext-diff --no-textconv --no-color <commit> -- "<path>"
```

**工作区模式**：
```bash
# 已跟踪文件
git --no-pager diff --no-ext-diff --no-textconv --no-color HEAD -- "<path>"
# 新增未跟踪文件——直接读取（整个文件都是新代码）
cat "<path>"
```

读取上下文：

```bash
git --no-pager log --no-color --oneline -- "<path>"
git --no-pager blame --no-textconv -- "<path>"
git --no-pager show --no-ext-diff --no-textconv --no-color "<ref>:<path>"
```

对于大型 diff，在所选模式的命令中添加 `--output="<absolute-diff-file>"`。选择一个仓库外的唯一绝对路径，并创建其父目录。在文件读取工具调用中使用同一路径：

```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color --output="<absolute-diff-file>" <merge_base>..<to> -- "<path>"
```

Git 以退出码 0 结束后，分块读取并审查整个文件，然后删除它。若 Git 失败或超时，重试或记录为 `skipped` 并附上错误。若输出意外为空，对照新的 preview 检查。

### 第 4 步：审查每个文件

创建包含所有 `reviewable_files` 条目的清单。对每个可审查文件：

使用 `(path, status)` 作为清单标识。工作区模式下，若暂存删除后又出现未跟踪的重建文件，同一路径可能出现两次。

1. 获取其 diff（第 3 步）
2. 查阅其规则组（来自第 2 步）作为审查清单
3. 进行彻底审查，按需使用适当的上下文工具
4. 将文件标记为 `reviewed`，或标记为 `skipped` 并附具体原因

对于大型变更，按共享规则和 diff 大小分组，分批审查。不要找到第一个高严重度问题就停止。

### 第 5 步：格式化输出

每条评论必须遵循以下结构：

| 字段 | 类型 | 必填 | 说明 |
|-------|------|----------|-------------|
| path | string | 是 | 相对文件路径 |
| content | string | 是 | 描述问题的审查评论 |
| start_line | integer | 否 | 新文件中的起始行 |
| end_line | integer | 否 | 新文件中的结束行 |
| category | enum | 否 | bug、security、performance、maintainability、test、style、documentation、other |
| severity | enum | 否 | critical、high、medium、low |

### 第 6 步：分类与报告

将审查模式标识为 delegation。

报告前，确认每个已预览文件都已处理。在摘要中包含 `total_files`、`reviewed_files`、`skipped_files` 和 `coverage_rate`。跳过的文件必须包含原因。

按严重度分组呈现发现：

- **Critical/High**：Bug、安全问题、数据丢失风险——始终报告
- **Medium**：性能问题、错误处理缺口、可维护性问题——附上下文报告
- **Low**：风格细节、次要建议——仅在明显有价值时报告

静默丢弃可能的误报。

### 第 7 步：修复（可选）

若用户要求"审查并修复"：
- 直接应用 High/Critical 修复
- 描述需要人工干预的 Medium 修复
- 跳过低优先级项，除非是琐碎修改

## 子命令参考

| 命令 | 用途 |
|---------|---------|
| `ocr delegate preview` | 确定审查哪些文件 + 模式/ref 元数据 |
| `ocr delegate rule <path...>` | 按内容分组的审查规则 |

## 通用标志

| 标志 | 说明 |
|------|-------------|
| `--from <ref>` | 范围模式的源 ref |
| `--to <ref>` | 范围模式的目标 ref；任一子命令指定 `--from` 时默认 `HEAD` |
| `-c, --commit <hash>` | 单提交模式 |
| `--repo <path>` | 仓库根目录（默认：当前工作目录） |
| `--rule <path>` | 自定义 rule.json 路径 |
| `--exclude <patterns>` | 逗号分隔的排除模式 |
| `-b, --background <text>` | 业务上下文 |
| `-B, --background-file <path>` | 从 Markdown 文件读取业务上下文（优先于 `-b`） |
| `-f, --format <text\|json>` | 输出格式；Agent 集成请使用 `json` |

## 注意事项

- **宿主驱动分析** — OCR 的原生审查 Agent、定位和反思模块在委托模式下不运行。
- **规则按组输出** — 共享同一规则的文件在输出中归为一组。每次调用可传入任意数量的路径；对于大型变更，审查时按批获取规则。
- **工作目录很重要** — `ocr delegate` 操作当前目录的 Git 仓库。使用 `--repo /path` 覆盖。
- **工作区模式下的未跟踪文件** — `preview` 包含未跟踪文件。对这些文件直接读取，不要使用 `git diff`。
- **背景上下文** — 有需求上下文时向 `preview` 传入 `--background`；它会出现在输出中供审查时参考。
- **覆盖是强制要求** — 每个 `reviewable_files` 条目最终必须为 reviewed 或明确 skipped；不得静默遗漏文件。

### 恢复超大背景上下文

`--background-file` 有两个独立限制。原始文件不得超过 1 MiB，清理后的内容不得超过 8000 字符。任一条件都会中止命令。当命令报告任一限制时：

1. 不要静默截断源文件。
2. 总结原始材料，保留其需求、约束、验收标准及其他审查关键细节。
3. 将摘要作为单个 shell 安全参数传入，重试受影响的命令（例如，使用宿主 shell 生成的带引号/转义参数，或写入新的有大小限制的文件并传入该文件）。不要将不可信的摘要文本直接放入双引号 shell 模板；`$()`、反引号、引号和变量引用仍可能被求值。省略原始 `--background-file`，以免 CLI 重新加载同一超大文件并再次失败。
4. 若无法忠实总结，完全省略 OCR 背景，审查时直接读取原始材料。

### CLI 版本兼容性排查

若 OCR 命令失败并报 `command not found`，在环境允许时用 `npm install -g @alibaba-group/open-code-review` 安装 CLI，然后重试同一命令。若不允许安装，说明前置条件并停止；不要改用 `ocr review` 或索要 API Key。

`--format` 标志在 `ocr` v1.9.0 及以后版本可用。Skill 与已安装的 CLI 可独立更新。若请求的 `preview` 或 `rule` 命令带 `--format json` 时专门报 `unknown flag: --format`，去掉该标志重新运行，并在本次委托运行剩余部分使用文本输出。保留该输出中的显式模式、ref、文件和规则信息；不要将文本输出解析为 JSON 或臆造缺失的 Schema 字段。其他任何错误都不要去掉标志重试；报告错误并停止受影响的工作流。

宿主 Agent 的 Skill 可以使用等效的文本输出完成其审查清单。需要 `schema_version` 或其他 JSON 字段的程序化集成必须要求支持 JSON 的 CLI：用 `ocr --version` 验证，必要时升级：

```bash
npm install -g @alibaba-group/open-code-review
```