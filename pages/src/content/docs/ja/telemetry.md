---
title: 遥测
sidebar:
  order: 11
---

OCR 内置对 **OpenTelemetry** 的一流支持。每次评审运行都会生成结构化的 span、metric 和 event。接入 collector 后，这些数据足以回答"agent 把时间花在哪里了？"、"各模型的成本如何？"、"这次运行为什么失败？"。

## 概述

遥测**默认关闭**。启用后，OCR 会导出：

- **Span**——三个流水线级别的 span（`review.run`、`diff.parse`、`subtask.execute.group.<group-key>`）、LLM 请求 span（`llm.request`）、工具执行 span（`tool.execute.<tool-name>`），以及决策点的短生命周期 `event.*` span。
- **Metric**——评审耗时、评审文件数、生成评论数、LLM 请求 / token / 延迟，以及工具调用 / 延迟的聚合计数与直方图。
- **Event**——span 内的离散事件，如 `plan.skipped`、`token.threshold.exceeded`、`review.started` 等。

支持两种 exporter：

| Exporter | 适用场景 |
|---|---|
| `console` | 个人使用 / 调试。将 span 格式化后输出到 stdout。 |
| `otlp` | 系统集成。发送到任意 OTLP 兼容 collector（Jaeger、Tempo、OTel Collector、Datadog Agent……）。 |

## 启用遥测

与 LLM 端点一样，遥测可通过持久化 config 或环境变量配置——两者冲突时环境变量优先。

### 通过配置文件

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

### 通过环境变量

```bash
export OCR_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317   # implies exporter=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc             # default; http/protobuf and http/json
                                                    # are also supported
export OTEL_SERVICE_NAME=open-code-review-prod      # optional; default: open-code-review
export OCR_CONTENT_LOGGING=0                        # reserved / currently a no-op (see Content logging)
```

设置 `OTEL_EXPORTER_OTLP_ENDPOINT` 也会强制 `exporter=otlp`——适合一次性的 `OTEL_EXPORTER_OTLP_ENDPOINT=… ocr review` 运行。

## 导出内容

### Span

一次评审的 span 树示例：

```
review.run
├── diff.parse
├── event.review.started                   (decision-point event)
├── event.grouping.skipped                 (when the change set is below the grouping thresholds)
├── subtask.execute.group.<group-key1>
│   ├── event.plan.skipped                 (when changes are below both thresholds)
│   ├── event.plan.failed                  (when plan phase errored)
│   ├── event.token.threshold.exceeded     (when prompt > 80% of max_tokens)
│   ├── main.loop                          (one span per review round)
│   │   ├── llm.request
│   │   └── tool.execute.<tool-name>
│   └── event.subtask.error                (when the subtask errored)
├── subtask.execute.group.<group-key2>
└── …
```

`subtask.execute.group.*` span 按评审的**分组**各发一个，而非按文件——文件在评审前会按语义分组。分组键是该组文件路径排序后用逗号拼接的结果（分组只有一个文件时即为该路径）。

主评审循环中的 LLM 请求和工具执行分别生成 `llm.request` 和 `tool.execute.<tool-name>` span，聚合计数与延迟也会记录到 metric（见下文）。决策点事件以短生命周期 `event.<name>` span 的形式附加到当前 context。

各 span 携带的有用属性：

| Span | 主要属性 |
|---|---|
| `review.run` | `error`（运行失败时设置） |
| `diff.parse` | `files.changed`、`lines.inserted`、`lines.deleted` |
| `subtask.execute.group.<group-key>` | `group.label`、`group.file_count`、`lines.changed`、`lines.changed.max_file` |
| `main.loop` | `group.label`、`round` |
| `llm.request` | `llm.model`、`llm.duration_ms`、`llm.total_tokens`、`llm.status` |
| `tool.execute.<tool-name>` | `tool.name`、`tool.duration_ms`、`tool.status` |
| `event.review.started` | `file.count`、`review.count`、`repo.dir` |
| `event.review.skipped` | `reason`（`too_large` / `deleted` / `no_supported_files`）、`file.count`、`too_large.count` |
| `event.grouping.skipped` | `strategy`、`file.count`、`lines.changed`、`threshold.files`、`threshold.lines` |
| `event.plan.skipped` | `group.label`、`group.file_count`、`lines.changed`、`lines.changed.max_file`、`threshold`、`threshold.group` |
| `event.plan.failed` | `group.label`、`message` |
| `event.token.threshold.exceeded` | `group.label`、`tokens`、`max_tokens`、`round` |
| `event.subtask.error` | `group.label`、`error` |

### Metric

OCR 通过 OTel meter 记录数值 metric——计数与直方图，由 collector 在下游聚合：

| Metric | 类型 | 单位 | 标签 |
|---|---|---|---|
| `ocr.review.duration_seconds` | histogram | `s` | — |
| `ocr.files_reviewed_total` | counter | — | — |
| `ocr.comments_generated_total` | counter | — | — |
| `ocr.llm.requests_total` | counter | — | `model`、`status`（`ok` / `error`） |
| `ocr.llm.request_duration_seconds` | histogram | `s` | `model` |
| `ocr.llm.tokens_used` | counter | — | `model`、`type`（当前始终为 `total`） |
| `ocr.tool.calls_total` | counter | — | `tool.name`、`status`（`ok` / `error`） |
| `ocr.tool.execution_duration_seconds` | histogram | `s` | `tool.name` |

### Event

事件在决策点以短生命周期 `event.<name>` span 的形式触发。完整列表：

| 事件 | 含义 |
|---|---|
| `review.started` | diff 已加载，已确定要评审多少文件。 |
| `no.files.changed` | diff 解析结果为 0 个文件。 |
| `review.skipped` | 筛选后没有剩余待评审对象。`reason` 为 `too_large`、`deleted`、`no_supported_files` 之一。 |
| `grouping.skipped` | 变更集文件数低于 `GROUPING_MIN_FILES`，跳过分组调用。`strategy` 为 `bundle_all`（变更行数低于 `GROUPING_BUNDLE_LINE_THRESHOLD`，所有文件归为一组）或 `per_file`（达到阈值，每文件一组）。单文件变更集始终为 `per_file`——无论阈值如何都无可拆分——仅在此处上报，不输出到终端。 |
| `plan.skipped` | 某分组同时低于两个 plan 阈值：组内最大文件的变更行数低于 `PLAN_MODE_LINE_THRESHOLD`，且（2 个文件以上的分组）合计低于 `PLAN_MODE_GROUP_LINE_THRESHOLD`。 |
| `plan.failed` | plan 阶段出错。主循环将在无 plan 的情况下运行。 |
| `token.threshold.exceeded` | prompt token 超过 `MAX_TOKENS`（输入上限）的 80%。该分组被跳过。 |
| `subtask.error` | 某分组的子任务出错——以 `Error` span 状态发出。 |

借此可在用户察觉之前，提前检测并告警评审质量下降。

## 内容日志

遥测导出 LLM 流量的**形状**（计数、耗时、状态），但**绝不**导出实际的 prompt 或响应。OCR 不会尝试将 LLM 消息内容附加到 span 或 event——离开进程的数据仅限于上述 metric / event schema，别无其他。

`content_logging` 配置键（及 `OCR_CONTENT_LOGGING=1` 环境变量覆盖）已接入配置层，但当前**不控制**任何发出 prompt 内容的代码路径。请将该标志视为预留。

如需检查发送给 LLM 或由 LLM 返回的内容，请使用[会话查看器](../viewer/)读取的本地 JSONL 转录。它们完全位于 `~/.opencodereview/` 下的磁盘上，绝不会发送到 collector。

如需更详细的调试，可设置 `OCR_RAW_LOGGING=1`，将所有 LLM 调用的原始请求和响应记录到 `~/.opencodereview/raw/`，获得比会话转录更详细的调试信息。默认关闭。启用流式输出时，捕获会在读完整个响应后再交给后续处理。捕获会隐藏请求头，但请求和响应正文按原样记录。

## 示例

### 本地调试用 console exporter

```bash
ocr config set telemetry.enabled true
ocr config set telemetry.exporter console
ocr review --commit HEAD
```

span 以人类可读格式输出到 stdout。可将长运行的输出通过管道传给 `less` 查看。

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

打开 Tempo → 按 `service.name=open-code-review` 搜索 → 点击任意 trace 查看完整 span 树。

### Datadog

Datadog Agent 的 OTLP receiver 默认使用 OTLP/gRPC：

```bash
export OCR_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
export OTEL_SERVICE_NAME=open-code-review
```

span 会以该 service name 出现在 APM 下。LLM metric 会带上述标签出现在 Metrics 下。

### CI 运行，将结果送入仪表盘

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

通过 `OTEL_SERVICE_NAME` 可区分 CI 的 trace 与手动开发运行的 trace。

## 解析优先级

OCR 构建最终遥测配置时：

1. 默认值（`enabled=false`、`exporter=console`、无 endpoint）。
2. `~/.opencodereview/config.json` 中的 `telemetry.*` 键。
3. 环境变量（最高优先级，**覆盖**文件）。

因此，可保持 config 中 `telemetry.enabled=false`，而在每次运行时通过 `OCR_ENABLE_TELEMETRY=1` 启用。

## 采样与开销

OCR 导出**全部**数据，没有采样配置。OTel 的采样由 collector 负责。典型评审运行：

- 一个 `review.run` span + 一个 `diff.parse` span + 每个评审分组一个 `subtask.execute.group.<group-key>` span（及其子 span `plan.execute` / `main.loop` / `review_filter.execute`）+ 每个决策点事件一个短生命周期 `event.*` span，以及 `llm.request` 和 `tool.execute.<tool-name>` span。
- span 总数取决于评审分组数、评审轮数、LLM 请求数和工具执行数，而非仅由文件数决定。

导出是**批量且异步**的——遥测不会阻塞评审循环。无法连接 collector 时，OCR 会记录警告并继续，评审仍照常产生输出。

## 故障排查

| 症状 | 可能原因 |
|---|---|
| 没有任何导出 | `OCR_ENABLE_TELEMETRY` / `telemetry.enabled` 未设置。默认**关闭**。 |
| OTLP 本地可用但生产失败 | OCR 当前仅实现 OTLP/gRPC——`OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`（或 `http/json`）会被接受但未接入，切换无效。请检查 endpoint 及 collector 是否监听 gRPC。 |
| 有 span 但无 metric | 部分 collector 默认仅启用 traces pipeline。请在配置中添加 `metrics` pipeline。 |
| span 中没有 prompt | OCR 绝不将 prompt 内容附加到遥测——参见[内容日志](#content-logging)。请改用[会话查看器](../viewer/)检查转录。 |

## 相关

- [配置](../configuration/)——`telemetry.*` 命名空间的完整键参考。
- [架构](../architecture/)——各 span 实际度量什么。
- [OpenTelemetry 文档](https://opentelemetry.io/docs/)——collector 设置与 exporter。