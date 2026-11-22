<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.ja-JP.md">日本語</a> | 한국어 | <a href="README.ru-RU.md">Русский</a>
</p>

# Open Code Review (VS Code 扩展)

基于 [`open-code-review`](https://www.npmjs.com/package/@alibaba-group/open-code-review) (`ocr`) CLI 构建的 VS Code 代码审查扩展。通过 Preact WebView 复现原型的用户体验，将 AI 代码审查带入编辑器。可在侧边栏启动审查、实时查看日志，并直接在编辑器中应用/忽略/标记误报每条评论。与侧边栏双向同步。

---

## 功能

- **三种审查模式**：工作区变更、分支比较（`--from` / `--to`）、单次提交（`--commit`）。
- **审查文件预览**：列出当前 Git 状态下变更的文件，点击文件可在默认 diff 视图中查看变更内容。
- **自定义审查提示词**：可为本次审查选择性添加 `--background` 提示。
- **流式日志**：审查过程中实时显示 CLI 输出，可随时取消。
- **结果展示 + 双向同步**：完成后侧边栏显示评论卡片，编辑器中显示 CommentThread。应用/忽略/误报操作在两侧同步。
- **空结果 / 取消 / 失败状态**：无问题、用户取消、CLI 失败各有专用界面（失败可重试，并显示 CLI 返回的实际错误）。
- **配置管理**：可在扩展内查看和编辑 LLM 提供商配置（保存通过 `ocr config set`）。
- **模型切换 / 连接测试**：在状态栏切换模型并测试 LLM 连接。

---

## 前置要求

1. 全局安装 `ocr` CLI：

   ```bash
   npm i -g @alibaba-group/open-code-review
   ```

2. 配置要使用的 LLM（端点、API 密钥、模型）。可直接在 CLI 中配置，或在扩展的设置界面输入：

   ```bash
   ocr config set llm.url https://api.anthropic.com/v1/messages
   ocr config set llm.auth_token sk-...
   ocr config set llm.model claude-opus-4-6
   ocr config set llm.use_anthropic true
   ```

   配置写入 `~/.opencodereview/config.json`。

---

## 开发

### 环境

- Node.js 18 及以上，包管理器为 **Yarn**（仓库包含 `yarn.lock`）。
- VS Code 1.74 及以上。
- 全局可用的 `ocr` CLI（参见上方"前置要求"）。本扩展实质上是 `ocr` 的 GUI 前端。

### 启动开发环境

```bash
cd extensions/vscode
yarn install      # 安装依赖
yarn watch        # 监听模式开发构建（变更时重新构建 out/，推荐）
```

然后在 VS Code 中打开 `extensions/vscode` 文件夹，按 **F5** 启动 Extension Development Host（调试配置位于 `.vscode/launch.json`）。在新窗口中打开有 Git 变更的项目，活动栏会出现 Open Code Review 图标，即可开始审查。

> 修改代码后：WebView 变更需在开发宿主窗口中**重新打开侧边栏**才能生效（也可执行 `Developer: Reload Webviews`）。Extension Host 变更需**重启调试会话**（调试工具栏的 ⟳ 按钮或宿主窗口中 `Cmd+R`）。

### 脚本

```bash
yarn compile      # 一次性开发构建（webpack development）
yarn watch        # 监听模式开发构建
yarn build        # 生产构建（webpack production，打包前自动执行）
yarn test         # 运行 Jest 单元测试
yarn lint         # ESLint
yarn package      # 生成分发用 .vsix（参见"创建发布包"）
```

### 调试要点

- **双向消息**：WebView 与 Extension Host 通过 `postMessage` 通信，消息类型定义在 `extensions/frontend/src/shared/messages.ts`。两侧均经过 `dispatch` / `handle`，调试从这里入手。
- **CLI 调用**：所有 `ocr` 子命令通过 `src/extension/services/CliService.ts` 的 `child_process.spawn` 执行。`runRaw` 在 CLI 退出码非 0 时 reject，并包含 stderr 中的 `Error:` 文本，有助于诊断"审查失败/连接失败"。
- **配置读写**：`ConfigService` 读取 `~/.opencodereview/config.json`，写入委托给 `ocr config set`。WebView 字段为 camelCase（如 `useAnthropic`），磁盘/CLI 侧为 snake_case（如 `use_anthropic`），转换逻辑位于 `src/extension/services/configParse.ts`。

---

## 构建

### 仅编译产物

```bash
yarn build        # 生产构建（webpack production）
```

产物：`out/extension.js`（Extension Host）+ `out/webview.js`（WebView SPA）。

### 创建发布包（.vsix）

```bash
yarn package      # = vsce package --no-yarn
```

该命令执行以下操作：

1. 运行 `vscode:prepublish` 执行 `yarn build` 生产构建；
2. 根据 `.vscodeignore` 排除源码、测试和开发文件；
3. 在当前目录生成 `open-code-review-vscode-<version>.vsix`。

> 打包工具为作为 devDependency 安装的 `@vscode/vsce`，无需全局安装或网络下载。`--no-yarn` 跳过 vsce 默认的 npm 依赖树检查（本项目使用 Yarn）。

发布包仅包含运行所需文件：`package.json`、`README.md`、`resources/icon.svg`、`out/extension.js`、`out/webview.js`。

### 本地安装 / 验证

```bash
code --install-extension open-code-review-vscode-<version>.vsix
```

或在 VS Code 中：扩展面板 → 右上角 `⋯` → **Install from VSIX…** → 选择生成的 `.vsix` 文件。

> 发布到 Marketplace 请使用 `vsce publish`（需要 publisher 账号和 PAT）。日常分发使用上述 `.vsix` 即可。

---

## 架构

采用 **Monolithic WebView + Thin Extension Host** 结构：

- **WebView** 是独立构建的 Preact SPA，从共享前端 `extensions/frontend/` 构建（与 IntelliJ IDEA 插件共享）。
- **Extension Host** 层保持轻薄，仅负责 CLI 调用、文件系统、Git 操作和编辑器评论。
- 两层通过 `postMessage` 通信，并通过 `extensions/frontend/src/shared/` 中的共享 TypeScript 类型保证类型安全。

```
src/
└── extension/          Extension Host(Node.js): services / providers / commands
```

WebView 和共享类型从共享前端 `extensions/frontend/` 构建（与 IntelliJ IDEA 插件共享）。

---

## License

Apache-2.0