# Coding agent 插件

Open Code Review 为 Claude Code、Codex、Cursor、Kimi Code 和 QCA Forward 提供平台专属集成。请选择你的平台，不要套用为其他 agent 编写的安装说明。

所有集成均要求 Git 2.41 或更高版本。先安装 `ocr` CLI：

```bash
npm install -g @alibaba-group/open-code-review
```

运行审查前，先配置并测试 OCR LLM，除非你打算使用[委托模式](https://open-codereview.ai/docs/delegate)：

```bash
ocr config provider
ocr config model
ocr llm test
```

## Claude Code

在 Claude Code 中运行以下命令：

```text
/plugin marketplace add alibaba/open-code-review
/plugin install open-code-review@open-code-review
```

这会安装 `/open-code-review:review` 和 `/open-code-review:delegate-review` 斜杠命令。手动安装、用法和行为说明见 [Claude Code 指南](https://open-codereview.ai/docs/claude-code)。

## Copilot CLI

安装插件，它会添加两个 Agent Skill：`open-code-review` 和 `open-code-review-delegate`。提及 `/open-code-review` 或直接描述任务，Copilot 会自动选择对应 skill。

```bash
copilot plugin install alibaba/open-code-review:plugins/open-code-review
```

Copilot CLI 安装器会警告：直接安装（repo/path/URL）已弃用，推荐改用 `plugin@marketplace`。一旦本仓库的 marketplace 索引指向插件根目录，`copilot plugin install <name>@open-code-review` 将成为推荐形式。
用 `copilot plugin uninstall open-code-review` 卸载。用法和手动安装见 [Copilot CLI 指南](https://open-codereview.ai/docs/copilot-cli)。

## Codex

将本仓库添加为 Codex marketplace，然后启动 Codex：

```bash
codex plugin marketplace add alibaba/open-code-review
codex
```

打开 `/plugins`，安装并启用 **Open Code Review**，然后新建任务。该插件提供可调用的审查 skill，底层调用本地 `ocr` CLI。例如：

```text
@Open Code Review review my current changes
@Open Code Review review this branch against main
@Open Code Review review and fix high-confidence issues
```

默认审查 skill 运行 `ocr review`，调用的是为 `ocr` 配置的 LLM，而非 Codex 会话。若想用现有 Codex 配额审查、不配置 OCR LLM，请使用 delegate skill。它运行 `ocr delegate preview` 和 `ocr delegate rule` 完成文件选择与规则，由 Codex 本身执行审查：

```text
@Open Code Review delegate review my current changes
```

## Cursor

本仓库在 [`.cursor-plugin/plugin.json`](.cursor-plugin/plugin.json) 包含 Cursor 插件清单。本地手动安装时，将整个 `plugins/open-code-review/` 目录复制到：

```text
~/.cursor/plugins/local/open-code-review/
```

确认清单位于 `~/.cursor/plugins/local/open-code-review/.cursor-plugin/plugin.json`，然后重启 Cursor 或运行 **Developer: Reload Window**。该插件从自带的 `skills/` 目录提供可移植的 OCR 审查 skill。

插件加载和管理细节见 [Cursor 插件文档](https://cursor.com/docs/plugins)。

## Kimi Code

本仓库本身就是一个 Kimi Code 插件。清单位于仓库根目录（[`.kimi-plugin/plugin.json`](../../.kimi-plugin/plugin.json)），因为从 GitHub 安装时 Kimi Code 将仓库根目录视为插件根目录；其 `skills` 和 `commands` 路径指向本目录内部。

在 Kimi Code 中运行：

```text
/plugins install https://github.com/alibaba/open-code-review
```

然后运行 `/reload`（或新建会话）激活插件。它提供 `/open-code-review:review` 和 `/open-code-review:delegate-review` 斜杠命令，以及可移植的 OCR 审查 skill，底层调用本地 `ocr` CLI。

插件按用户安装，对所有项目生效。用 `/plugins list`、`/plugins info open-code-review`、`/plugins disable open-code-review` 和 `/plugins remove open-code-review` 管理安装。详情见 [Kimi Code 插件文档](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins.html)。

## QCA Forward

QCA Forward 通过 OCR 委托模式使用宿主模型。发布 `open-code-review-delegate` Skill，在引用的 QCA 环境中预装 OCR，并基于自带示例创建 Forward Template。无需 OCR LLM 端点。

见 [QCA Forward 集成指南](qca/README.md)和[模板示例](qca/template.example.json)。