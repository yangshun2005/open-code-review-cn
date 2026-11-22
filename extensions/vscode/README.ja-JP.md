<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | 日本語 | <a href="README.ko-KR.md">한국어</a> | <a href="README.ru-RU.md">Русский</a>
</p>

# Open Code Review（VS Code 扩展）

基于 [`open-code-review`](https://www.npmjs.com/package/@alibaba-group/open-code-review)（`ocr`）CLI 的 VS Code 代码审查扩展。通过 Preact WebView 还原原型操作体验，将 AI 代码审查引入编辑器。可从侧边栏发起审查、实时查看日志，并在编辑器内直接对每条评论执行应用／忽略／标记为误报。与侧边栏双向同步。

---

## 功能

- **三种审查模式**：工作区变更、分支比较（`--from` / `--to`）、单个提交（`--commit`）。
- **审查文件预览**：根据当前 Git 状态列出变更文件，点击可在原生 diff 视图中查看差异。
- **自定义审查提示词**：可为本次审查可选地追加 `--background` 提示。
- **流式日志**：审查过程中实时显示 CLI 输出，可随时取消。
- **结果展示与双向同步**：完成后侧边栏显示评论卡片，同时在编辑器内渲染 CommentThread。应用／忽略／误报操作在两侧同步。
- **空／取消／失败状态**：分别为无问题、用户取消、CLI 失败提供专用视图（失败可重试，并显示 CLI 返回的实际错误）。
- **配置管理**：可在扩展内查看和编辑 LLM 提供商配置（通过 `ocr config set` 保存）。
- **模型切换与连接测试**：可从状态栏切换模型并测试 LLM 连接。

---

## 前提条件

1. 全局安装 `ocr` CLI：

   ```bash
   npm i -g @alibaba-group/open-code-review
   ```

2. 配置要使用的 LLM（端点、API 密钥、模型）。可直接在 CLI 中配置，或在扩展的配置视图中填写：

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

- Node.js 18 及以上，包管理器为 **Yarn**（仓库内附带 `yarn.lock`）。
- VS Code 1.74 及以上。
- 全局可用的 `ocr` CLI（参见上文「前提条件」）。本扩展实质上是 `ocr` 的 GUI 前端。

### 启动开发环境

```bash
cd extensions/vscode
yarn install      # 安装依赖
yarn watch        # 监听模式的开发构建（每次变更都会重新构建 out/，推荐）
```

然后在 VS Code 中打开 `extensions/vscode` 文件夹，按 **F5** 启动 Extension Development Host（调试配置已放在 `.vscode/launch.json`）。在新窗口中打开有 Git 变更的项目，活动栏会显示 Open Code Review 图标，即可开始审查。

> 修改代码后：WebView 的变更需在开发宿主窗口中 **重新打开侧边栏**（也可执行 `Developer: Reload Webviews`）。Extension Host 的变更需 **重启调试会话**（调试工具栏的 ⟳ 按钮，或在宿主窗口按 `Cmd+R`）。

### 脚本

```bash
yarn compile      # 一次性开发构建（webpack development）
yarn watch        # 监听模式的开发构建
yarn build        # 生产构建（webpack production，打包前自动执行）
yarn test         # 运行 Jest 单元测试
yarn lint         # ESLint
yarn package      # 生成分发用 .vsix（参见「创建发布包」）
```

### 调试要点

- **双向消息传递**：WebView 与 Extension Host 通过 `postMessage` 通信，消息类型定义在 `extensions/frontend/src/shared/messages.ts`。两侧都经过 `dispatch` / `handle`，调试可从那里入手。
- **CLI 调用**：所有 `ocr` 子命令均通过 `src/extension/services/CliService.ts` 中的 `child_process.spawn` 执行。`runRaw` 在 CLI 退出码非 0 时 reject，并附带 stderr 中的 `Error:` 文本，有助于区分「审查失败／连接失败」。
- **配置读写**：`ConfigService` 读取 `~/.opencodereview/config.json`，写入委托给 `ocr config set`。WebView 侧字段为 camelCase（如 `useAnthropic`），磁盘／CLI 侧为 snake_case（如 `use_anthropic`），转换逻辑在 `src/extension/services/configParse.ts`。

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

1. 触发 `vscode:prepublish`，执行 `yarn build` 生产构建；
2. 按 `.vscodeignore` 排除源码、测试和开发文件；
3. 在当前目录生成 `open-code-review-vscode-<version>.vsix`。

> 打包工具为 `@vscode/vsce`，作为 devDependency 安装，无需全局安装或从网络下载。`--no-yarn` 跳过 vsce 默认的 npm 依赖树检查（本项目使用 Yarn）。

发布包仅包含运行所需内容：`package.json`、`README.md`、`resources/icon.svg`、`out/extension.js`、`out/webview.js`。

### 本地安装／验证

```bash
code --install-extension open-code-review-vscode-<version>.vsix
```

或在 VS Code 中：扩展面板 → 右上角 `⋯` → **Install from VSIX…** → 选择生成的 `.vsix` 文件。

> 发布到 Marketplace 请使用 `vsce publish`（需要 publisher 账号和 PAT）。日常分发使用上述 `.vsix` 即可。

---

## 架构

采用 **Monolithic WebView + Thin Extension Host** 设计：

- **WebView** 是独立构建的 Preact SPA，由共享前端 `extensions/frontend/` 构建（与 IntelliJ IDEA 插件共用）。
- **Extension Host** 层很薄，仅负责 CLI 调用、文件系统、Git 操作和编辑器评论。
- 两者通过 `postMessage` 通信，借助 `extensions/frontend/src/shared/` 中的共享 TypeScript 类型保证类型安全。

```
src/
└── extension/          Extension Host（Node.js）：services / providers / commands
```

WebView 与共享类型由共享前端 `extensions/frontend/` 构建（与 IntelliJ IDEA 插件共用）。

---

## 许可证

Apache-2.0