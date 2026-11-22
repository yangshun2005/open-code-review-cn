---
title: GitHub Copilot CLI
sidebar:
  order: 3
---

通过与其他编码 agent 相同的可移植 [Agent Skill](../agent-skill/)，在
[GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli)
中端到端运行 OCR——审查 diff、分类发现、修复应采纳的问题。此集成是一个复制即可使用的 skill——不安装 Hook、不添加强制指令、不改变仓库行为。

## 仓库包含的内容

工作流位于与 agent 无关的 skill
[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)
中。Copilot CLI 的插件清单
[`plugins/open-code-review/plugin.json`](https://github.com/alibaba/open-code-review/blob/main/plugins/open-code-review/plugin.json)
（Agent Plugins 1.0）将随附的 skill 打包以供 `copilot plugin install` 使用。
Copilot CLI 也会从标准位置加载 skill，因此复制 skill 目录的方式仍然可用。

## 安装

安装插件（推荐）：

```bash
copilot plugin install alibaba/open-code-review:plugins/open-code-review
```

将安装 `open-code-review` 和 `open-code-review-delegate` 两个 skill。卸载请执行 `copilot plugin uninstall open-code-review`。

Copilot CLI 安装器目前警告：直接安装插件（repo/path/URL）已弃用，推荐通过 marketplace 安装。将来 marketplace 条目可能使 `plugin@open-code-review` 成为推荐形式。

### 手动替代方案：复制 skill

将 skill 复制到 Copilot CLI 能检测到的目录。**项目级**
（提交到仓库，团队共享）：

```bash
mkdir -p .github/skills/open-code-review
curl -o .github/skills/open-code-review/SKILL.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/skills/open-code-review/SKILL.md
```

**用户级**（对机器上所有项目可用）：

```bash
mkdir -p ~/.copilot/skills/open-code-review
curl -o ~/.copilot/skills/open-code-review/SKILL.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/skills/open-code-review/SKILL.md
```

Copilot CLI 也会检测项目内的 `.agents/skills/` 和 `.claude/skills/`。同名项目 skill 优先于个人 skill。在会话内执行 `/skills list`（会话外执行
`copilot skill list`）查看已加载的内容。手动复制的 skill 需执行 `/skills reload` 或开启新会话后生效。已安装的插件通过重新安装（再次执行 `copilot plugin install`）或 `copilot plugin update` 更新。

## 用法

用 `/open-code-review` 显式指定 skill，或直接描述任务——Copilot 会根据描述选择 skill：

```
/open-code-review
/open-code-review review this PR against main
/open-code-review focus on race conditions in commit abc123
```

| 你的说法 | skill 执行的内容 |
| --- | --- |
| 「审查变更」 | `ocr review --audience agent`（staged、unstaged、untracked） |
| 「审查这个 PR」 | `ocr review --from main --to <branch>` |
| 「审查 commit abc123」 | `ocr review --commit abc123` |

skill 使用独立配置的模型驱动 `ocr`，按严重程度分组报告发现。若不想为 `ocr` 配置单独的 LLM，可尝试[委托模式](../delegate/)——由宿主 agent（Copilot）提供模型，`ocr` 仅负责选择文件和解析规则。

### 可选：将审查变为习惯

若想让审查步骤自动化而非按需执行，在 `.github/copilot-instructions.md` 或 `AGENTS.md` 中添加一条规则——只选其中一个文件，因为 Copilot 会无优先级地合并指令文件：

```markdown
Before reporting a coding task complete, run `ocr review --audience agent`.
Fix all `critical` and `high` findings first.
```

是否安装此类规则由各项目自行决定。本仓库不强制。

## 无头运行

```bash
copilot -p "Review the current branch with /open-code-review and report the findings." \
  --allow-tool='shell(ocr:*)'
```

- `--allow-tool='shell(ocr:*)'` 仅预先批准 `ocr` 的 shell 命令——不授予文件编辑权限。在非交互（`-p`）会话中，需要批准的操作会被拒绝而非暂停等待。在交互会话中则会暂停等待批准。要让 Copilot 应用修复，请以交互方式运行（或有意将允许列表扩展到编辑工具）。
- 在不受信任的文件夹中，非交互会话可能跳过项目级 skill（`.github/skills/`）。Copilot CLI v1.0.107 及以后提供 `--trust-folder`，可在单次会话中信任该文件夹。
- 启用 Copilot 沙箱时，`ocr` 需要访问 LLM 端点的网络权限，以及对 `~/.opencodereview/` 的读写权限（用于保存会话状态）。
- `--output-format json` 输出的是 Copilot 的 JSONL 会话事件。审查结果本身是 `ocr` 的 JSON，需显式执行 `ocr review --format json --audience agent` 获取。

若需要确定性的 CI 门禁，请绕过 agent 直接调用 `ocr`——
参见 [CI/CD](../cicd/)。

## 注意事项

- **有意不提供 Hook。** Copilot CLI 可通过 `preToolUse` Hook 拦截 `git commit` 或
  `git push`，但 OCR 不提供 Hook。因为审查会运行 LLM（慢，且可能需要贡献者没有的凭据），审查的工作区是正在创建的 commit 而非工作区，而 fail-open 的 Hook 等于宣传无法保证的强制力。仅在你接受这些权衡时才添加自己的 Hook。
- **提示文件仅限 IDE。** Copilot CLI 不读取
  `.github/prompts/*.prompt.md`。它只支持 skill。
- **发现不改变退出码。** `ocr` 即使发现问题，只要审查完成就以 0 退出——请用 `--format json` 的严重程度做门禁，绝不要用退出状态做门禁。

## 故障排查

- **skill 未出现在列表中** — 检查路径（`~/.copilot/skills/` 或
  `<repo>/.github/skills/`），然后执行 `/skills reload` 或开启新
  会话。
- **`ocr: command not found`** — 通过 `npm i -g @alibaba-group/open-code-review`
  安装。
- **审查因 LLM 错误失败** — 配置提供商，并用 `ocr llm test`
  测试。参见[配置](../configuration/)。
- **Copilot 反复请求批准 `ocr`** — 用 `--allow-tool` 允许
  `shell(ocr:*)`，或在提示中永久批准。