---
title: 结合需求进行评审
sidebar:
  order: 8
---

将变更的验收标准传给 OCR，让它同时检查业务逻辑和代码缺陷。推荐的工作流是把需求保存到本地 Markdown 文件，再通过 `--background-file` 传入。

## 变更的需求文件

针对单个变更，准备一份简短的本地 Markdown，例如 `docs/requirements/checkout.md`：

```markdown
# Checkout requirements

Scope: src/checkout/**
Review changes against these criteria and cite the requirement ID in findings.

- PAY-1: Reject checkout when the cart is empty.
- PAY-2: Calculate the total on the server; never trust a client-supplied total.
- PAY-3: A repeated idempotency key must not create a second charge.

Out of scope: refunds and subscription billing.
```

配置好 OCR，确认 `main` 在本地可用，然后在仓库根目录执行：

```bash
ocr review --from main --to HEAD --background-file docs/requirements/checkout.md
```

`--background-file` 为整个评审提供上下文。相对路径从**仓库根目录**算起，即使从子目录启动 OCR 也是如此；也支持绝对路径。如果同时指定了 `--background`，文件优先，标志中的文本会被忽略。请精简上下文：清理内容后，OCR 在超过 2 000 字符时发出警告，超过 8 000 字符则拒绝。输入文件不得超过 1 MiB，清理后不得为空。

## 来自内部知识库的需求

对于内部知识库，把所需的需求、约束和验收标准导出为简短的本地 Markdown，再通过 `--background-file` 传入。仅在 background 文本中提及文件名或远程链接，并不会加载文档，也不会自动打开其中的链接。请把标准本身包含进来，并将评审意见与规格和测试对照。

## 限制

OCR 将需求视为单次评审的上下文。目前没有专门的方式将参考文档与模块或目录关联，且独立于评审规则：按路径匹配的规则为匹配的文件选择规则文本，因此不是附加参考材料的机制。如果知识库的使用场景成熟，可以为其设计单独的支持。

## 另请参阅

- [CLI 参考](../cli-reference/) — `ocr review --background-file` 及其他评审标志。
- [评审规则](../review-rules/) — 规则层级、按路径匹配的规则以及规则解析。