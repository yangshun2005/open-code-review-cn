---
title: 基于需求的审查
sidebar:
  order: 8
---

将相关的验收标准传给 OCR，除了代码缺陷外，还能检查业务行为。
推荐的工作流是把需求整理成简洁的本地 Markdown 文件，
通过 `--background-file` 传入。

## 每次变更的需求文件

将本次变更所需的信息整理到 `docs/requirements/checkout.md` 等简洁的本地
Markdown 文件中。

```markdown
# Checkout requirements

Scope: src/checkout/**
Review changes against these criteria and cite the requirement ID in findings.

- PAY-1: Reject checkout when the cart is empty.
- PAY-2: Calculate the total on the server; never trust a client-supplied total.
- PAY-3: A repeated idempotency key must not create a second charge.

Out of scope: refunds and subscription billing.
```

完成 OCR 配置并本地存在 `main` 后，在仓库根目录执行。

```bash
ocr review --from main --to HEAD --background-file docs/requirements/checkout.md
```

`--background-file` 会为整个审查提供上下文。相对路径的基准是
**仓库根目录**，即使在子目录中执行也不变。也可以使用绝对路径。
若同时指定了 `--background`，则文件优先，内联文本会被忽略。内容请保持简洁。
清理后的字符数超过 2,000 会警告，超过 8,000 会被拒绝。输入文件须不超过 1 MiB，
且清理后不能为空。

## 内部知识库中的需求

使用内部知识库时，将相关需求、约束和验收标准导出为简洁的本地
Markdown，通过 `--background-file` 传入。仅在 background 正文中写文件名或
远程链接，并不会自动加载该文档或链接目标。
请将标准本身也包含在内，并将指出的内容与规格和测试进行核对。

## 当前限制

OCR 将需求视为单次审查的上下文。目前没有独立于审查规则、将参考文档
关联到模块或目录的专用机制。
因为按路径规则只是为匹配的文件选择适用的规则正文，并非附加参考资料
的机制。待知识库用例成熟后，可另行设计专用支持。

## 相关项目

- [CLI 参考](../cli-reference/)：`ocr review --background-file` 及其他审查标志。
- [审查规则](../review-rules/)：规则层级、按路径规则、规则解析。