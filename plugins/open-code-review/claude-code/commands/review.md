---
description: 运行 OpenCodeReview (OCR) 审查代码变更并自主应用修复。
---

调用专业代码审查 Agent CLI 工具 OpenCodeReview (OCR) 审查当前代码变更，由 Agent 自主决定是否应用修复。

## 工作流

### 第 1 步：运行代码审查

运行 OCR 命令：

```bash
ocr review --audience agent [user-args]
```
- 默认（无用户参数）：审查已暂存、未暂存和未跟踪的变更（工作区模式）。
- 若用户提供 `--commit` 或 `--c`：原样透传。
- 若用户提供 `--from` 和 `--to`：原样透传。
- （可选）提供 `--background "需求上下文"`，审查需求是否被正确实现。
- （可选）提供 `--background-file ./requirements.md`，从 Markdown 文件加载相同上下文（经过清理，限制 8000 字符）。两者同时设置时，优先于 `--background`。
- 捕获完整 stdout。设置 5 分钟超时。
- 若找不到 `ocr` 命令，运行 `npm i -g @alibaba-group/open-code-review` 安装。

### 第 2 步：筛选与评估

对每条评论评估其有效性和质量：

- **高**：明显的 bug、安全问题、明确的错误，或有充分依据且修复方案精确的建议
- **中**：合理的疑虑但依赖上下文、风格/性能建议，或需手动实施的修复
- **低**：很可能是误报、缺少足够上下文、吹毛求疵或无意义的建议

静默丢弃低置信度评论。展示其余评论。

### 第 3 步：修复

自动修复值得采纳的问题和建议。