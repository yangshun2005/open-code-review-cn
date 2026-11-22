<p align="center">
  英语 | <a href="README.zh-CN.md">简体中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.ko-KR.md">한국어</a> | <a href="README.ru-RU.md">Русский</a>
</p>

# Open Code Review（VS Code 扩展）

一个基于 [`open-code-review`](https://www.npmjs.com/package/@alibaba-group/open-code-review)（`ocr`）CLI 构建的 VS Code 代码审查扩展。它用 Preact WebView 复刻了原型体验，把 AI 代码审查带入编辑器：从侧边栏发起审查、实时流式查看日志，并对每条评论就地执行应用 / 忽略 / 标记为误报——与侧边栏双向同步。

---

## 功能

- **三种审查模式**：工作区变更、分支对比（`--from` / `--to`）、单个提交（`--commit`）。
- **待审查文件预览**：列出当前 Git 状态下的变更文件；点击文件可在原生 diff 视图中查看其变更。
- **自定义审查提示词**：可选为当前审查追加 `--background` 提示。
- **流式日志**：审查期间实时跟踪 CLI 输出，可随时取消。
- **结果 + 双向同步**：完成后，评论卡片出现在侧边栏，CommentThread 渲染在编辑器中；应用 / 忽略 / 误报操作在两侧保持同步。
- **空 / 已取消 / 失败状态**：为无问题、用户取消、CLI 失败提供专门视图（失败可重试，并展示 CLI 返回的真实错误）。
- **配置管理**：在扩展内查看 / 编辑 LLM 提供商配置（通过 `ocr config set` 持久化）。
- **模型切换 / 连通性测试**：从状态栏切换模型并测试与 LLM 的连通性。

---

## 前置条件

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

### 环境

- Node.js ≥ 18，包管理器使用 **Yarn**（仓库自带 `yarn.lock`）。
- VS Code ≥ 1.74。
- 全局可用的 `ocr` CLI（见上文"前置条件"）——扩展本质上是 `ocr` 的 GUI 前端。

### 启动开发环境

```bash
cd extensions/vscode
yarn install      # 安装依赖
yarn watch        # 监听模式开发构建（推荐：变更时自动重建 out/）
```

然后在 VS Code 中打开 `extensions/vscode` 文件夹，按 **F5** 启动
Extension Development Host（调试配置见 `.vscode/launch.json`）。在新窗口中
打开一个有 Git 变更的项目——活动栏会出现 Open Code Review 图标，即可发起审查。

> 修改代码后：WebView 变更需在开发宿主窗口中**重新打开侧边栏**
> （或运行 `Developer: Reload Webviews`）；Extension Host 变更需**重启调试会话**
> （调试工具栏上的 ⟳ 按钮，或在宿主窗口中按 `Cmd+R`）。

### 脚本

```bash
yarn compile      # 一次性开发构建（webpack development）
yarn watch        # 监听模式开发构建
yarn build        # 生产构建（webpack production；打包前自动运行）
yarn test         # 运行 Jest 单元测试
yarn lint         # ESLint
yarn package      # 生成可分发的 .vsix 包（见"构建发布包"）
```

### 调试说明

- **双向消息**：WebView 与 Extension Host 通过 `postMessage` 通信；消息类型定义在
  `extensions/frontend/src/shared/messages.ts`。两侧都经由 `dispatch` / `handle` 路由——
  调试时从这里入手。
- **CLI 调用**：所有 `ocr` 子命令都在 `src/extension/services/CliService.ts` 中通过
  `child_process.spawn` 运行。`runRaw` 在 CLI 退出码非零时拒绝，并附带 stderr 中的
  `Error:` 文本，有助于诊断"审查失败 / 连接失败"。
- **配置读写**：`ConfigService` 读取 `~/.opencodereview/config.json`，写入则委托给
  `ocr config set`。WebView 字段为 camelCase（如 `useAnthropic`），磁盘 / CLI 侧为
  snake_case（如 `use_anthropic`）；转换逻辑在 `src/extension/services/configParse.ts`。

---

## 构建

### 仅编译产物

```bash
yarn build        # 生产构建（webpack production）
```

产物：`out/extension.js`（Extension Host）+ `out/webview.js`（WebView SPA）。

### 构建发布包（.vsix）

```bash
yarn package      # = vsce package --no-yarn
```

该命令会：

1. 触发 `vscode:prepublish` → 运行 `yarn build` 生产构建；
2. 按 `.vscodeignore` 排除源码、测试和开发文件；
3. 在当前目录生成 `open-code-review-vscode-<version>.vsix`。

> 打包工具为 `@vscode/vsce`，作为 devDependency 安装——无需全局安装或联网下载。
> `--no-yarn` 跳过 vsce 默认的 npm 依赖树检查（本项目使用 Yarn）。

发布包仅包含运行时必需内容：`package.json`、`README.md`、
`resources/icon.svg`、`out/extension.js`、`out/webview.js`。

### 本地安装 / 验证

```bash
code --install-extension open-code-review-vscode-<version>.vsix
```

或在 VS Code 中：扩展面板 → 右上角 `⋯` → **Install from VSIX…** → 选择生成的 `.vsix` 文件。

> 发布到 Marketplace 请改用 `vsce publish`（需要发布者账号和 PAT）；
> 日常分发用上面的 `.vsix` 即可。

---

## 架构

采用**单体 WebView + 薄 Extension Host**设计：

- **WebView** 是单独构建的 Preact SPA，由 `extensions/frontend/` 的共享前端构建
  （IntelliJ IDEA 插件也使用该前端）。
- **Extension Host** 层很薄，仅处理 CLI 调用、文件系统、Git 操作和编辑器评论。
- 两者通过 `postMessage` 通信，共享 TypeScript 类型位于
  `extensions/frontend/src/shared/`，以保证类型安全。

```
src/
└── extension/          Extension Host（Node.js）：services / providers / commands
```

WebView 和共享类型由 `extensions/frontend/` 的共享前端构建（IntelliJ IDEA 插件也使用该前端）。

---

## 许可证

Apache-2.0