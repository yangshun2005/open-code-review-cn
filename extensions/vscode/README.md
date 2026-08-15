<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a>
</p>

# Open Code Review（VS Code 扩展）

一个基于 [`open-code-review`](https://www.npmjs.com/package/@alibaba-group/open-code-review)（`ocr`）CLI 构建的 VS Code 代码审查扩展。它通过 Preact WebView 重现了原型体验，并将 AI 代码审查带入编辑器：从侧边栏开始审查、实时流式查看日志，并对每条评论进行应用 / 忽略 / 标记为误报——与侧边栏双向同步。

---

## 功能特性

- **三种审查模式**：工作区更改、分支比较（`--from` / `--to`）以及单个提交（`--commit`）。
- **待审查文件预览**：列出当前 Git 状态下的已更改文件；点击文件可在原生差异视图中查看其更改。
- **自定义审查提示词**：可选择为当前审查附加 `--background` 提示。
- **流式日志**：审查期间实时跟踪 CLI 输出，可随时取消。
- **结果 + 双向同步**：完成后，评论卡片显示在侧边栏中，同时 CommentThreads 在编辑器中渲染；应用 / 忽略 / 误报操作在两侧保持同步。
- **空 / 已取消 / 失败状态**：针对无问题、用户取消和 CLI 失败（失败可重试，并显示 CLI 返回的真实错误）提供专用视图。
- **配置管理**：在扩展内查看 / 编辑 LLM 提供商配置（通过 `ocr config set` 持久化）。
- **模型切换 / 连通性测试**：从状态栏切换模型并测试与 LLM 的连通性。

---

## 前提条件

1. 全局安装 `ocr` CLI：

   ```bash
   npm i -g @alibaba-group/open-code-review
   ```

2. 配置可用的 LLM（端点、API 密钥、模型）。可直接通过 CLI 配置，或在扩展的配置视图中配置：

   ```bash
   ocr config set llm.url https://api.anthropic.com/v1/messages
   ocr config set llm.auth_token sk-...
   ocr config set llm.model claude-opus-4-6
   ocr config set llm.use_anthropic true
   ```

   配置写入 `~/.opencodereview/config.json`。

---

## 开发

### 环境要求

- Node.js ≥ 18，使用 **Yarn** 作为包管理器（仓库附带 `yarn.lock`）。
- VS Code ≥ 1.74。
- 全局可用的 `ocr` CLI（见上方“前提条件”）——该扩展本质上是 `ocr` 的 GUI 前端。

### 启动开发环境

```bash
cd extensions/vscode
yarn install      # 安装依赖
yarn watch        # 监听模式开发构建（推荐：更改时重新构建 out/）
```

然后在 VS Code 中打开 `extensions/vscode` 文件夹，按 **F5** 启动扩展开发主机（调试配置在 `.vscode/launch.json` 中提供）。在新窗口中，打开一个包含 Git 更改的项目——你会在活动栏中看到 Open Code Review 图标，并可以开始审查。

> 编辑代码后：WebView 更改需要**重新打开侧边栏**（在开发主机窗口中，或运行 `Developer: Reload Webviews`）；扩展主机更改需要**重启调试会话**（调试工具栏上的 ⟳ 按钮，或主机窗口中的 `Cmd+R`）。

### 脚本

```bash
yarn compile      # 一次性开发构建（webpack 开发模式）
yarn watch        # 监听模式开发构建
yarn build        # 生产构建（webpack 生产模式；打包前自动运行）
yarn test         # 运行 Jest 单元测试
yarn lint         # ESLint
yarn package      # 生成可分发的 .vsix 包（见“构建发布包”）
```

### 调试说明

- **双向消息传递**：WebView 和扩展主机通过 `postMessage` 通信；消息类型定义在 `src/shared/messages.ts` 中。两侧都通过 `dispatch` / `handle` 路由——调试时从这些地方入手。
- **CLI 调用**：所有 `ocr` 子命令均通过 `src/extension/services/CliService.ts` 中的 `child_process.spawn` 运行。`runRaw` 在 CLI 退出码非零时拒绝，并包含 stderr 中的 `Error:` 文本，有助于诊断“审查失败 / 连接失败”。
- **配置读写**：`ConfigService` 读取 `~/.opencodereview/config.json`，并将写入操作委托给 `ocr config set`。WebView 字段使用驼峰命名（例如 `useAnthropic`），而磁盘/CLI 侧使用蛇形命名（例如 `use_anthropic`）；转换逻辑位于 `src/extension/services/configParse.ts`。

---

## 构建

### 仅编译产物

```bash
yarn build        # 生产构建（webpack 生产模式）
```

产物：`out/extension.js`（扩展主机）+ `out/webview.js`（WebView SPA）。

### 构建发布包（.vsix）

```bash
yarn package      # = vsce package --no-yarn
```

此命令：

1. 触发 `vscode:prepublish` → 运行 `yarn build` 生产构建；
2. 根据 `.vscodeignore` 排除源代码、测试和开发文件；
3. 在当前目录生成 `open-code-review-vscode-<version>.vsix`。

> 打包工具为 `@vscode/vsce`，作为 devDependency 安装——无需全局安装或网络下载。`--no-yarn` 跳过 vsce 默认的 npm 依赖树检查（本项目使用 Yarn）。

发布包仅包含运行时必需文件：`package.json`、`README.md`、`resources/icon.svg`、`out/extension.js`、`out/webview.js`。

### 本地安装 / 验证

```bash
code --install-extension open-code-review-vscode-<version>.vsix
```

或在 VS Code 中：扩展面板 → 右上角 `⋯` → **从 VSIX 安装…** → 选择生成的 `.vsix` 文件。

> 要发布到 Marketplace，请改用 `vsce publish`（需要发布者账户和 PAT）；日常分发使用上述 `.vsix` 即可。

---

## 架构

采用**单体 WebView + 精简扩展主机**设计：

- **WebView** 是独立构建的 Preact SPA，重现了完整的视觉和交互原型。
- **扩展主机**层非常精简，仅处理 CLI 调用、文件系统、Git 操作和编辑器评论。
- 两者通过 `postMessage` 通信，共享类型定义在 `src/shared/` 中以保证类型安全。

```
src/
├── extension/      扩展主机（Node.js）：服务 / 提供者 / 命令
├── webview/        WebView SPA（Preact）：视图 / 组件 / 状态管理 / 桥接
└── shared/         共享类型和 postMessage 协议（无 vscode 依赖）
```

---

## 许可证

Apache-2.0