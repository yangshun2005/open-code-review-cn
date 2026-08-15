# OpenCode 集成

此集成将 OpenCodeReview 以原生工具和斜杠命令的形式暴露在
[OpenCode](https://opencode.ai/) 中。

它注册了：

- `ocr_review` — 审查工作区更改、单个提交或引用范围，并返回结构化的 JSON 发现结果。
- `ocr_health` — 显示已安装的 OCR 版本并测试其配置的 LLM 连接。
- `/ocr-review` 和 `/ocr-health` — 调用这些工具的便捷提示。

用户已有的同名命令将被保留。

## 前提条件

首先安装并配置 OpenCodeReview：

```bash
npm install -g @alibaba-group/open-code-review
ocr config provider
ocr config model
ocr llm test
```

## 全局安装

```bash
mkdir -p ~/.config/opencode/plugins
curl -fsSL \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/opencode/open-code-review.ts \
  -o ~/.config/opencode/plugins/open-code-review.ts
```

安装后重启 OpenCode。

## 为单个项目安装

在项目根目录下运行以下命令：

```bash
mkdir -p .opencode/plugins
curl -fsSL \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/opencode/open-code-review.ts \
  -o .opencode/plugins/open-code-review.ts
```

如果希望集成与项目共享，请提交插件文件。

## 使用方法

使用已注册的命令：

```text
/ocr-review current workspace; focus on authentication regressions
/ocr-review compare main to feature/auth-refresh
/ocr-health
```

或者自然地询问 OpenCode：

```text
Use ocr_review to review my current changes. The goal is to add rate limiting
without changing the public API.
```

将 `preview` 设置为 `true` 以检查将审查哪些文件，而无需发起 LLM 请求。

## 行为与安全

- 审查使用 `--audience agent` 和 JSON 输出。
- 进程通过参数数组启动，且 `shell: false`。
- 审查有 15 分钟的总体超时和 10 MiB 的输出限制。
- 取消 OpenCode 工具会终止 OCR 进程。
- OCR 凭据保留在现有的 OCR 配置或环境中。
- 工作区模式包括已暂存、未暂存和未跟踪的文件。

## 开发

```bash
cd plugins/open-code-review/opencode
npm install
npm run check
```