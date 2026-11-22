# QCA 前向集成

此集成在 QCA 前向会话中以委派模式运行开放代码审查。OCR 执行确定性的文件选择和规则解析；QCA 主机模型执行审查。无需 OCR LLM 端点或 API 密钥。

## 资产

- [`template.example.json`](template.example.json) 是一个前向模板示例。发布前请替换技能和环境占位符。
- [`system-prompt.md`](system-prompt.md) 是模板的规范系统提示词。
- [`../../../skills/open-code-review-delegate/SKILL.md`](../../../skills/open-code-review-delegate/SKILL.md) 是要发布并绑定到模板的技能包。

## 运行时要求

模板引用的环境必须提供：

- Git 2.41 或更高版本。
- `PATH` 上兼容的 `ocr` 二进制文件。
- 作为会话工作区的已检出仓库。

对于生产环境，请在运行时镜像中预安装并固定 OCR 版本。在每次会话期间安装最新的 NPM 包会增加网络、启动和兼容性风险。

## 发布流程

1. 将 `skills/open-code-review-delegate` 打包并发布为 QCA 技能。
2. 构建或选择预装了 Git 和 OCR 的环境。
3. 将模板示例中的 `skill_open_code_review_delegate`、`env_code_review` 和 `PIN_AT_PUBLISH_TIME` 替换为真实的资源 ID 和固定的技能/OCR 版本。
4. 创建前向模板，并通过模板或身份配置绑定仓库。
5. 创建新会话并发送工作区、范围或提交审查请求。

模板更新仅影响新会话。保持模板元数据与固定的 OCR、技能和委派模式版本一致。

## 支持的请求

```text
审查当前工作区的更改。
```

```text
将 feature/order-refactor 与 main 进行对比审查。更改必须保持订单状态转换的幂等性。报告中等级及以上的发现。
```

```text
审查提交 abc123。
```

## 执行契约

QCA 代理必须：

1. 使用请求的目标运行 `ocr delegate preview --format json`。
2. 将每个 `reviewable_files` 条目放入明确的检查清单中。
3. 对这些文件运行 `ocr delegate rule --format json`。
4. 按规则和差异大小分组审查有界的批次。
5. 标记每个文件为已审查或已跳过，并附上原因。
6. 报告发现以及总数、已审查数、已跳过数和覆盖率计数。

使用 `(路径, 状态)` 作为检查清单标识。在工作区模式下，暂存的删除后跟未跟踪的重新创建可以合法地产生两个具有相同路径但不同状态的条目。

代理不得运行 `ocr review`、`ocr llm test` 或请求 OCR 模型凭据。

## 验证

- `ocr delegate preview --format json` 返回 `schema_version: "1"`。
- 所有预览的文件都在最终响应中有所说明。
- 写入和编辑被禁用。除非 QCA 运行时应用更严格的命令策略，否则 Bash 只读行为由提示词强制。
- 会话在无 `OCR_LLM_*` 变量的情况下完成。
- 工作区、分支范围和单次提交审查均正常工作。