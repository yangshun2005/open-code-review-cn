# OpenCodeReview 落地页（`pages/`）

本目录包含 OpenCodeReview 落地页，使用 TypeScript、React、Webpack 和 Tailwind CSS 构建。

## 快速开始

### 前置条件

- Node.js `^22.22.2 || ^24.15.0 || >=26`（推荐：最新 LTS；所有 Pages CI 任务均在 Node 24 上构建）
- `npm`（随 Node.js 提供）或 `pnpm`

版本下限来自开发工具链而非打包器：`jsdom@30`（Vitest 环境）声明 `^22.22.2 || ^24.15.0 || >=26`，`eslint@10` 声明 `^20.19.0 || ^22.13.0 || >=24`。在较旧的 Node 上，`npm install` 会报 `EBADENGINE`，且 lint 和测试工具链超出其支持范围。

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

默认开发服务器设置（来自 `webpack.config.cjs`）：

- URL：`http://localhost:3030`
- Host：`0.0.0.0`
- 端口：`3030`

### 生产构建

在 npm 脚本通过 POSIX shell 运行的系统上（例如 Linux 和 macOS），使用项目脚本：

```bash
npm run build
```

构建产物生成在 `pages/dist/`。

请使用项目脚本或 webpack-cli 的 `--node-env` 选项，不要在不设置 Node 环境的情况下直接调用 Webpack。`webpack.config.cjs` 仅根据 `NODE_ENV` 推导 `isProduction`，该标志同时决定 Webpack `mode` 以及 `@babel/preset-react` 是否运行开发转换：

| 命令                                | 结果                                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx webpack`                       | 开发模式，包含 React 开发构建。不要用于生产构建产物。                                                                                                           |
| `npx webpack --mode production`     | Webpack 优化打包并选用 React 生产版本，但配置中的 `NODE_ENV` 仍未设置，因此 Babel 仍启用 React 开发转换。                                                       |
| `npx webpack --node-env production` | 生产模式，`NODE_ENV=production`；适用于 `cmd.exe`、PowerShell、Git Bash 和 POSIX shell。                                                                        |
| `npm run build`                     | 生产模式，`NODE_ENV=production` 且 `--mode production`。                                                                                                        |

如需与 shell 无关的生产构建，使用：

```bash
npx webpack --node-env production
```

webpack-cli 在加载配置前设置 `process.env.NODE_ENV`，因此该命令使用预期的生产配置，无需依赖特定 shell 的内联环境变量语法。项目脚本本身可通过 `webpack --node-env production` 实现跨平台；修改 `package.json` 不在本次仅文档变更的范围内。

### 检查

Pages CI 对每个涉及 `pages/**` 的 PR 运行以下序列：

1. `npm run lint`
2. `npm test`
3. `npm run typecheck`
4. `npm run build`
5. 对构建后的 `dist/` 做冒烟测试
6. `npm run size`

本地 PR 前验证时，按相同顺序运行 npm 脚本检查。如果 npm 脚本 shell 不支持 POSIX 内联环境变量赋值，生产构建步骤改用 `npx webpack --node-env production`。

`npm run lint` 对 `src/` 运行 ESLint；`npm test` 在 `jsdom` 环境中运行一次 Vitest 套件（`vitest run`）；`npm run size` 测量 `dist/*.bundle.js` 匹配文件的合并 brotli 压缩大小，对照 `package.json` 中声明的 150 kB 预算。

## 项目结构

```text
pages/
├── src/                 # React + TypeScript 源代码
│   ├── components/      # 可复用 UI 组件
│   ├── pages/           # 路由级页面组件
│   ├── content/         # 打包的 Markdown：docs/ 和 blog/，按语言环境
│   ├── hooks/           # 自定义 React Hook
│   ├── i18n/            # 本地化资源和 i18n 上下文
│   ├── styles/          # 全局样式（Tailwind 入口、自定义 CSS）
│   ├── utils/           # 共享辅助函数
│   ├── assets/          # 导入的图标和图片
│   └── index.tsx        # 前端入口点
├── public/              # 原样复制到 dist/ 的静态文件及爬取策略
├── dist/                # 生产构建产物（生成，gitignored）
├── index.html           # HtmlWebpackPlugin 使用的 HTML 模板
├── webpack.config.cjs   # 打包 + 开发服务器配置
├── tailwind.config.cjs  # Tailwind 主题/内容配置
├── postcss.config.cjs   # PostCSS 流水线（Tailwind + Autoprefixer）
├── eslint.config.js     # ESLint flat 配置
├── vitest.config.ts     # Vitest 配置（jsdom 环境）
├── vitest.setup.ts      # 测试设置（@testing-library/jest-dom）
├── tsconfig.json        # TypeScript 编译器选项
├── go.mod               # 仅模块边界——此处无 Go 代码
└── package.json         # 依赖和脚本
```

注意混合扩展名。`package.json` 设置 `"type": "module"`，因此裸 `.js` 文件按 ESM 解析。`eslint.config.js` 是 ESM，保持 `.js`；Webpack、Tailwind 和 PostCSS 配置使用 `module.exports`，因此必须为 `.cjs`。`postcss.config.cjs` 同样按名称引用 `./tailwind.config.cjs`。

`src/content/` 下的 Markdown 由 `src/content/docs/index.ts` 和 `src/content/blog/index.ts` 导入，因此会进入构建产物。由于 `DocsPage` 和 `BlogPage` 是懒加载的（`src/App.tsx`），该 Markdown 落在 `docs-page` / `blog-page` 异步 chunk 中而非 `dist/*.bundle.js`，因此不受 `npm run size` 预算覆盖。本文件完全不打包——仅为开发者指南。

## 开发指南

### PR 必须包含截图

任何修改 `pages/` 中文件的 PR 必须在 PR 描述中包含受影响视图的**前后对比截图**。

请包含：

- 变更的页面/区块
- 变更前截图
- 变更后截图
- 桌面或移动端上下文（如响应式行为有变更）

### 代码风格与格式

- 遵循本目录现有的 TypeScript + React 风格。
- 保持组件聚焦且可读；优先将大型 JSX 块拆分为更小的组件。
- 优先使用工具类优先的 Tailwind 类，并复用 `tailwind.config.cjs` 中的现有设计令牌。
- 保持导入和文件命名与周围代码一致。
- 提交 PR 前运行上述检查。

### Tailwind CSS 配置说明

- Tailwind 配置位于 `tailwind.config.cjs`。
- 内容扫描目标：
  - `./src/**/*.{ts,tsx}`
  - `./index.html`
- PostCSS 集成在 `postcss.config.cjs` 中配置，包含：
  - `tailwindcss`
  - `autoprefixer`

### TypeScript 配置说明

- TypeScript 配置位于 `tsconfig.json`。
- 重要默认值：
  - `strict: true`
  - `jsx: react-jsx`
  - `target: ES2020`
  - `noEmit: true`（Webpack 处理输出）

## 建议的 PR 检查清单

- [ ] 依赖已安装且项目本地可运行
- [ ] `npm run lint` 通过
- [ ] `npm test` 通过
- [ ] `npm run typecheck` 通过
- [ ] 生产构建成功（在 POSIX 脚本 shell 上运行 `npm run build`，或使用可移植等效命令 `npx webpack --node-env production`）
- [ ] `npm run size` 通过
- [ ] 存在受影响视图时，PR 中添加前后对比截图
- [ ] 范围限于一个逻辑变更