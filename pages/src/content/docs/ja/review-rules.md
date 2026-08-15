---
title: 审查规则
sidebar:
  order: 7
---

规则告诉 OCR 在审查每个文件时**应关注什么**。规则存储在三层 JSON 文件中，此外还有随二进制文件附带的嵌入式系统默认规则。

## 优先级链

OCR 通过**四层优先级链**来解析规则。对于每个文件路径，会按顺序尝试各层，第一个匹配的模式生效。

| 优先级 | 来源 | 路径 | 说明 |
|---|---|---|---|
| 1（最高） | `--rule` 参数 | 用户指定 | CLI 覆盖。只要指定了就始终生效。 |
| 2 | 项目配置 | `<repoDir>/.opencodereview/rule.json` | 项目级规则。可以安全提交。 |
| 3 | 全局配置 | `~/.opencodereview/rule.json` | 用户级偏好。 |
| 4（最低） | 系统默认 | 内置 `system_rules.json` | 覆盖常见语言的内置规则。 |

如果更高优先级的层文件不存在，则静默跳过。这不是错误。因此，从未添加过 `.opencodereview/rule.json` 的项目会直接落到全局/系统层。

系统层**始终**存在（随二进制文件附带），因此必定会解析出*某种*规则。

## 规则文件格式（层 1〜3）

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

有三个独立的字段：

- `include`: 可选。用于*绕过*内置默认排除模式（如测试文件排除，见下文）的 glob 模式。它不是白名单。不匹配任何 `include` 模式的文件仍然可能通过 `unsupported_ext` 和 `default_path` 检查并被审查。
- `exclude`: 可选。OCR 不审查的文件的 glob 模式。在过滤中优先级最高。
- `rules`: `{path, rule}` 条目的数组，按**声明顺序**评估。对于某个文件，第一个匹配其 `path` glob 的条目将决定 OCR 发送给模型的 prompt。

### glob 功能

OCR 使用 [`bmatcuk/doublestar/v4`](https://pkg.go.dev/github.com/bmatcuk/doublestar/v4) 进行匹配：

- `*`: 匹配除 `/` 以外的任意字符。
- `**`: 跨目录边界匹配（`src/**/*.go` 覆盖任意深度）。
- `{a,b,c}`: 花括号展开。`*.{ts,tsx,js,jsx}` 会展开为 4 个模式，并依次尝试匹配。
- `?`: 匹配单个字符。
- `[abc]`: 字符类。

> 模式匹配**不区分大小写**（匹配前文件路径会转为小写）。不确定时，请使用 `ocr rules check <path>` 确认。

## 文件如何被过滤

过滤是一个 5 阶段的门控算法，位于 [`internal/agent/preview.go`](https://github.com/alibaba/open-code-review/blob/main/internal/agent/preview.go)。对于每个 diff，OCR 依次询问：

1. **`binary`**: 文件是二进制吗？ 排除。
2. **`user_exclude`**: 路径是否匹配任何用户 `exclude` 模式？ 排除。
3. **`user_include`**: 如果用户定义了 `include`，路径是否匹配？ 如果匹配则**立即保留**（绕过下面的 `unsupported_ext` 和 `default_path` 门控）。
4. **`unsupported_ext`**: 文件扩展名是否在[白名单](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/supported_file_types.json)中？ 不在则排除。
5. **`default_path`**: 路径是否匹配任何内置测试文件排除模式（`**/*_test.go`、`**/*.test.{js,jsx,ts,tsx}`、`**/*_spec.rb`……）？ 匹配则排除。

只有通过全部 5 个门控的文件才会被发送给 LLM。`deleted` 原因（这不是门控，而是在 `Preview()` 中单独计算的）表示新路径为 `/dev/null` 的文件。没有需要审查的新内容。使用 `ocr review --preview` 可以在不消耗 token 的情况下输出此过滤结果。

### 默认路径排除

内置排除列表（参见 [`internal/config/allowlist/default_exclude_patterns.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/default_exclude_patterns.json)）匹配测试文件模式：

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

噪声目录的过滤（`vendor/`、`node_modules/`、`target/`……）发生在更早的阶段，即 [`internal/diff/git.go`](https://github.com/alibaba/open-code-review/blob/main/internal/diff/git.go) 的 diff 层，先于逐文件过滤执行。

要**审查**匹配这些测试文件模式的文件，请将其添加到用户 `include` 列表中。这会覆盖 default-path 门控。

## 逐文件规则解析

过滤决定某个文件*将被审查*后，OCR 会选择 agent 应遵循的规则文本：

1. 按声明顺序尝试 `--rule`（自定义）层。
2. 按声明顺序尝试 `<repo>/.opencodereview/rule.json`。
3. 按声明顺序尝试 `~/.opencodereview/rule.json`。
4. 回退到嵌入式系统规则层。

以下是嵌入式 `system_rules.json` 中的主要模式及其相对匹配顺序：

| 模式 | 规则文档 |
|---|---|
| `**/*.properties` | `properties.md`: i18n / 配置文件。 |
| `**/*{mapper,dao}*.xml` | `mapper_dao_xml.md`: MyBatis 格式的 mapper SQL。 |
| `**/pom.xml` | `pom_xml.md`: Maven 依赖。 |
| `**/build.gradle` | `build_gradle.md`: Gradle 依赖。 |
| `**/package.json` | `package_json.md`: NPM 依赖 / 脚本。 |
| `**/Cargo.toml` | `cargo_toml.md`: Rust manifest。 |
| `**/composer.json` | `composer_json.md`: Composer 的依赖、自动加载、脚本、插件、包配置。 |
| `**/*.{json,json5}` | `json.md`: 通用 JSON（也匹配 `.json5`）。 |
| `.github/workflows/**/*.{yaml,yml}` | `github_workflows.md`: GitHub Actions 工作流 YAML。 |
| `.github/**/*.{yaml,yml}` | `github_config.md`: 其他 `.github` 配置 YAML。 |
| `**/*.{yaml,yml}` | `yaml.md` |
| `**/*.java` | `java.md` |
| `**/*.go` | `go.md`: Go 源代码。 |
| `**/*.{ftl,ftlh,ftlx}` | `freemarker.md`: FreeMarker 模板（SSTI / XSS / null 处理）。 |
| `**/*.ets` | `arkts.md`: ArkTS / HarmonyOS。 |
| `**/*.astro` | `astro.md`: Astro 组件和 islands。 |
| `**/*.{ts,js,tsx,jsx}` | `ts_js_tsx_jsx.md` |
| `**/*.{kt}` | `kotlin.md` |
| `**/*.rs` | `rust.md` |
| `**/*.{cpp,cc,hpp}` | `cpp.md` |
| `**/*.c` | `c.md` |
| `**/*.py` | `python.md`: Python 源代码。 |
| `**/*.{php,phtml}` | `php.md`: PHP 源码和 PHP 模板。 |
| `**/*.proto` | `protobuf.md`: Protocol Buffers 的 wire 兼容性。 |
| `**/*.po` | `po.md`: gettext 翻译源目录。 |
| `**/*.pot` | `pot.md`: gettext 模板文件。 |
| `**/*.{graphql,gql}` | `graphql.md`: GraphQL schema 和操作。 |
| `**/*.prisma` | `prisma.md`: Prisma schema。 |
| `**/*.jl` | `julia.md`: Julia 源代码。 |
| `**/*.{tf,hcl,tfvars}` | `terraform.md`: Terraform / HCL。 |
| `**/*.bicep` | `bicep.md`: Bicep（Azure）模板。 |
| *(回退)* | `default.md` |

解析出的规则正文将成为 plan 和 main task prompt 中 `{{system_rule}}` 占位符的内容。

## 检查哪个规则生效: `ocr rules check`

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
…你的自定义规则的内容…
────────────────────────────────────────
```

当某个规则未按预期生效时使用此命令。它会显示生效的**层**和**模式**。

## 配方

### 项目级：强制编码规范

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

### 项目级：跳过生成代码，聚焦 src

```json
{
  "include": ["src/**/*.{ts,tsx,js,jsx}"],
  "exclude": ["**/*.gen.ts", "**/generated/**"]
}
```

设置 `include` 后，`src/` 内的文件即使本应被内置默认排除模式（如测试文件）排除，也会被保留。`src/` 之外的文件仍会经过常规的 ext / default 检查。`include` 是一种绕过机制，而非白名单。

### 按 PR 覆盖

```bash
ocr review --rule ./.review-rules-only-for-this-pr.json
```

同时绕过项目层和全局层。当单个 PR 需要完全不同的审查检查清单（例如仅进行安全审查）时非常有用。

### 全局个人设置

放在 `~/.opencodereview/rule.json` 中，你机器上的所有仓库都会继承：

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

## 相关项目

- [CLI 参考](../cli-reference/): `ocr review --rule`、`--preview`、`ocr rules check`。
- [配置](../configuration/): 配置文件位置和层级解析链。
- [架构](../architecture/): 解析后的规则如何提供给 agent prompt。