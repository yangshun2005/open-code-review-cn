---
title: GitHub Copilot CLI
sidebar:
  order: 3
---

在 [GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli)
中通过与其他编程智能体相同的可移植[智能体技能](../agent-skill/)端到端运行 OCR：
检查 diff、对发现的问题分类，并修复值得采纳的问题。该集成是一个"复制即用"的技能：
它不安装钩子、不添加强制指令，也不改变仓库行为。

## 仓库中包含的内容

工作流位于与智能体无关的技能文件中：
[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)。
Copilot CLI 插件清单
[`plugins/open-code-review/plugin.json`](https://github.com/alibaba/open-code-review/blob/main/plugins/open-code-review/plugin.json)
（Agent Plugins 1.0）打包了内置技能，供 `copilot plugin install` 使用。
Copilot CLI 仍会从标准位置读取技能，因此复制技能目录同样有效。

## 安装

安装插件（推荐）：

```bash
copilot plugin install alibaba/open-code-review:plugins/open-code-review
```

将安装 `open-code-review` 和 `open-code-review-delegate` 技能。
卸载插件可执行 `copilot plugin uninstall open-code-review`。

Copilot CLI 安装器目前会警告：直接安装插件（repo/path/URL）已弃用，
建议改用 marketplace 安装；marketplace 条目日后可能使 `plugin@open-code-review`
成为推荐形式。

### 手动方式：复制技能

将技能复制到 Copilot CLI 能发现的目录。**项目级**（提交到仓库，让整个团队可用）：

```bash
mkdir -p .github/skills/open-code-review
curl -o .github/skills/open-code-review/SKILL.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/skills/open-code-review/SKILL.md
```

**用户级**（本机每个项目均可用）：

```bash
mkdir -p ~/.copilot/skills/open-code-review
curl -o ~/.copilot/skills/open-code-review/SKILL.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/skills/open-code-review/SKILL.md
```

Copilot CLI 还会发现项目中的 `.agents/skills/` 和 `.claude/skills/`；
同名时项目技能优先于个人技能。在会话内用 `/skills list`（会话外使用
`copilot skill list`）检查已加载的技能。手动复制的技能需执行 `/skills reload`
或开启新会话后生效；已安装的插件通过重新安装（再次执行 `copilot plugin install`）
或 `copilot plugin update` 更新。

## 使用

通过 `/open-code-review` 显式指定技能，或直接描述任务——Copilot 会根据描述选择技能：

```
/open-code-review
/open-code-review review this PR against main
/open-code-review focus on race conditions in commit abc123
```

| 你说 | 技能执行的操作 |
| --- | --- |
| "检查我的改动" | `ocr review --audience agent`（已索引、未索引和未跟踪的改动） |
| "检查这个 PR" | `ocr review --from main --to <branch>` |
| "检查提交 abc123" | `ocr review --commit abc123` |

技能使用自身配置的模型驱动 `ocr`，并按严重程度分组报告问题。如果你不想为
`ocr` 单独配置 LLM，可尝试[委托模式](../delegate/)——由主智能体（Copilot）
提供模型，`ocr` 只负责选择文件并应用规则。

### 可选：将审查变成习惯

要让审查阶段自动执行而非按需触发，可在 `.github/copilot-instructions.md` 或
`AGENTS.md` 中添加一条规则——只选一个文件，因为 Copilot 会合并指令文件且无优先级：

```markdown
Before reporting a coding task complete, run `ocr review --audience agent`.
Fix all `critical` and `high` findings first.
```

是否设置该规则由各项目自行决定；本仓库不强制。

## 非交互式运行

```bash
copilot -p "Review the current branch with /open-code-review and report the findings." \
  --allow-tool='shell(ocr:*)'
```

- `--allow-tool='shell(ocr:*)'` 仅预先批准 `ocr` 的 shell 命令——不授权编辑文件。
  在非交互式会话（`-p`）中，需要确认的操作会被拒绝而非暂停；交互式会话则会等待确认。
  要让 Copilot 应用修复，请以交互模式运行（或有意将编辑工具加入允许列表）。
- 在不受信任的文件夹中，非交互式会话可能跳过项目级技能（`.github/skills/`）；
  Copilot CLI v1.0.107+ 提供 `--trust-folder`，可在单次会话内信任该文件夹。
- 启用 Copilot 沙箱时，`ocr` 需要网络访问你的 LLM 端点，以及 `~/.opencodereview/`
  的读写权限（会话状态存储于此）。
- `--output-format json` 以 JSONL 格式输出 Copilot 会话事件；审查结果本身是
  `ocr` 输出的 JSON，需显式运行 `ocr review --format json --audience agent` 获取。

CI 中的确定性检查请跳过智能体，直接调用 `ocr`——参见 [CI/CD](../cicd/)。

## 注意事项

- **有意不提供钩子。** Copilot CLI 可通过 `preToolUse` 钩子阻止 `git commit` 或
  `git push`，但 OCR 不提供此类钩子：审查由 LLM 驱动（速度慢且需要参与者可能没有的凭据），
  被检查的工作区并非正在创建的提交，而失败时不阻止的钩子承诺了它无法保证的控制。
  只有接受这些权衡时才添加自定义钩子。
- **提示词文件仅限 IDE。** Copilot CLI 不读取 `.github/prompts/*.prompt.md`；
  支持的接口是技能。
- **问题不改变退出码。** `ocr` 在审查完成后以退出码 0 结束，即使发现问题——
  请依据 `--format json` 中的严重程度，而非退出码。

## 故障排除

- **技能未出现在列表中**——检查路径（`~/.copilot/skills/` 或
  `<repo>/.github/skills/`），然后执行 `/skills reload` 或开启新会话。
- **`ocr: command not found`**——使用
  `npm i -g @alibaba-group/open-code-review` 安装。
- **审查因 LLM 报错失败**——配置提供商并用 `ocr llm test` 验证；
  参见[配置](../configuration/)。
- **Copilot 反复请求确认 `ocr`**——通过 `--allow-tool` 允许 `shell(ocr:*)`，
  或在相应提示中永久批准。