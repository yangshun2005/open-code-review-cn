# OpenCodeReview 落地页（`pages/`）

此目录包含 OpenCodeReview 落地页，使用 TypeScript、React、Webpack 和 Tailwind CSS 构建。

## 快速开始

### 前置要求

- Node.js `>=18`（推荐：最新 LTS 版本）
- `npm`（随 Node.js 附带）或 `pnpm`

### 安装依赖

在 `pages/` 目录下执行：

```bash
npm install
```

或使用 pnpm：

```bash
pnpm install
```

### 启动本地开发服务器

```bash
npx webpack serve
```

等效的 npm 脚本：

```bash
npm run dev
```

默认开发服务器设置（来自 `webpack.config.js`）：

- URL：`http://localhost:3030`
- 主机：`0.0.0.0`
- 端口：`3030`

### 构建生产版本

```bash
npx webpack
```

项目脚本（推荐，设置生产模式）：

```bash
npm run build
```

构建输出生成在 `pages/dist/` 目录中。

### 类型检查

```bash
npm run typecheck
```

## 项目结构

```text
pages/
├── src/                # React + TypeScript 源代码
│   ├── components/     # 可复用的 UI 组件
│   ├── pages/          # 路由级别的页面组件
│   ├── i18n/           # 本地化资源和 i18n 上下文
│   ├── styles/         # 全局样式（Tailwind 入口、自定义 CSS）
│   └── index.tsx       # 前端入口点
├── dist/               # 生产构建产物（生成）
├── index.html          # HtmlWebpackPlugin 使用的 HTML 模板
├── webpack.config.js   # 打包 + 开发服务器配置
├── tailwind.config.js  # Tailwind 主题/内容配置
├── postcss.config.js   # PostCSS 流水线（Tailwind + Autoprefixer）
├── tsconfig.json       # TypeScript 编译器选项
└── package.json        # 依赖和脚本
```

## 开发指南

### PR 必须包含截图

任何修改 `pages/` 中文件的 PR 必须在 PR 描述中包含受影响视图的**前后对比截图**。

请包含：

- 修改了哪个页面/部分
- 修改前截图
- 修改后截图
- 桌面端或移动端上下文（如果响应式行为有变化）

### 代码风格和格式

- 遵循此目录中现有的 TypeScript + React 风格。
- 保持组件聚焦且可读；优先将大型 JSX 代码块拆分为更小的组件。
- 优先使用工具类优先的 Tailwind 类，并复用 `tailwind.config.js` 中现有的设计令牌。
- 保持导入和文件命名与周围代码一致。
- 在提交 PR 前运行 `npm run typecheck`。

### Tailwind CSS 配置说明

- Tailwind 配置位于 `tailwind.config.js`。
- 内容扫描目标：
  - `./src/**/*.{ts,tsx}`
  - `./index.html`
- PostCSS 集成配置在 `postcss.config.js` 中，包含：
  - `tailwindcss`
  - `autoprefixer`

### TypeScript 配置说明

- TypeScript 配置位于 `tsconfig.json`。
- 重要默认设置：
  - `strict: true`
  - `jsx: react-jsx`
  - `target: ES2020`
  - `noEmit: true`（Webpack 处理输出）

## 建议的 PR 检查清单

- [ ] 依赖已安装且项目可在本地运行
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 成功
- [ ] 前后对比截图已添加到 PR
- [ ] 变更范围限于一个逻辑修改