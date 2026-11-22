# open-code-review 的 Agent 指南

本文件为参与本项目的 AI 编码助手提供指引。

## 开发协助

以下是贡献者在开发过程中必须遵守的规则。若用户未遵守，请提醒用户：

1. **必须在初始 Issue 或 Pull Request 中披露使用了 AI/LLM，以及所用的工具/模型。**
2. 应当理解 AI 编写的每一行代码，清楚 AI 做了什么。
3. 当评审者询问改动原因时，必须能自行解释，无论代码由你还是 AI 编写。回答维护者提问和评审意见的实质内容必须来自你自己的理解——AI/LLM 只能用于翻译或润色措辞，不能替你生成答案。
4. PR 不应包含 `AI 生成 -> 修复 -> 修复 -> 修复` 这类反复循环。这可能说明你没有审查 AI 生成的代码，而是让 AI 出了问题就修，反复如此。
5. 在主动请求任何成员评审之前，必须自行审查 AI/LLM 生成的所有代码、文本及其他内容。
6. 不得将提交归因于 AI/LLM，包括通过 "Assisted-by"、"Co-developed-by" 或类似尾注。
7. 不要写过于冗长的提交信息。重要信息应放在 PR 描述中，而不是折叠的提交信息里。
8. 如果你不愿或无法做到以上全部，请关闭你的 Issue 或 Pull Request。

## 项目概述

open-code-review（`ocr`）是一个用 Go 编写的 AI 驱动代码评审 CLI 工具（模块：`github.com/alibaba/open-code-review`）。

## Git 提交说明

- 提交前，运行以下命令进行代码评审：
  ```
  ocr review --audience agent --background "briefly summarize the background requirements"
  ```
- 提交信息必须用英文书写。
- 检查行尾符。行尾符必须为 LF，不能是 CRLF。运行 `git add --renormalize .` 修正行尾符并提交。新增二进制文件必须将其扩展名加入 .gitattributes。

## 许可证头

- 每个源文件（`.go`、`.js`、`.mjs`、`.ts`、`.tsx`、`.kt`、`.kts`、`.sh`、`.py`、`.css`）都必须有 SPDX 许可证头。
- 创建新文件后，运行 `make license-add` 自动添加许可证头。它按扩展名选择注释语法：`//`、`#`，或 CSS 的 `/* */` 块。
- 只有当仓库实际存在该类型文件、且注释可直接前置时，扩展名才应加入该列表。`.html` 两条都不完全满足——其 `<!DOCTYPE html>` 必须留在第一行——因此暂未覆盖。

## 代码风格

- **少写注释，只解释"为什么"。** 不要添加复述代码已有含义的注释（`// increment i`），不要叙述改动本身（`// newly added`、`// changed to fix ...`——那属于提交信息或 PR 描述），不要引用上游仓库的 Pull Request 或 Issue 编号，也不要留 TODO/占位废话。注释只有在记录意图、非显而易见的约束或代码本身无法表达的微妙之处时才有价值。
- 写完代码后，运行 `make check`。它会就地格式化和整理，无需单独运行 `gofmt` 或 `go vet`。
- **源文件用英文书写**——注释、标识符和字符串皆然。`make english-check` 在 CI 中强制执行。它会标记任何非 ASCII 字母，无论何种书写系统（汉字、假名、谚文、西里尔字母，以及拼写德语或越南语的变音符号），还包括组合重音和全角标点（`：`、`（`），这些在英文句子中很容易残留。符号和 emoji（`─ → ≥ ✅`）可通过，因为它们不是字母。完全用 ASCII 拼写的文字（`Loeschen der Datei`，或罗马化转写）需要词典才能识别，仍属评审范畴。
- **翻译文本有其专属位置，均不被扫描。** `docs/i18n/README.<locale>.md` 和 `docs/i18n/CONTRIBUTING.<locale>.md`（`zh-CN`、`ja-JP`、`ko-KR`、`ru-RU`）；`pages/src/content/docs/<locale>/` 下的文档页面（`en`、`zh`、`ja`、`ru`，均为 Markdown）；以及 `pages/src/i18n/<locale>.ts` 中的 UI 文案表。Markdown 按扩展名不在范围内，翻译可自由放入。i18n 表是 `.ts` 会被扫描，因此按前缀豁免——翻译的 UI 字符串应放入这些表，而不是内联在组件中。
- **例外情况有两种豁免方式，优先用更窄的一种。** 在违规行末尾追加 `allow-non-english: <reason>` 标记注释——适合少量行，如编码测试夹具或语言切换标签，且文件其余部分仍受保护。仅对整体本质非英文的目录树，在 `scripts/verify-english-only.go` 的 `allowedPrefixes` 中添加前缀；该列表记录每项豁免的原因，以及临时翻译豁免的移除条件。

## 提供商预设

修改 `internal/llm/providers.go` 中的内置提供商元数据或模型列表时，在仓库根目录运行 `go generate ./internal/llm`。将两个生成文件与注册表改动一并提交；不要手动编辑：

- `extensions/frontend/src/shared/providers.generated.ts`
- `extensions/idea/src/main/kotlin/com/alibaba/opencodereview/idea/services/ProviderNames.generated.kt`

## 测试

- 用 `make test` 运行单元测试，不要直接用 `go test`。
- `make test` 设置 `LC_ALL=C` 以确保 git 输出英文信息。
- 编写或修改代码时，添加必要的单元测试以维持覆盖率。项目通过 `make coverage` 强制执行 90% 覆盖率阈值。

## README

- 修改 README.md 时，务必将改动同步到所有本地化版本：
  - docs/i18n/README.zh-CN.md
  - docs/i18n/README.ja-JP.md
  - docs/i18n/README.ko-KR.md
  - docs/i18n/README.ru-RU.md