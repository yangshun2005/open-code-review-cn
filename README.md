

> **[中文化] open-code-review**
>
> 此项目是 [alibaba/open-code-review](https://github.com/alibaba/open-code-review) 的中文翻译版本。
> - 原项目 Stars: 20515
> - 主语言: Go
> - 许可证: Apache-2.0
> - 翻译日期: 2026-08-15
> - 原始 README: [README_en.md](README_en.md)
>
> 如有翻译不准确之处，欢迎提 Issue 或 PR。

---


---

<div align="center">
  <a href="https://open-codereview.ai">
    <img src="imgs/logo-core.svg" alt="OpenCodeReview 标志" width="180" />
  </a>
  <h1>OpenCodeReview</h1>
</div>

<p align="center">
  <a href="https://trendshift.io/repositories/41087?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-41087" target="_blank" rel="noopener noreferrer">
    <img src="https://trendshift.io/api/badge/repositories/41087" alt="alibaba%2Fopen-code-review | Trendshift" style="width: 280px; height: 60px;" width="280" height="60" />
  </a>
  <a href="https://trendshift.io/repositories/41087" target="_blank">
    <img src="https://trendshift.io/api/badge/trendshift/repositories/41087/weekly?language=Go" alt="alibaba%2Fopen-code-review | Trendshift" style="width: 280px; height: 60px;" width="280" height="60" />
  </a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@alibaba-group/open-code-review"><img alt="npm" src="https://img.shields.io/npm/v/@alibaba-group/open-code-review?style=flat-square" /></a>
  <a href="https://github.com/alibaba/open-code-review/actions/workflows/release.yml"><img alt="构建状态" src="https://img.shields.io/github/actions/workflow/status/alibaba/open-code-review/release.yml?style=flat-square" /></a>
  <a href="https://github.com/alibaba/open-code-review/blob/main/LICENSE"><img alt="许可证" src="https://img.shields.io/github/license/alibaba/open-code-review?style=flat-square" /></a>
  <a href="https://deepwiki.com/alibaba/open-code-review"><img alt="询问 DeepWiki" src="https://deepwiki.com/badge.svg" /></a>
  <a href="https://www.bestpractices.dev/projects/13328"><img alt="OpenSSF 最佳实践" src="https://img.shields.io/badge/OpenSSF-Gold-D4AF37?style=flat-square" /></a>
</p>
<p align="center">
  <a href="#supported-platforms"><img alt="Windows" src="https://img.shields.io/badge/Windows-supported-blue.svg" /></a>
  <a href="#supported-platforms"><img alt="macOS" src="https://img.shields.io/badge/macOS-supported-blue.svg" /></a>
  <a href="#supported-platforms"><img alt="Linux" src="https://img.shields.io/badge/Linux-supported-blue.svg" /></a>
  <a href="#supported-agents"><img alt="Claude Code" src="https://img.shields.io/badge/Claude_Code-supported-blueviolet.svg" /></a>
  <a href="#supported-agents"><img alt="Codex" src="https://img.shields.io/badge/Codex-supported-blueviolet.svg" /></a>
  <a href="#supported-agents"><img alt="Cursor" src="https://img.shields.io/badge/Cursor-supported-blueviolet.svg" /></a>
</p>
<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.ko-KR.md">한국어</a> | <a href="README.ru-RU.md">Русский</a>
</p>

---

## 什么是 Open Code Review？

Open Code Review 是一款由 AI 驱动的代码审查 CLI 工具。它起源于阿里巴巴集团内部的官方 AI 代码审查助手——在过去两年中，它为数万名开发者提供了服务，并识别了数百万个代码缺陷。在经过了大规模、彻底的验证之后，我们将其孵化成一个面向社区的开源项目。只需配置一个模型端点即可开始使用。

它读取 Git 差异（diff），通过一个具备工具调用能力的代理将变更文件发送给可配置的 LLM，并生成具有行级精度的结构化审查评论。该代理能够读取完整的文件内容、搜索代码库、检查其他变更文件以获取上下文，从而产生深度审查——而不仅仅是表面上的差异反馈。除了差异审查之外，`ocr scan` 还会审查整个文件，用于审计那些没有有意义差异的不熟悉代码库或目录。

访问[官方网站](https://open-codereview.ai)了解更多详情。

![亮点](imgs/highlights-en.png)

## 基准测试

> 与通用代理（Claude Code）相比，Open Code Review 在相同底层模型下实现了显著更高的**精确率**和 **F1 分数**，同时仅消耗约 **1/9 的令牌**，并且审查速度更快。请注意，其召回率低于通用代理——这是一种刻意的权衡，优先考虑精确性而非噪音。

一个基于 **50** 个热门开源仓库、**200** 个真实 Pull Request 和 **10** 种编程语言构建的真实代码审查基准——由 80 多位资深工程师交叉验证（**1,505** 个带标注的真实问题）。

<a href="https://huggingface.co/datasets/Alibaba-Aone/aacr-bench"><img src="https://huggingface.co/favicon.ico" alt="Hugging Face" width="20" height="20" /> 在 Hugging Face 上探索 AACR-Bench 数据集</a>。

| 指标 | 衡量内容 | 重要性 |
|--------|-----------------|----------------|
| **F1** | 精确率和召回率的调和平均值 | 评估整体审查质量的最佳单一指标 |
| **精确率** | 报告的问题中真实缺陷所占的比例 | 越高意味着需要处理的误报越少 |
| **召回率** | 发现的真实缺陷所占的比例 | 越高意味着审查遗漏的问题越少 |
| **平均耗时** | 每次审查的挂钟时间 | 影响 CI 流水线延迟 |
| **平均令牌数** | 每次审查消耗的令牌总数 | 直接影响 API 成本 |

![基准测试](imgs/benchmark-en.png)

## 为什么选择 Open Code Review？

### 通用代理的问题

如果你曾使用过像 Claude Code 这样带有 Skills 的通用代理进行代码审查，你很可能遇到过以下痛点：

- **覆盖不完整** — 在较大的变更集上，代理倾向于“偷工减料”，只选择性地审查部分文件而遗漏其他文件。
- **位置漂移** — 报告的问题经常与实际代码位置不符，行号或文件引用会偏离目标。
- **质量不稳定** — 由自然语言驱动的 Skills 难以调试，审查质量会随着提示词的微小变化而显著波动。

根本原因：纯粹由语言驱动的架构在审查过程中缺乏硬性约束。

### 核心设计：确定性工程 × 代理混合架构

Open Code Review 的核心理念是将确定性工程与代理相结合，各司其职，发挥各自所长。

**确定性工程 — 硬约束**

对于*绝不能出错*的审查步骤，由工程逻辑（而非语言模型）来保证正确性：

- **精确的文件选择** — 精确确定哪些文件需要审查、哪些应被过滤，确保不遗漏任何重要变更。
- **智能文件打包** — 将相关文件分组到一个审查单元中（例如，`message_en.properties` 和 `message_zh.properties` 会被打包在一起）。每个包作为一个子代理运行，拥有独立的上下文——这是一种分而治之的策略，在非常大的变更集上也能保持稳定，并自然支持并发审查。
- **细粒度规则匹配** — 将审查规则与每个文件的特性进行匹配，使模型的注意力高度集中，从源头上消除信息噪音。与纯粹由语言驱动的规则引导相比，基于模板引擎的规则匹配更加稳定和可预测。
- **外部定位与反思模块** — 独立的评论定位和评论反思模块，系统性地提高了 AI 反馈的位置准确性和内容准确性。

**代理 — 动态决策**

代理的优势集中在最关键的领域——动态决策和动态上下文检索：

- **场景调优的提示词** — 为代码审查深度优化的提示词模板，在提高效率的同时减少令牌消耗。
- **场景调优的工具集** — 基于对大规模生产数据中工具调用轨迹的深入分析（包括调用频率分布、每个工具的重复率以及新工具对整个调用链的影响）提炼而成，最终形成一个比通用代理工具包更稳定、更可预测的代码审查专用工具集。

## 如何使用

### 前提条件

- **Git >= 2.41** — Open Code Review 依赖 Git 进行差异生成、代码搜索和仓库操作。

### CLI

#### 安装

```bash
npm install -g @alibaba-group/open-code-review
```

安装后，`ocr` 命令即可全局使用。

其他安装方式（安装脚本、GitHub Release 二进制文件、源码安装）请参阅[安装文档](https://open-codereview.ai/docs/installation)。

#### 快速开始

**1. 配置 LLM**

在审查代码之前，你必须配置一个 LLM，除非你使用[委派模式](https://open-codereview.ai/docs/delegate)。

```bash
ocr config provider          # 选择内置提供商或添加自定义提供商
ocr config model             # 为当前激活的提供商选择模型
```

![提供商设置](imgs/providers.jpg)

交互式界面会引导你完成提供商选择、API 密钥输入和模型配置，然后自动测试连接。

有关 CLI 设置、环境变量、自定义提供商和其他高级配置，请参阅[配置文档](https://open-codereview.ai/docs/configuration)。

**2. 审查**

```bash
cd your-project

# 工作区模式 — 审查所有已暂存、未暂存和未跟踪的更改
ocr review

# 分支范围 — 审查 feature-branch 从 main 分叉以来的更改（合并基点模式）
ocr review --from main --to feature-branch

# 单个提交
ocr review --commit abc123

# 恢复中断的范围或提交审查
ocr session list
ocr review --from main --to feature-branch --resume <session-id>

# 全文件扫描 — 审查整个文件而非差异（无需 Git 历史）
ocr scan                          # 扫描整个仓库
ocr scan --path internal/agent    # 扫描目录或特定文件
ocr scan --resume <session-id>   # 恢复中断的全文件扫描

# 委派模式 — 让你的 AI 编码代理自行执行审查
# OCR 负责文件选择和规则解析；无需配置 LLM
ocr delegate preview
ocr delegate rule src/main.go src/handler.go
```

## 文档

完整文档位于 **[open-codereview.ai/docs](https://open-codereview.ai/docs)**：

- [快速入门](https://open-codereview.ai/docs/quickstart) — 安装并运行你的第一次审查
- [安装](https://open-codereview.ai/docs/installation) — 所有平台和包管理器
- [CLI 参考](https://open-codereview.ai/docs/cli-reference) — 所有命令和标志
- [审查规则](https://open-codereview.ai/docs/review-rules) — 使用路径过滤和定位自定义审查规则
- [配置](https://open-codereview.ai/docs/configuration) — 配置键和环境变量
- [MCP 服务器](https://open-codereview.ai/docs/mcp) — 使用外部工具扩展审查代理
- 编码代理集成 — 选择你使用的平台
  - [Claude Code](plugins/open-code-review/README.md#claude-code) — 安装带有审查斜杠命令的插件
  - [Codex](plugins/open-code-review/README.md#codex) — 安装带有可调用审查技能的插件
  - [Cursor](plugins/open-code-review/README.md#cursor) — 安装带有可移植审查技能的插件
  - [OpenCode](plugins/open-code-review/opencode/README.md) — 安装原生审查工具和斜杠命令
  - [QCA Forward](plugins/open-code-review/qca/README.md) — 使用 QCA 主机模型和可发布模板运行委派模式
  - [兼容技能代理](https://open-codereview.ai/docs/agent-skill) — 安装可移植的代理技能
- 审查执行模式 — 集成后，选择由哪个 LLM 执行审查
  - [默认（OCR 管理）](https://open-codereview.ai/docs/configuration) — OCR 使用其配置的 LLM 运行审查
  - [委派模式](https://open-codereview.ai/docs/delegate) — 你的编码代理使用其自身的 LLM 运行审查；无需 OCR API 密钥
- [CI/CD 集成](https://open-codereview.ai/docs/cicd) — GitHub Actions、GitLab CI、GitFlic CI 和 Gerrit 集成
- [会话查看器](https://open-codereview.ai/docs/viewer) — 在浏览器中浏览和回放审查会话
- [遥测](https://open-codereview.ai/docs/telemetry) — 用于可观测性的 OpenTelemetry 集成
- [常见问题解答](https://open-codereview.ai/docs/faq) — 常见问题和故障排除

## 贡献

这个项目感谢所有贡献者。请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发环境搭建、编码指南以及如何提交 Pull Request。

<a href="https://github.com/alibaba/open-code-review/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=alibaba/open-code-review" />
</a>

## 许可证

[Apache-2.0](LICENSE) — 版权所有 2026 Alibaba