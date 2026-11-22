<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a>
</p>

# Open Code Review（IntelliJ IDEA 插件）

基于 [`open-code-review`](https://www.npmjs.com/package/@alibaba-group/open-code-review)（`ocr`）CLI 构建的 IntelliJ IDEA 插件。它在 JCEF 浏览器中承载 VS Code 扩展的 Preact webview，将 AI 代码审查带入编辑器：从工具窗口发起审查、实时流式输出日志，并对每条评论就地执行应用 / 忽略 / 标记为误报——与工具窗口双向同步。

---

## 功能

- **三种审查模式**：工作区变更、分支对比（`--from` / `--to`）、单个提交（`--commit`）。
- **待审查文件预览**：列出当前 Git 状态下的变更文件；点击文件可在原生 diff 视图中查看其变更。
- **自定义审查提示词**：可为当前审查可选地追加 `--background` 提示。
- **流式日志**：审查期间实时跟踪 CLI 输出，可随时取消。
- **结果 + 双向同步**：完成后，评论卡片显示在工具窗口中，内联评论面板渲染在编辑器里；应用 / 忽略 / 误报操作在两侧保持同步。
- **空 / 已取消 / 失败状态**：为无问题、用户取消和 CLI 失败提供专门视图（失败可重试，并展示 CLI 返回的真实错误）。
- **配置管理**：在插件内查看 / 编辑 LLM 提供商配置（通过 `ocr config set` 持久化）。
- **模型切换 / 连通性测试**：在配置面板中切换模型并测试与 LLM 的连通性。

---

## 前置条件

1. 全局安装 `ocr` CLI：

   ```bash
   npm i -g @alibaba-group/open-code-review
   ```

2. 配置可用的 LLM（端点、API key、模型）。可直接通过 CLI 配置，或在插件的配置面板中配置：

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

- JDK 21（Gradle 运行构建时使用）。已包含 Gradle wrapper，无需单独安装 Gradle。
- Node.js + npm——仅构建时使用，用于打包 webview。运行时不需要。
- 全局可用的 `ocr` CLI 和 `git`（见"前置条件"）——插件本质上是 `ocr` 的 GUI 前端。

### 启动开发环境

```bash
cd extensions/idea
./gradlew runIde      # 启动已安装该插件的沙箱 IDE
```

在沙箱 IDE 中打开一个有 Git 变更的项目——你会在工具窗口栏看到 Open Code Review 图标，并可发起审查。

> 修改代码后：webview 变更需在沙箱 IDE 中**重新打开工具窗口**；
> 宿主侧（Kotlin）变更需**重启 `runIde`**。

### 脚本

```bash
./gradlew build          # 编译 Kotlin + npm install + npm run build（打包 webview）
./gradlew test           # 运行单元测试
./gradlew runIde         # 启动已安装该插件的沙箱 IDE
./gradlew buildPlugin    # 生成可分发的 .zip（见"构建发布包"）
```

> PATH 中没有 Node.js / npm？用 `./gradlew <task> -PskipFrontend=true` 跳过前端构建
> （使用之前打包的 `src/main/resources/webview/` 产物）。

### 调试说明

- **双向消息**：webview 与宿主通过 JCEF 桥接以 `postMessage` 通信；
  消息类型位于 `extensions/frontend/src/shared/messages.ts`。两侧都经由 `dispatch`
  / `handle` 路由——调试时从这里入手。桥接传输层是唯一与 VS Code 扩展不同的文件：
  `frontend/src/webview/bridge.idea.ts`（对应 `bridge.vsc.ts`）。webpack 根据 `OCR_TARGET`
  环境变量，通过 `NormalModuleReplacementPlugin` 选择正确的桥接。
- **CLI 调用**：所有 `ocr` 子命令都在
  `src/main/kotlin/com/alibaba/opencodereview/idea/services/CliService.kt` 中通过 `ProcessBuilder` 运行。CLI 退出码非零时，
  会以 stderr 中的 `Error:` 文本拒绝，有助于诊断"审查失败 / 连接失败"。
- **配置读写**：`ConfigService.kt` 读取 `~/.opencodereview/config.json`，写入委托给
  `ocr config set`。Webview 字段为 camelCase（如 `useAnthropic`），而磁盘 / CLI 侧为
  snake_case（如 `use_anthropic`）；转换逻辑位于 `ConfigParse.kt`。

---

## 构建

### 仅编译产物

```bash
./gradlew build        # 编译 Kotlin 并将 webview 打包到 src/main/resources/webview/
```

产物：插件 jar（Kotlin 宿主）+ `src/main/resources/webview/{webview.js,configPanel.js}`（webview SPA）。

### 构建发布包（.zip）

```bash
./gradlew buildPlugin
```

这会编译宿主、打包 webview，并在 `extensions/idea` 目录下生成
`build/distributions/open-code-review-idea-<version>.zip`。

### 本地安装 / 验证

在 IntelliJ IDEA 中：`Settings → Plugins → ⚙️ → Install Plugin from Disk…` → 选择生成的 `.zip`。

> 如需使用本地安装的 IntelliJ IDEA 而非下载的平台，请在
> `~/.gradle/gradle.properties` 中设置 `localIdePath`（不是仓库的 `gradle.properties`，后者与机器无关）。
> 若路径缺失，构建会回退到下载的平台。

---

## 架构

采用与 VS Code 扩展相同的**单体 WebView + 瘦宿主**设计：

- **WebView** 是单独构建的 Preact SPA，与 VS Code 扩展共享于
  `extensions/frontend/`。唯一 IDEA 专属的文件是 `bridge.idea.ts`；webpack 根据
  `OCR_TARGET` 环境变量，通过 `NormalModuleReplacementPlugin` 选择正确的桥接
  （`bridge.idea.ts` 与 `bridge.vsc.ts`）。
- **宿主**层（Kotlin / IntelliJ）很薄，仅处理 CLI 调用、文件系统、Git
  操作和编辑器评论。它在 JCEF 中承载 webview。
- 两者通过 JCEF 桥接以 `postMessage` 通信，共享 TypeScript 类型位于
  `extensions/frontend/src/shared/`，以保证类型安全。

```
extensions/
├── frontend/                shared frontend (webview SPA + shared types)
│   ├── src/shared/          shared types & postMessage protocol
│   └── src/webview/         WebView SPA (Preact): views / components / store / bridge
└── idea/
    ├── src/main/kotlin/     Host (Kotlin / IntelliJ): services / providers / jcef / messages
    └── src/main/resources/  plugin.xml / icons / bundled webview output
```

---

## 兼容性

- `com.intellij.modules.jcef` 声明为**可选**依赖，因此插件在
  2025.1（JCEF 在核心中）和 2026.2（JCEF 作为单独的捆绑插件）上均可加载。
- webview 的 `--vscode-*` CSS 变量从当前 IntelliJ 主题注入，因此 UI
  会自动跟随 Darcula / Light。

---

## 许可证

Apache-2.0