---
title: 遥测
sidebar:
  order: 11
---

OCR 内置了**OpenTelemetry** 的一等支持。每次审查运行都会生成结构化的 span、指标和事件。连接到 collector 后，这些数据足以回答“agent 的时间花在哪里？”、“每个模型的成本如何？”以及“为什么这次运行失败了？”等问题。

## 概述

遥测**默认禁用**。启用后，OCR 将导出以下内容：

- **Span**——3 个管道级别的 span（`review.run`、`diff.parse`、`subtask.execute.<file>`），外加每个决策点事件对应的一个短生命周期 `event.*` span。
- **指标**——审查耗时、审查文件数、生成的评论数、LLM 请求/令牌/延迟、工具调用/延迟的聚合计数和直方图。
- **事件**——span 内的离散事件，例如 `plan.skipped`、`token.threshold.exceeded`、`review.started` 等。

支持两种导出器：

| 导出器 | 使用场景 |
|---|---|
| `console` | 个人使用/调试。将 span 格式化后输出到 stdout。 |
| `otlp` | 系统集成。发送到任何兼容 OTLP 的 collector（Jaeger、Tempo、OTel Collector、Datadog Agent……）。 |

## 启用遥测

与 LLM 端点类似，遥测可以通过持久化配置或环境变量进行设置——如果发生冲突，环境变量优先。

### 通过配置文件设置

```bash
ocr config set telemetry.enabled        true
ocr config set telemetry.exporter       otlp
ocr config set telemetry.otlp_endpoint  localhost:4317
ocr config set telemetry.content_logging false
```

`~/.opencodereview/config.json` 中的结果：

```json
{
  "telemetry": {
    "enabled": true,
    "exporter": "otlp",
    "otlp_endpoint": "localhost:4317",
    "content_logging": false
  }
}
```

### 通过环境变量设置

```bash
export OCR_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317   # 隐含 exporter=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc             # 默认；也支持 http/protobuf 和 http/json
export OTEL_SERVICE_NAME=open-code-review-prod      # 可选；默认：open-code-review
export OCR_CONTENT_LOGGING=0                        # 保留 / 当前为 no-op（参见内容日志）
```

设置 `OTEL_EXPORTER_OTLP_ENDPOINT` 也会强制 `exporter=otlp`——适用于一次性的 `OTEL_EXPORTER_OTLP_ENDPOINT=… ocr review` 运行。

## 导出的内容

### Span

单次审查的完整 span 树：

```
review.run
├── diff.parse
├── event.review.started                   (决策点事件)
├── subtask.execute.<file1>
│   ├── event.plan.skipped                 (当变更低于阈值时)
│   ├── event.plan.failed                  (当计划阶段出错时)
│   ├── event.token.threshold.exceeded     (当提示词 > max_tokens 的 80% 时)
│   └── event.subtask.error                (当子任务出错时)
├── subtask.execute.<file2>
└── …
```

LLM 往返和工具执行**不会**作为单独的 span 发出——它们仅出现在指标中（见下文）。决策点事件作为短生命周期的 `event.<name>` span 附加到当前上下文。

每个 span 都携带有用的属性：

| Span | 主要属性 |
|---|---|
| `review.run` | `error`（运行失败时设置） |
| `diff.parse` | `files.changed`、`lines.inserted`、`lines.deleted` |
| `subtask.execute.<file>` | `file.path`、`lines.changed`、`lines.inserted`、`lines.deleted` |
| `event.review.started` | `file.count`、`review.count`、`repo.dir` |
| `event.plan.skipped` | `file.path`、`lines.changed`、`threshold` |
| `event.plan.failed` | `file.path`、`message` |
| `event.token.threshold.exceeded` | `file.path`、`tokens`、`max_tokens` |
| `event.subtask.error` | `file.path`、`error` |

### 指标

OCR 通过 OTel meter 记录数值指标——以计数和直方图的形式，由 collector 在下游进行聚合：

| 指标 | 类型 | 单位 | 标签 |
|---|---|---|---|
| `ocr.review.duration_seconds` | histogram | `s` | — |
| `ocr.files_reviewed_total` | counter | — | — |
| `ocr.comments_generated_total` | counter | — | — |
| `ocr.llm.requests_total` | counter | — | `model`、`status`（`ok` / `error`） |
| `ocr.llm.request_duration_seconds` | histogram | `s` | `model` |
| `ocr.llm.tokens_used` | counter | — | `model`、`type`（目前始终为 `total`） |
| `ocr.tool.calls_total` | counter | — | `tool.name`、`status`（`ok` / `error`） |
| `ocr.tool.execution_duration_seconds` | histogram | `s` | `tool.name` |

### 事件

事件在决策点作为短生命周期的 `event.<name>` span 触发。完整列表：

| 事件 | 含义 |
|---|---|
| `review.started` | diff 已加载。已确定要审查哪些文件。 |
| `no.files.changed` | diff 解析结果为 0 个文件。 |
| `plan.skipped` | 某个文件低于 `PLAN_MODE_LINE_THRESHOLD`。 |
| `plan.failed` | 计划阶段出错。主循环在没有计划的情况下运行。 |
| `token.threshold.exceeded` | 初始提示词令牌超过 `MAX_TOKENS` 的 80%。该文件被跳过。 |
| `subtask.error` | 某个文件级子任务出错——作为 `Error` span 状态发出。 |

这使得可以在用户注意到之前，及早检测并告警审查质量的下降。

## 内容日志

遥测导出 LLM 流量的**形态**（计数、耗时、状态），但**绝不**导出实际的提示词或响应。OCR 不会尝试将 LLM 消息内容附加到 span 或事件中——离开进程的数据仅限于上述描述的指标/事件 schema，除此之外别无其他。

`content_logging` 配置键（以及 `OCR_CONTENT_LOGGING=1` 的环境变量覆盖）已连接到配置层，但目前**不控制**任何发出提示词内容的代码路径。请将此标志视为保留项。

如果需要检查发送给 LLM 或从 LLM 返回的内容，请使用[会话查看器](../viewer/)读取的本地 JSONL 转录文件。这些文件完全存在于 `~/.opencodereview/` 下的磁盘上，绝不会发送到 collector。

## 使用示例

### 本地调试的 console 导出器

```bash
ocr config set telemetry.enabled true
ocr config set telemetry.exporter console
ocr review --commit HEAD
```

span 以人类可读的格式输出到 stdout。可以将输出通过管道传递给 `less` 以查看长时间运行的输出。

### OTel Collector + Tempo + Prometheus

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols: { grpc: { endpoint: 0.0.0.0:4317 } }

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: true }
  prometheus:
    endpoint: 0.0.0.0:9464

service:
  pipelines:
    traces:  { receivers: [otlp], exporters: [otlp/tempo] }
    metrics: { receivers: [otlp], exporters: [prometheus] }
```

然后在 shell 中：

```bash
export OCR_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
ocr review --from main --to feature/branch
```

打开 Tempo → 搜索 `service.name=open-code-review` → 点击任意 trace 以查看完整的 span 树。

### Datadog

Datadog Agent 的 OTLP receiver 默认使用 OTLP/gRPC：

```bash
export OCR_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
export OTEL_SERVICE_NAME=open-code-review
```

span 将以此服务名出现在 APM 下。LLM 指标将带有上述标签出现在 Metrics 下。

### CI 运行，结果发送到仪表板

在流水线步骤中注入环境变量：

```yaml
- name: Code review
  env:
    OCR_LLM_URL: ${{ secrets.OCR_LLM_URL }}
    OCR_LLM_TOKEN: ${{ secrets.OCR_LLM_TOKEN }}
    OCR_LLM_MODEL: claude-opus-4-6
    OCR_ENABLE_TELEMETRY: "1"
    OTEL_EXPORTER_OTLP_ENDPOINT: ${{ vars.OTEL_COLLECTOR_URL }}
    OTEL_SERVICE_NAME: open-code-review-ci
  run: ocr review --from origin/main --to HEAD --audience agent
```

`OTEL_SERVICE_NAME` 使您可以将 CI 的 trace 与手动开发运行的 trace 区分开来。

## 解析优先级

当 OCR 构建最终遥测配置时：

1. 默认值（`enabled=false`、`exporter=console`、无 endpoint）。
2. `~/.opencodereview/config.json` 中的 `telemetry.*` 键。
3. 环境变量（最高优先级，**覆盖**文件）。

因此，您可以在配置中保留 `telemetry.enabled=false`，同时通过 `OCR_ENABLE_TELEMETRY=1` 按运行启用。

## 采样与开销

OCR 导出**所有**内容。没有采样设置。OTel 采样是 collector 的职责。对于典型的审查运行：

- 1 个 `review.run` span + 1 个 `diff.parse` span + 每个被审查文件 1 个 `subtask.execute.<file>` span + 每个决策点事件 1 个短生命周期 `event.*` span。
- 对于 10 个文件的 PR，总计约 15-25 个 span。LLM 往返和工具调用会增加指标计数，但不会创建额外的 span。

导出是**批处理且异步**的——遥测不会阻塞审查循环。如果无法到达 collector，OCR 会记录警告并继续。审查仍会正常生成输出。

## 故障排除

| 症状 | 可能的原因 |
|---|---|
| 未导出任何内容 | `OCR_ENABLE_TELEMETRY` / `telemetry.enabled` 未设置。默认**禁用**。 |
| OTLP 在本地工作但在生产环境失败 | OCR 目前仅实现 OTLP/gRPC——`OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`（或 `http/json`）会被接受但未连接，切换无效。检查 endpoint 以及 collector 是否在监听 gRPC。 |
| 显示 span 但没有指标 | 某些 collector 默认仅启用 traces 管道。在配置中添加 `metrics` 管道。 |
| span 中没有提示词 | OCR 绝不会将提示词内容附加到遥测中——参见[内容日志](#content-logging)。请改用[会话查看器](../viewer/)检查转录文件。 |

## 相关页面

- [配置](../configuration/)——`telemetry.*` 命名空间的完整键参考。
- [架构](../architecture/)——每个 span 实际测量什么。
- [OpenTelemetry 文档](https://opentelemetry.io/docs/)——collector 设置和导出器。