---
title: 遥测
sidebar:
  order: 11
---

OCR 内置对 **OpenTelemetry** 的完整支持。每次评审运行都会创建结构化的 Span、指标和事件。接入采集器后，这些数据足以回答"Agent 把时间花在了哪里？""不同模型各花了多少钱？""这次运行为什么失败？"。

## 概述

遥测默认**关闭**。启用后，OCR 会导出：

- **Span** — 三个流水线级 Span（`review.run`、`diff.parse`、`subtask.execute.group.<group-key>`），LLM 请求和工具执行对应的 `llm.request` 和 `tool.execute.<tool-name>` Span，以及决策点每个事件的短生命周期 Span `event.*`。
- **指标** — 聚合计数器与直方图：评审时长、已检查文件数、已生成评论数、LLM 请求数 / Token 数 / 延迟，以及工具调用数 / 延迟。
- **事件** — Span 内的独立事件，例如 `plan.skipped`、`token.threshold.exceeded`、`review.started`。

支持两种导出器：

| 导出器 | 适用场景 |
|---|---|
| `console` | 个人使用 / 调试。以可读格式将 Span 输出到 stdout。 |
| `otlp` | 系统集成。将数据发送到任意兼容 OTLP 的采集器（Jaeger、Tempo、OTel Collector、Datadog Agent 等）。 |

## 启用遥测

与 LLM 端点一样，遥测通过持久化配置或环境变量设置；冲突时环境变量优先。

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
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317   # implies exporter=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc             # default; http/protobuf and http/json
                                                    # are also supported
export OTEL_SERVICE_NAME=open-code-review-prod      # optional; default: open-code-review
export OCR_CONTENT_LOGGING=0                        # reserved / currently a no-op (see Content logging)
```

设置 `OTEL_EXPORTER_OTLP_ENDPOINT` 也会强制 `exporter=otlp`。这对一次性运行很方便，例如 `OTEL_EXPORTER_OTLP_ENDPOINT=… ocr review`。

### 端点格式

端点可以写成简单的 `host:port`，也可以带协议前缀。带协议前缀时，它决定传输安全性：`http://` 使用未加密连接，`https://` 使用 TLS。简单的 `host:port` 使用 TLS。

注意默认端口取决于协议：gRPC 为 `4317`，HTTP 为 `4318`：

```bash
# gRPC (default)
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317

# HTTP
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

对于 HTTP 协议，端点是**基础 URL**，会追加对应信号的路径。因此 `http://localhost:4318` 将追踪发送到 `http://localhost:4318/v1/traces`。基础路径会保留，这对通过特定前缀访问的后端是必需的：

```bash
# traces go to http://collector:3000/api/public/otel/v1/traces
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:3000/api/public/otel
```

gRPC 没有 URL 路径，因此这只适用于 HTTP 协议。

## 导出内容

### Span

一次评审的 Span 示例：

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

每个已检查的**分组**创建一个 `subtask.execute.group.*` Span，而不是每个文件一个：文件在评审前会按语义合并为分组。分组键是该组文件路径排序后用逗号连接（单文件分组就是该文件路径）。

在评审主循环中，LLM 请求和工具执行分别记录为 `llm.request` 和 `tool.execute.<tool-name>` Span。它们的聚合计数和延迟也记录为指标（见下文）。决策点事件创建为短生命周期 Span `event.<name>`，附加到当前上下文。

每个 Span 包含有用的属性：

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

### 指标

OCR 通过 OTel 计量器记录数值指标：计数器和直方图，由采集器聚合：

| 指标 | 类型 | 单位 | 标签 |
|---|---|---|---|
| `ocr.review.duration_seconds` | 直方图 | `s` | — |
| `ocr.files_reviewed_total` | 计数器 | — | — |
| `ocr.comments_generated_total` | 计数器 | — | — |
| `ocr.llm.requests_total` | 计数器 | — | `model`、`status`（`ok` / `error`） |
| `ocr.llm.request_duration_seconds` | 直方图 | `s` | `model` |
| `ocr.llm.tokens_used` | 计数器 | — | `model`、`type`（目前始终为 `total`） |
| `ocr.tool.calls_total` | 计数器 | — | `tool.name`、`status`（`ok` / `error`） |
| `ocr.tool.execution_duration_seconds` | 直方图 | `s` | `tool.name` |

### 事件

在决策点，事件创建为短生命周期 Span `event.<name>`。完整列表：

| 事件 | 含义 |
|---|---|
| `review.started` | 差异已加载；已知待评审文件数。 |
| `no.files.changed` | 解析 diff 后没有剩余文件。 |
| `review.skipped` | 筛选后没有剩余待评审文件；`reason` 为 `too_large`、`deleted` 或 `no_supported_files`。 |
| `grouping.skipped` | 变更集中的文件数少于 `GROUPING_MIN_FILES`，因此跳过了分组调用。`strategy` 为 `bundle_all`（变更量低于 `GROUPING_BUNDLE_LINE_THRESHOLD`，所有文件归为一组）或 `per_file`（达到或超过阈值，每个文件一组）。单文件集始终为 `per_file`——无可拆分，无论阈值如何——且仅在此处报告，终端不显示。 |
| `plan.skipped` | 分组低于两个 plan 阈值：组内最大文件的变更数少于 `PLAN_MODE_LINE_THRESHOLD`，且（对于 2+ 文件的分组）总计少于 `PLAN_MODE_GROUP_LINE_THRESHOLD`。 |
| `plan.failed` | 规划阶段出错；主循环在无计划的情况下启动。 |
| `token.threshold.exceeded` | 提示词 Token 数超过 `MAX_TOKENS`（输入上限）的 80%；该分组被跳过。 |
| `subtask.error` | 某分组的子任务出错；以 Span 状态 `Error` 创建。 |

利用这些事件，可以在用户察觉之前及早发现评审质量下降。

## 内容日志

遥测导出 LLM 流量的**形态**（数量、时长、状态），但**从不**导出提示词或响应本身。OCR 不会将 LLM 消息内容附加到 Span 或事件：进程外只输出上述指标和事件 Schema。

配置键 `content_logging`（及环境变量覆盖 `OCR_CONTENT_LOGGING=1`）会经过配置层，但目前**不**控制任何可能发送提示词内容的代码分支。请将此标志视为保留项。

要查看发送给 LLM 或从 LLM 接收的内容，请使用 [会话查看器](../viewer/) 读取的本地 JSONL 转录。它们仅存储在磁盘 `~/.opencodereview/` 中，从不发送到采集器。

如需更深入的调试，设置 `OCR_RAW_LOGGING=1`：每次 LLM 调用的原始请求和响应体会写入 `~/.opencodereview/raw/`，提供比会话转录更详细的调试信息。默认关闭。启用流式输出时，捕获会先完整读取响应体，再交给后续处理。捕获会遮蔽请求头，但请求体和响应体按原样记录。

## 实践方案

### 本地调试用控制台导出器

```bash
ocr config set telemetry.enabled true
ocr config set telemetry.exporter console
ocr review --commit HEAD
```

Span 以可读格式输出到 stdout。查看长时间运行时将输出管道到 `less`。

### OTel Collector 搭配 Tempo 和 Prometheus

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

然后在 Shell 中执行：

```bash
export OCR_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
ocr review --from main --to feature/branch
```

打开 Tempo → 搜索 `service.name=open-code-review` → 选择任意追踪，查看完整 Span 树。

### Datadog

Datadog Agent 的 OTLP 接收器默认使用 OTLP/gRPC：

```bash
export OCR_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
export OTEL_SERVICE_NAME=open-code-review
```

Span 在 APM 中按服务名显示，LLM 指标在 Metrics 中显示，带有上述标签。

### 在 CI 中运行并将结果发送到监控面板

在流水线步骤中传入环境变量：

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

`OTEL_SERVICE_NAME` 将 CI 追踪与开发者运行区分开。

## 解析优先级

OCR 按以下顺序生成最终遥测配置：

1. 默认值（`enabled=false`、`exporter=console`、无端点）。
2. `~/.opencodereview/config.json` 中的 `telemetry.*` 键。
3. 环境变量（最高优先级，**覆盖**文件）。

因此，可以在配置中保留 `telemetry.enabled=false`，并通过 `OCR_ENABLE_TELEMETRY=1` 为单次运行启用遥测。

## 采样与开销

OCR 导出**全部**数据。没有采样设置：由你的 OTel 采集器负责。一次常规评审运行创建：

- 1 个 `review.run` Span + 1 个 `diff.parse` Span + 每个已检查分组 1 个 `subtask.execute.group.<group-key>` Span（加上其子 Span `plan.execute` / `main.loop` / `review_filter.execute`）+ 每个决策点事件 1 个短生命周期 `event.*` Span，以及 `llm.request` 和 `tool.execute.<tool-name>` Span。
- Span 总数不仅取决于文件数，还取决于分组数、评审轮数、LLM 请求数和工具执行数。

导出是**批量且异步**的，因此遥测不会阻塞评审循环。如果采集器不可用，OCR 记录警告并继续运行；评审仍产生正常输出。

## 故障排查

| 症状 | 可能原因 |
|---|---|
| 没有任何导出 | 未设置 `OCR_ENABLE_TELEMETRY` 变量或 `telemetry.enabled` 参数。遥测默认**关闭**。 |
| OTLP 本地正常，生产环境不正常 | 确认协议与采集器匹配。默认使用 gRPC，而许多托管后端仅通过 HTTP 接受 OTLP：设置 `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` 并使用 HTTP 端口（`4318`，而非 `4317`）。 |
| 数据未到达，也无错误 | 导出器是延迟创建的，因此错误的端点在导出时静默失败，而非启动时。检查采集器访问日志和请求路径：对于 HTTP 协议，端点是基础 URL，会追加信号路径，因此 `http://host:4318` 将数据发送到 `http://host:4318/v1/traces`。 |
| Span 显示但指标不显示 | 某些采集器默认只启用追踪流水线；在配置中添加 `metrics` 流水线。 |
| Span 中没有提示词 | OCR 从不将提示词内容添加到遥测；参见[内容日志](#content-logging)。通过[会话查看器](../viewer/)查看转录。 |

## 另见

- [配置](../configuration/) — `telemetry.*` 命名空间键的完整参考。
- [架构](../architecture/) — 每个 Span 具体测量什么。
- [OpenTelemetry 文档](https://opentelemetry.io/docs/) — 采集器和导出器配置。