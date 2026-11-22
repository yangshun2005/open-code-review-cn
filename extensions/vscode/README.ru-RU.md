<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.ko-KR.md">한국어</a> | Русский
</p>

# Open Code Review（VS Code 扩展）

基于 CLI [`open-code-review`](https://www.npmjs.com/package/@alibaba-group/open-code-review)（`ocr`）构建的 VS Code 代码审查扩展。它复现了 Preact WebView 原型的交互，将 AI 代码审查带入编辑器：从侧边栏发起审查、实时查看日志，并在编辑器中直接应用、拒绝或将每条评论标记为误报——两侧双向同步。

---

## 功能

- **三种审查模式**：工作区更改、分支对比（`--from` / `--to`）和单个提交（`--commit`）。
- **待审查文件预览**：按当前 Git 状态列出变更文件；点击文件可在标准 diff 视图中查看更改。
- **自定义审查提示词**：可按需为当前审查添加 `--background` 提示。
- **实时日志**：审查过程中实时输出 CLI 日志，可随时取消。
- **结果与双向同步**：完成后侧边栏显示评论卡片，编辑器中显示 CommentThread；“应用” / “拒绝” / “误报”操作在两侧同步。
- **空、已取消和失败状态**：分别为“无问题”、用户取消和 CLI 失败提供独立视图（失败可重试，错误文本取自 CLI 响应）。
- **设置管理**：直接在扩展中查看和修改 LLM 提供商设置（通过 `ocr config set` 写入）。
- **模型切换与连接检查**：从状态栏切换模型并检查与 LLM 的连接。

---

## 要求

1. 全局安装 `ocr` CLI：

   ```bash
   npm i -g @alibaba-group/open-code-review
   ```

2. 配置 LLM 提供商（端点、API 密钥、模型）。可直接通过 CLI 或扩展的设置视图完成：

   ```bash
   ocr config set llm.url https://api.anthropic.com/v1/messages
   ocr config set llm.auth_token sk-...
   ocr config set llm.model claude-opus-4-6
   ocr config set llm.use_anthropic true
   ```

   设置写入 `~/.opencodereview/config.json`。

---

## 开发

### 环境

- Node.js 18 及以上，包管理器为 **Yarn**（仓库中有 `yarn.lock`）。
- VS Code 1.74 及以上。
- 全局可用的 `ocr` CLI（见上方“要求”）：扩展本质上是 `ocr` 的图形界面。

### 启动开发环境

```bash
cd extensions/vscode
yarn install      # 安装依赖
yarn watch        # 监听模式构建（推荐：更改时自动重新构建 out/）
```

然后在 VS Code 中打开 `extensions/vscode` 文件夹，按 **F5** 启动 Extension Development Host（调试配置位于 `.vscode/launch.json`）。在新窗口中打开一个有 Git 更改的项目——活动栏会出现 Open Code Review 图标，即可发起审查。

> 修改代码后：WebView 更改需在开发宿主窗口中**重新打开侧边栏**（或执行 `Developer: Reload Webviews`）；Extension Host 更改需**重启调试会话**（调试面板的 ⟳ 按钮或宿主窗口中的 `Cmd+R`）。

### 脚本

```bash
yarn compile      # 一次性开发构建（webpack development）
yarn watch        # 监听模式构建
yarn build        # 生产构建（webpack production；打包前自动执行）
yarn test         # Jest 单元测试
yarn lint         # ESLint
yarn package      # 构建用于分发的 .vsix（见“构建发布包”）
```

### 调试要点

- **双向消息传递**：WebView 与 Extension Host 通过 `postMessage` 通信，消息类型位于 `extensions/frontend/src/shared/messages.ts`。两侧都经过 `dispatch` / `handle`——调试应从这里入手。
- **CLI 调用**：所有 `ocr` 子命令都通过 `src/extension/services/CliService.ts` 中的 `child_process.spawn` 启动。`runRaw` 在 CLI 返回非零退出码时拒绝 Promise，并附带 stderr 中的 `Error:` 文本，有助于排查“审查失败 / 连接失败”。
- **设置读写**：`ConfigService` 读取 `~/.opencodereview/config.json`，写入则委托给 `ocr config set`。WebView 字段为 camelCase（如 `useAnthropic`），磁盘和 CLI 中为 snake_case（如 `use_anthropic`）；转换逻辑位于 `src/extension/services/configParse.ts`。

---

## 构建

### 仅编译产物

```bash
yarn build        # 生产构建（webpack production）
```

产物：`out/extension.js`（Extension Host）和 `out/webview.js`（WebView SPA）。

### 构建发布包（.vsix）

```bash
yarn package      # = vsce package --no-yarn
```

该命令：

1. 执行 `vscode:prepublish` → 生产构建 `yarn build`；
2. 根据 `.vscodeignore` 排除源码、测试和开发文件；
3. 在当前目录生成 `open-code-review-vscode-<version>.vsix`。

> 打包工具为作为 devDependency 安装的 `@vscode/vsce`：无需全局安装或联网下载。`--no-yarn` 跳过 vsce 默认的 npm 依赖树检查（项目使用 Yarn）。

发布包仅包含运行所需内容：`package.json`、`README.md`、`resources/icon.svg`、`out/extension.js`、`out/webview.js`。

### 本地安装 / 验证

```bash
code --install-extension open-code-review-vscode-<version>.vsix
```

或在 VS Code 中：扩展面板 → 右上角 `⋯` → **Install from VSIX…** → 选择生成的 `.vsix` 文件。

> 发布到 Marketplace 请使用 `vsce publish`（需要发布者账号和 PAT）；日常分发用上面的 `.vsix` 即可。

---

## 架构

采用 **Monolithic WebView + Thin Extension Host** 方案：

- **WebView** — 基于 Preact 独立构建的 SPA，来自共享前端 `extensions/frontend/`（IntelliJ IDEA 插件也使用它）。
- **Extension Host** 层很薄：仅包含 CLI 调用、文件系统、Git 操作和编辑器评论。
- 两层通过 `postMessage` 通信，`extensions/frontend/src/shared/` 中的共享 TypeScript 类型保证类型安全。

```
src/
└── extension/          Extension Host (Node.js): services / providers / commands
```

WebView 和共享类型从共享前端 `extensions/frontend/` 构建（IntelliJ IDEA 插件也使用它）。

---

## 许可证

Apache-2.0