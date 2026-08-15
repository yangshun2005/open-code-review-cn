---
title: 审查规则
sidebar:
  order: 7
---

规则告知 OCR 在审查每个文件时**应重点关注什么**。它们存储在三个层级的 JSON 文件中，此外还有一个内置于二进制文件中的系统标准。

## 优先级链

OCR 通过**四级优先级链**来解析规则。对于每个文件路径，会按顺序尝试各个层级；第一个匹配的模式生效。

| 优先级 | 来源 | 路径 | 备注 |
|---|---|---|---|
| 1（最高） | `--rule` 标志 | 用户自定义 | 通过 CLI 覆盖；如果设置，则始终生效。 |
| 2 | 项目配置 | `<repoDir>/.opencodereview/rule.json` | 项目级规则 — 可以安全提交。 |
| 3 | 全局配置 | `~/.opencodereview/rule.json` | 用户偏好设置。 |
| 4（最低） | 系统标准 | 内置的 `system_rules.json` | 针对常见语言的内置规则。 |

如果某个更高级别的文件不存在，它会被静默跳过——这不是错误。因此，一个从未添加过 `.opencodereview/rule.json` 的项目，会直接回退到全局/系统级别。

系统级别**始终**存在（它内置于二进制文件中），因此总能解析出*某个*规则。

## 规则文件格式（级别 1–3）

```json
{
  "include": ["src/**/*.{ts,tsx}", "src/**/*.go"],
  "exclude": ["**/*.test.ts", "**/generated/**"],
  "rules": [
    {
      "path": "src/api/**/*.go",
      "rule": "All exported handlers must validate request bodies before use."
    },
    {
      "path": "**/*mapper*.xml",
      "rule": "Check SQL for injection risks, parameter errors, and missing closing tags."
    }
  ]
}
```

三个独立的字段：

- `include` — 可选。Glob 模式，用于*绕过*内置的标准排除模式（测试文件排除，见下文）。这不是白名单：未匹配任何 `include` 模式的文件仍会经过 `unsupported_ext` 和 `default_path` 检查，并可能被审查。
- `exclude` — 可选。用于指定 OCR *不应*审查的文件的 Glob 模式。在过滤器内部优先级最高。
- `rules` — `{path, rule}` 记录的数组，**按声明顺序**评估。第一个 `path` 的 glob 与文件匹配的记录，将决定 OCR 发送给模型的提示词。

### Glob 特性

OCR 使用 [`bmatcuk/doublestar/v4`](https://pkg.go.dev/github.com/bmatcuk/doublestar/v4) 进行匹配：

- `*` — 匹配除 `/` 外的任意字符。
- `**` — 跨越目录边界（`src/**/*.go` 覆盖任意深度）。
- `{a,b,c}` — 花括号展开。`*.{ts,tsx,js,jsx}` 展开为四个模式，按顺序匹配。
- `?` — 匹配单个字符。
- `[abc]` — 字符类。

> 模式匹配**不区分大小写**（文件路径在匹配前会转换为小写）。如有疑问，请使用 `ocr rules check <path>` 进行验证。

## 文件如何被过滤

过滤器是 [`internal/agent/preview.go`](https://github.com/alibaba/open-code-review/blob/main/internal/agent/preview.go) 中的五步算法。对于每个 diff，OCR 会询问：

1. **`binary`** — 文件是二进制文件吗？排除。
2. **`user_exclude`** — 路径是否匹配任何用户 `exclude` 模式？排除。
3. **`user_include`** — 如果用户设置了 `include`，路径是否匹配？如果匹配，**立即保留**（绕过下面的 `unsupported_ext` 和 `default_path` 检查）。
4. **`unsupported_ext`** — 文件扩展名是否在[允许列表](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/supported_file_types.json)中？如果不在，则排除。
5. **`default_path`** — 路径是否匹配内置的测试文件排除模式（`**/*_test.go`、`**/*.test.{js,jsx,ts,tsx}`、`**/*_spec.rb` 等）？如果匹配，则排除。

通过所有五项检查的文件会被发送给 LLM。`deleted` 原因（并非一个阶段——它在 `Preview()` 中单独计算）标记新路径为 `/dev/null` 的文件；这些文件没有可供审查的新内容。使用 `ocr review --preview` 输出此过滤器的结果，而无需消耗任何 token。

### 标准路径排除

内置的排除列表（参见 [`internal/config/allowlist/default_exclude_patterns.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/default_exclude_patterns.json)）与测试文件模式匹配：

- `**/*_test.go`
- `**/src/test/java/**/*.java`
- `**/src/test/**/*.kt`
- `**/*.test.{js,jsx,ts,tsx}`
- `**/*.spec.{js,jsx,ts,tsx}`
- `**/__tests__/**`
- `**/test/**/*_test.py`
- `**/tests/**/*_test.py`
- `**/*_test.py`
- `**/*_spec.rb`
- `**/spec/**/*_spec.rb`
- `**/*Test.java`
- `**/*Tests.java`
- `**/*_test.rs`
- `**/oh_modules/**`
- `**/*.test.ets`

对嘈杂目录（`vendor/`、`node_modules/`、`target/` 等）的过滤发生在更早阶段，即在 [`internal/diff/git.go`](https://github.com/alibaba/open-code-review/blob/main/internal/diff/git.go) 的 diff 级别，早于逐文件过滤器运行。

要**审查**匹配这些测试文件模式之一的文件，请将其添加到用户自定义的 `include` 列表中——这将覆盖 `default_path` 阶段。

## 文件规则解析

当过滤器确定某个文件*将*被审查时，OCR 会选择代理必须遵循的规则文本：

1. 按声明顺序尝试 `--rule` 级别（用户自定义）。
2. 按声明顺序尝试 `<repo>/.opencodereview/rule.json`。
3. 按声明顺序尝试 `~/.opencodereview/rule.json`。
4. 回退到内置的系统规则级别。

内置 `system_rules.json` 中选定的模式及其相对匹配顺序如下所示：

| 模式 | 规则文档 |
|---|---|
| `**/*.properties` | `properties.md` — i18n / 配置文件。 |
| `**/*{mapper,dao}*.xml` | `mapper_dao_xml.md` — MyBatis 风格的 mapper SQL。 |
| `**/pom.xml` | `pom_xml.md` — Maven 依赖。 |
| `**/build.gradle` | `build_gradle.md` — Gradle 依赖。 |
| `**/package.json` | `package_json.md` — NPM 依赖 / 脚本。 |
| `**/Cargo.toml` | `cargo_toml.md` — Rust 清单。 |
| `**/composer.json` | `composer_json.md` — Composer 依赖、自动加载、脚本、插件和包配置。 |
| `**/*.{json,json5}` | `json.md` — 普通 JSON（也匹配 `.json5`）。 |
| `.github/workflows/**/*.{yaml,yml}` | `github_workflows.md` — GitHub Actions 的 YAML workflow。 |
| `.github/**/*.{yaml,yml}` | `github_config.md` — 其他 `.github` 配置 YAML。 |
| `**/*.{yaml,yml}` | `yaml.md` |
| `**/*.java` | `java.md` |
| `**/*.go` | `go.md` — Go 源代码。 |
| `**/*.{ftl,ftlh,ftlx}` | `freemarker.md` — FreeMarker 模板（SSTI / XSS / null 处理）。 |
| `**/*.ets` | `arkts.md` — ArkTS / HarmonyOS。 |
| `**/*.astro` | `astro.md` — Astro 组件和 islands。 |
| `**/*.{ts,js,tsx,jsx}` | `ts_js_tsx_jsx.md` |
| `**/*.{kt}` | `kotlin.md` |
| `**/*.rs` | `rust.md` |
| `**/*.{cpp,cc,hpp}` | `cpp.md` |
| `**/*.c` | `c.md` |
| `**/*.py` | `python.md` — Python 源代码。 |
| `**/*.{php,phtml}` | `php.md` — PHP 源代码和 PHP 模板。 |
| `**/*.proto` | `protobuf.md` — Protocol Buffers 的 wire 级别兼容性。 |
| `**/*.po` | `po.md` — gettext 翻译目录源文件。 |
| `**/*.pot` | `pot.md` — gettext 模板文件。 |
| `**/*.{graphql,gql}` | `graphql.md` — GraphQL schema 和操作。 |
| `**/*.prisma` | `prisma.md` — Prisma schema。 |
| `**/*.jl` | `julia.md` — Julia 源代码。 |
| `**/*.{tf,hcl,tfvars}` | `terraform.md` — Terraform / HCL。 |
| `**/*.bicep` | `bicep.md` — Bicep 模板（Azure）。 |
| *(回退)* | `default.md` |

解析出的规则正文将成为 plan 和 main task 提示词中 `{{system_rule}}` 占位符的值。

## 检查哪个规则生效：`ocr rules check`

```bash
$ ocr rules check src/main/java/com/example/UserService.java
File: src/main/java/com/example/UserService.java
Source: System built-in
Pattern: **/*.java
Rule:
────────────────────────────────────────
…java.md 的内容…
────────────────────────────────────────
```

```bash
$ ocr rules check --rule custom.json src/main/resources/mapper/UserMapper.xml
File: src/main/resources/mapper/UserMapper.xml
Source: Custom (--rule)
Pattern: **/*mapper*.xml
Rule:
────────────────────────────────────────
…您的自定义规则内容…
────────────────────────────────────────
```

每当规则行为不符合预期时，请使用此命令——它会显示胜出的**级别**和**模式**。

## 使用场景

### 项目级别：推行编码标准

保存为 `<repo>/.opencodereview/rule.json` 并提交：

```json
{
  "rules": [
    {
      "path": "src/api/**/*.go",
      "rule": "Every public handler must `defer tx.Rollback()` immediately after starting a transaction."
    },
    {
      "path": "**/*mapper*.xml",
      "rule": "Check SQL for injection risks, missing parameter binding, and unclosed XML tags."
    }
  ]
}
```

### 项目级别：跳过生成的代码，聚焦 src

```json
{
  "include": ["src/**/*.{ts,tsx,js,jsx}"],
  "exclude": ["**/*.gen.ts", "**/generated/**"]
}
```

当设置了 `include` 时，`src/` 内的文件会被保留，即使它们本会被内置的标准排除模式（例如测试文件）丢弃。`src/` 之外的文件仍会经过常规的扩展名/默认路径检查——`include` 是一种绕过机制，而非白名单。

### 为单个 PR 覆盖规则

```bash
ocr review --rule ./.review-rules-only-for-this-pr.json
```

这会绕过项目和全局级别——当某个 PR 需要完全不同的审查清单（例如仅进行安全审查）时非常有用。

### 全局个人偏好

将它们放在 `~/.opencodereview/rule.json` 中，以便您机器上的每个仓库都继承这些偏好：

```json
{
  "rules": [
    {
      "path": "**/*.{ts,tsx,js,jsx}",
      "rule": "Always check for unhandled promise rejections; warn on `// eslint-disable` without a reason comment."
    }
  ]
}
```

## 另请参阅

- [CLI 参考](../cli-reference/) — `ocr review --rule`、`--preview` 和 `ocr rules check`。
- [配置](../configuration/) — 配置文件位置和多级解析链。
- [架构](../architecture/) — 解析后的规则如何进入代理的提示词。