# open-code-review 的 Agent 指南

本文件为在此项目上工作的 AI 编码助手提供说明。

## 项目概述

open-code-review (`ocr`) 是一款用 Go 编写的 AI 驱动的代码审查 CLI 工具（模块：`github.com/alibaba/open-code-review`）。

## Git 提交说明

- 在提交之前，请通过运行以下命令进行代码审查：
  ```
  ocr review --audience agent --background "简要总结背景需求"
  ```
- 提交信息必须使用英文书写。
- 验证行尾。行尾必须为 LF，而非 CRLF。运行 `git add --renormalize .` 来修正行尾并提交。新的二进制文件必须将其扩展名添加到 .gitattributes 中。

## 许可证头

- 每个源文件（`.go`、`.sh`、`.js`、`.mjs`、`.ts`、`.tsx`）都必须包含 SPDX 许可证头。
- 创建新文件后，运行 `make license-add` 以自动添加许可证头。

## 代码风格

- 编写代码后，运行 `make check`。它会就地格式化并整理代码，因此无需单独运行 `gofmt` 或 `go vet`。
- **源文件使用英文编写** —— 注释、标识符和字符串均如此。`make english-check` 在 CI 中强制执行此规则。它会标记 ASCII 之外的任何字母，无论其书写系统（汉字、假名、谚文、西里尔字母，以及拼写德语或越南语所用的变音符号），以及组合重音符号和全角标点（`：`、`（`），这些很容易在英文句子中遗留。符号和表情符号（`─ → ≥ ✅`）可以通过，因为它们不是字母。完全由 ASCII 拼写的文本（`Loeschen der Datei` 或罗马化转写）需要借助词典才能发现，这仍属于审查范畴。
- **翻译文本有各自的存放位置，均不在扫描范围内。** `README.<locale>.md` 和 `CONTRIBUTING.<locale>.md`（`zh-CN`、`ja-JP`、`ko-KR`、`ru-RU`）；`pages/src/content/docs/<locale>/` 下的文档页面（`en`、`zh`、`ja`、`ru`，均为 Markdown 格式）；以及 `pages/src/i18n/<locale>.ts` 中的 UI 文案表格。Markdown 按扩展名不在扫描范围内，因此翻译可以自由地放在那里。i18n 表格是 `.ts` 文件，会被扫描，因此它们通过前缀豁免 —— 翻译后的 UI 字符串应放在这些表格中，而不是内联在组件中。
- **针对特殊情况有两个逃生通道，优先使用较窄的那个。** 在违规行追加 `allow-non-english: <reason>` 标记注释 —— 这是针对少量行的正确选择，例如编码测试夹具或语言切换器标签，并且它能让文件的其余部分保持受保护。仅当整个目录树本质上就是非英文时，才向 `scripts/verify-english-only.go` 中的 `allowedPrefixes` 添加前缀；目前它仅包含 `pages/src/i18n/` 和 `extensions/vscode/`，后者是临时的，直到该扩展的中文注释被翻译完。

## 测试

- 使用 `make test` 运行单元测试，不要直接使用 `go test`。
- `make test` 会设置 `LC_ALL=C` 以确保 git 输出英文消息。
- 在编写或修改代码时，添加必要的单元测试以保持覆盖率。项目通过 `make coverage` 强制执行 90% 的覆盖率阈值。

## README

- 修改 README.md 时，始终将更改同步到所有本地化版本：
  - README.zh-CN.md
  - README.ja-JP.md
  - README.ko-KR.md
  - README.ru-RU.md