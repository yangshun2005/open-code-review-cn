# 编码智能体插件

Open Code Review 为 Claude Code、Codex、Cursor 和 QCA Forward 提供了平台专属集成。请根据你的平台选择下方对应的说明，而无需参考为其他智能体编写的安装指南。

所有集成均要求 Git 2.41 或更高版本。请先安装 `ocr` CLI：

```bash
npm install -g @alibaba-group/open-code-review
```

在运行审查之前，请先配置并测试 OCR LLM，除非你计划使用
[委派模式](https://open-codereview.ai/docs/delegate)：

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

这将安装 `/open-code-review:review` 和
`/open-code-review:delegate-review` 斜杠命令。有关手动
安装、用法和行为，请参阅
[Claude Code 指南](https://open-codereview.ai/docs/claude-code)。

## Codex

将此仓库添加为 Codex 市场，然后启动 Codex：

```bash
codex plugin marketplace add alibaba/open-code-review
codex
```

打开 `/plugins`，安装并启用 **Open Code Review**，然后开始新任务。
该插件提供了由本地 `ocr` CLI 支持的可调用审查技能。例如：

```text
@Open Code Review review my current changes
@Open Code Review review this branch against main
@Open Code Review review and fix high-confidence issues
```

## Cursor

此仓库在
[`.cursor-plugin/plugin.json`](.cursor-plugin/plugin.json) 中包含了 Cursor 插件清单。对于本地手动
安装，请将整个 `plugins/open-code-review/` 目录复制到：

```text
~/.cursor/plugins/local/open-code-review/
```

确认清单位于
`~/.cursor/plugins/local/open-code-review/.cursor-plugin/plugin.json`，然后
重启 Cursor 或运行 **开发者：重新加载窗口**。该插件提供
来自捆绑 `skills/` 目录的可移植 OCR 审查技能。

有关插件加载和管理的详细信息，请参阅
[Cursor 插件文档](https://cursor.com/docs/plugins)。

## QCA Forward

QCA Forward 通过 OCR 委派模式使用宿主模型。发布
`open-code-review-delegate` 技能，在引用的 QCA
环境中预安装 OCR，并从捆绑的示例中创建 Forward 模板。无需
OCR LLM 端点。

请参阅 [QCA Forward 集成指南](qca/README.md) 和
[模板示例](qca/template.example.json)。