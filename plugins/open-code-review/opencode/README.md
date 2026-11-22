# OpenCode 集成

本集成将 OpenCodeReview 以原生工具和斜杠命令的形式暴露在 [OpenCode](https://opencode.ai/) 中。

它注册了：

- `ocr_review` — 审查工作区变更、单个提交或引用范围，返回结构化 JSON 结果。
- `ocr_health` — 显示已安装的 OCR 版本，并测试其配置的 LLM 连接。
- `/ocr-review` 和 `/ocr-health` — 调用上述工具的便捷提示词。

已存在的同名用户命令会被保留。

## 前置条件

先安装并配置 OpenCodeReview：

```bash
npm install -g @alibaba-group/open-code-review
ocr config provider
ocr config model
ocr llm test
```

检查你的 OpenCode 版本（`opencode --version` 对比 `opencode2 --version`），并安装下方对应的依赖。单个插件文件（`open-code-review.ts`）同时服务两个版本：V1 读取其 `server` 入口，V2 读取其 `id` + `setup` 入口（[双插件形式](https://opencode.ai/v2/docs/build/plugins#support-v1)）。V2 API 仅以类型方式导入，因此 OpenCode 1.x 运行时只需 `@opencode-ai/plugin`，而 OpenCode 2.x 需要两个包。

## 全局安装

```bash
mkdir -p ~/.config/opencode/plugins
curl -fsSL \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/opencode/open-code-review.ts \
  -o ~/.config/opencode/plugins/open-code-review.ts
```

然后安装对应版本的运行时依赖（否则服务器日志会显示 `Cannot find package ...`，插件加载失败）：

```bash
cd ~/.config/opencode
npm init -y # 如果 package.json 已存在则跳过
npm install @opencode-ai/plugin # OpenCode 1.x
npm install @opencode-ai/plugin @opencode/plugin@beta # OpenCode 2.x
```

安装后重启 OpenCode。

## 为单个项目安装

在项目根目录运行：

```bash
mkdir -p .opencode/plugins
curl -fsSL \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/opencode/open-code-review.ts \
  -o .opencode/plugins/open-code-review.ts
```

然后按上述方式将对应版本的运行时依赖添加到项目的 `.opencode/package.json`。如果该集成需要与项目共享，请提交插件文件。

## 使用

使用已注册的命令：

```text
/ocr-review current workspace; focus on authentication regressions
/ocr-review compare main to feature/auth-refresh
/ocr-health
```

或直接向 OpenCode 自然提问：

```text
Use ocr_review to review my current changes. The goal is to add rate limiting
without changing the public API.
```

将 `preview` 设为 `true` 可查看会审查哪些文件，而不发起 LLM 请求。

当审查上下文过长无法内联传递时，将其写入 Markdown 文件，并将 `backgroundFile` 设为该路径；相对路径基于仓库根目录解析。不能与 `background` 同时使用。

## 行为与安全

- 审查使用 `--audience agent` 和 JSON 输出。
- 进程通过参数数组和 `shell: false` 启动。
- 后台上下文使用 OCR 经净化的 8,000 字符文件输入，通过私有临时文件传递，在成功、失败、取消或超时后删除。
- 工具驱动的审查默认整体超时 30 分钟，输出上限 10 MiB。
- 取消 OpenCode 工具会终止 OCR 进程（1.x；在 2.x 上工具 API 没有中止信号，因此取消依赖整体超时）。
- OCR 凭据保留在现有的 OCR 配置或环境变量中。
- 工作区模式包含已暂存、未暂存和未跟踪的文件。

## 开发

```bash
cd plugins/open-code-review/opencode
npm install
npm run check
```