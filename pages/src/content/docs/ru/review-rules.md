---
title: 审查规则
sidebar:
  order: 7
---

规则告诉 OCR 在审查每个文件时**关注什么**。规则以 JSON 文件形式存储在三个层级，外加二进制文件中内置的系统标准。

## 优先级链

OCR 通过**四级优先级链**解析规则。对于每个文件路径，按顺序尝试各层级；第一个匹配的模板胜出。

| 优先级     | 来源           | 路径                                  | 说明                                                |
| ------------- | ------------------ | ------------------------------------- | --------------------------------------------------------- |
| 1（最高） | `--rule` 标志      | 用户自定义                      | 通过 CLI 覆盖；只要设置就始终胜出。 |
| 2             | 项目配置     | `<repoDir>/.opencodereview/rule.json` | 项目级规则——可安全提交。             |
| 3             | 全局配置  | `~/.opencodereview/rule.json`         | 用户偏好。                            |
| 4（最低）    | 系统标准 | 内置 `system_rules.json`        | 针对常见语言的内置规则。           |

如果更高优先级的文件不存在，会静默跳过——这不是错误。因此，从未添加过 `.opencodereview/rule.json` 的项目会直接落到全局/系统层级。

系统层级**始终**存在（它编译进二进制文件），因此总会解析出*某个*规则。

## 规则文件格式（层级 1–3） {#rule-file-format-layers-1-3}

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

三个独立字段：

- `include` — 可选。Glob 模板，用于*绕过*内置标准排除模板（测试文件排除——见下文）。这不是白名单：未匹配任何 `include` 模板的文件仍会经过 `unsupported_ext` 和 `default_path` 检查，仍可能被审查。
- `exclude` — 可选。OCR *不应*审查的文件的 Glob 模板。在用户过滤规则中优先级最高。
- `rules` — `{path, rule}` 记录数组，按**声明顺序**求值。第一个 glob 匹配文件的 `path` 决定 OCR 为该文件发送给模型的提示词。

`rules` 中的每条记录还接受一个可选字段：

- `merge_system_rule` — 可选，默认 `false`。为 `false`（默认）时，匹配的记录**替换**该文件的内置系统规则。为 `true` 时，保留匹配的系统规则，用户规则**与之合并**。

```json
{
  "rules": [
    {
      "path": "**/*",
      "rule": "Security review: flag hardcoded secrets, unvalidated redirects, and missing authz checks.",
      "merge_system_rule": true
    }
  ]
}
```

使用此记录，`ocr rules check src/main/java/com/example/UserService.java` 会显示两部分：

```
$ ocr rules check src/main/java/com/example/UserService.java
Source: Project (.opencodereview/rule.json)
Pattern: **/*
Rule:
────────────────────────────────────────
## System-Specific Rules (Mandatory)

…contents of java.md…

---

## User-Specific Rules (Mandatory)

Security review: flag hardcoded secrets, unvalidated redirects, and missing authz checks.
────────────────────────────────────────
```

关于此合并的构建方式，有两点值得了解：

- **系统部分按文件解析**，而非每次运行解析一次。上面的记录是 catch-all，但 `.java` 文件得到 `java.md`，`.py` 文件得到 `python.md`，OCR 不认识的扩展名回退到 `default.md`。因此一条记录就能在所有地方将你的规则叠加到正确的语言规则之上，无需枚举扩展名。
- 任一部分都可以为空。如果系统层对某文件解析为空，你只得到自己的规则；如果你的规则文本为空，你只得到系统规则。两种情况下，另一部分都不会被空内容替换。

该字段从所有三个用户层级读取——`--rule`、项目的 `.opencodereview/rule.json` 和 `~/.opencodereview/rule.json`。层级优先级不变：第一个匹配的记录仍然胜出，匹配的层级仍然遮蔽更低层级。

需要记住的限制：合并**仅**作用于**系统**层。如果你自己的两条规则匹配同一文件，第一条仍然完整胜出——`merge_system_rule` 不会将它们彼此合并。

### Glob 能力

OCR 使用 [`bmatcuk/doublestar/v4`](https://pkg.go.dev/github.com/bmatcuk/doublestar/v4) 进行匹配：

- `*` — 除 `/` 外的任意字符。
- `**` — 跨目录边界（`src/**/*.go` 覆盖任意深度）。
- `{a,b,c}` — 花括号展开。`*.{ts,tsx,js,jsx}` 展开为四个模板，依次匹配。
- `?` — 单个字符。
- `[abc]` — 字符类。

> 模板匹配**不区分大小写**（匹配前文件路径转为小写）。如有疑问，使用 `ocr rules check
<path>` 验证。

## 文件如何过滤

过滤器是 [`internal/agent/selection.go`](https://github.com/alibaba/open-code-review/blob/main/internal/agent/selection.go) 中的六步算法。对每个 diff，OCR 依次询问：

1. **`binary`** — 文件是二进制？排除。
2. **`secret_exclude`** — 旧路径或新路径命中内置敏感路径保护？如果是，排除该路径。此保护在用户规则之前应用，且不能被 `include` 模板覆盖；模板列表见[内置敏感路径](#built-in-secret-paths)章节。

3. **`user_exclude`** — 路径匹配任何用户 `exclude` 模板？排除。
4. **`user_include`** — 如果用户设置了 `include`，路径是否匹配？如果是，**立即保留**（绕过下面的 `unsupported_ext` 和 `default_path` 检查）。
5. **`unsupported_ext`** — 文件扩展名在[允许列表](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/supported_file_types.json)中？不在则排除。
6. **`default_path`** — 路径匹配内置测试文件排除模板（`**/*_test.go`、`**/*.test.{js,jsx,ts,tsx}`、`**/*_spec.rb`、…）？排除。

通过全部六项检查的文件会发送给 LLM，除非 diff 本身超过 `max_tokens` 的 80%：`selectFiles` 在检查后应用此限制，并将文件标记为 `too_large` 排除。它还会将新路径为 `/dev/null` 的文件标记为 `deleted`；没有新内容可供审查。使用 `ocr review --preview` 输出此过滤结果，不消耗任何 token。

### 内置敏感路径 {#built-in-secret-paths}

内置敏感路径不会进入审查（见 [`internal/config/allowlist/default_secret_patterns.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/default_secret_patterns.json)）：

- `**/.ssh/**`
- `**/id_rsa`
- `**/id_dsa`
- `**/id_ecdsa`
- `**/id_ed25519`
- `**/.netrc`
- `**/_netrc`
- `**/.npmrc`
- `**/.pypirc`
- `**/.dockercfg`

此外，`.env` 及任何 `.env.*` 变体也被视为敏感路径；例外是 `.env.example`、`.env.sample` 和 `.env.template` 模板。

### 标准路径排除

内置排除列表（见 [`internal/config/allowlist/default_exclude_patterns.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/default_exclude_patterns.json)）涵盖两组。第一组是各语言的测试文件，以及 fixture、快照和生成代码：

- `**/*_test.go`
- `**/src/test/java/**/*.java`
- `**/src/test/**/*.{kt,kts}`
- `**/*Test.fs`
- `**/*.test.{js,jsx,ts,tsx}`
- `**/*.spec.{js,jsx,ts,tsx}`
- `**/__tests__/**`
- `**/test/**/*_test.py`
- `**/tests/**/*_test.py`
- `**/*_test.py`
- `**/test_*.py`
- `**/*_spec.rb`
- `**/spec/**/*_spec.rb`
- `**/*Test.java`
- `**/*Tests.java`
- `**/*_test.rs`
- `**/*_tests.rs`
- `**/tests.rs`
- `**/tests/**/*.rs`
- `**/benches/**/*.rs`
- `**/oh_modules/**`
- `**/*.test.ets`
- `**/test/**/*.jl`
- `**/test/**/*.hs`
- `**/*Spec.hs`
- `**/test/**/*.lhs`
- `**/*Spec.lhs`
- `**/tests/**/*.nim`
- `**/tests/**/*.nu`
- `**/test/**/*.nu`
- `**/*_test.nu`
- `**/test_*.nu`
- `**/test-*.nu`
- `**/tests/**/*.R`
- `**/__snapshots__/**`
- `**/*.snap`
- `**/testdata/**`
- `**/fixtures/**`
- `**/.ipynb_checkpoints/**`
- `**/*.generated.*`
- `**/*.gen.go`
- `**/*.pb.go`
- `**/*.pb.cc`
- `**/*.pb.h`
- `**/*Test.swift`
- `**/*Tests.swift`
- `**/Tests/**/*.swift`
- `**/tests/**/*.elm`
- `**/vendor/**/*.{jsonnet,libsonnet}`
- `**/test/**/*.zig`
- `**/*_test.zig`
- `**/kitex_gen/**/*.go`
- `**/*.capnp.h`
- `**/*.capnp.go`
- `**/*.capnp.ts`
- `**/*_capnp.rs`
- `**/*_capnp.py`
- `**/test/**/*.ml`
- `**/tb_*.{v,sv,vhd,vhdl}`
- `**/*_tb.{v,sv,vhd,vhdl}`
- `lib/**/*.sol`
- `**/*.t.sol`
- `**/test/**/*.sol`
- `**/tests/**/*.sol`
- `**/test/**/*.vy`
- `**/tests/**/*.vy`

…以及依赖和构建目录：

- `**/node_modules/**`
- `**/bower_components/**`
- `**/vendor/**`
- `**/target/**`
- `**/dist/**`
- `**/__pycache__/**`, `**/.venv/**`, `**/site-packages/**`
- `**/Pods/**`, `**/Carthage/**`
- `**/.next/**`, `**/.nuxt/**`, `**/.gradle/**`, `**/.terraform/**`, …

`**/build/**` 和 `**/bin/**` 故意不在其中：许多项目在这些目录中存放手写源码。

同样的噪声目录也会更早地在 diff 层被过滤，见 [`internal/diff/git.go`](https://github.com/alibaba/open-code-review/blob/main/internal/diff/git.go)。该列表按路径前缀匹配，因此只捕获**仓库根目录**下的目录：`vendor/pkg/x.go` 不会到达文件过滤器，而是标记为 `provider_directory`；`api/vendor/pkg/x.go` 会到达并被作为 `default_path` 排除。只有后者可以通过 `include` 规则恢复。

要**审查**匹配这些模板之一的文件，将其添加到用户 `include` 列表——这会覆盖 default_path 阶段。

## 文件的规则解析

当过滤器决定文件*将被*审查时，OCR 选择代理应遵循的规则文本：

1. 按声明顺序尝试 `--rule`（用户自定义）层级。
2. 按声明顺序尝试 `<repo>/.opencodereview/rule.json`。
3. 按声明顺序尝试 `~/.opencodereview/rule.json`。
4. 回退到内置系统规则层级。

内置 `system_rules.json` 中的所有模板按相对匹配顺序列于下方：

| 模板                                          | 规则文档                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `**/*.properties`                               | `properties.md` — i18n / 配置文件。                                                     |
| `**/*{mapper,dao}*.xml`                         | `mapper_dao_xml.md` — MyBatis 风格 mapper SQL。                                                  |
| `**/pom.xml`                                    | `pom_xml.md` — Maven 依赖。                                                                |
| `**/build.gradle`                               | `build_gradle.md` — Gradle 依赖。                                                          |
| `**/package.json`                               | `package_json.md` — NPM 依赖 / 脚本。                                                   |
| `**/Cargo.toml`                                 | `cargo_toml.md` — Rust 清单。                                                                 |
| `**/Move.toml` | `move_toml.md` — Move 包清单。 |
| `**/*.move` | `move.md` — Move 源代码。 |
| `**/composer.json`                              | `composer_json.md` — Composer 依赖、自动加载、脚本、插件和包配置。 |
| `**/*.{json,json5,jsonc}`                       | `json.md` — 普通 JSON（也匹配 `.json5` 和 `.jsonc`）。 |
| `.github/workflows/**/*.{yaml,yml}`             | `github_workflows.md` — GitHub Actions YAML workflow。                                            |
| `.github/**/*.{yaml,yml}`                       | `github_config.md` — 其他 `.github` 配置 YAML。                                     |
| `**/*.{yaml,yml}`                               | `yaml.md`                                                                                        |
| `**/*.java`                                     | `java.md`                                                                                        |
| `**/*.go`                                       | `go.md` — Go 源代码。                                                                       |
| `**/*.{ftl,ftlh,ftlx}`                          | `freemarker.md` — FreeMarker 模板（SSTI / XSS / null 处理）。                              |
| `**/*.{hbs,mustache}`                           | `handlebars_mustache.md` — Handlebars 和 Mustache 模板。                                        |
| `**/*.{jinja2,j2}`                              | `jinja.md` — Jinja 模板                                                                       |
| `**/*.pug`                          | `pug.md` — Pug 模板。                                                                          |
| `**/*.{ejs,liquid,njk}`                         | `ejs_liquid_njk.md` — EJS、Liquid 和 Nunjucks 模板（SSTI / XSS / 转义）。 |
| `**/*.{haml,slim}`                              | `haml_slim.md` — HAML 和 Slim 模板（SSTI / XSS / 转义 / 缩进语义）。 |
| `**/*.erb`                                      | `erb.md` — ERB 模板（SSTI / XSS / 转义 / 空白和输出结构）。 |
| `**/*.ets`                                      | `arkts.md` — ArkTS / HarmonyOS。                                                                  |
| `**/*.astro`                                    | `astro.md` — Astro 组件和 islands。                                                         |
| `**/*.{ts,js,tsx,jsx,mjs,cjs,mts,cts}`          | `ts_js_tsx_jsx.md`                                                                               |
| `**/*.{kt,kts}`                                 | `kotlin.md`                                                                                      |
| `**/*.scala`                                    | `scala.md` |
| `**/*.{fs,fsi,fsx}`                             | `fsharp.md` — F# 实现、签名和脚本文件。                                          |
| `**/*.cs`                                       | `csharp.md` — C# 源文件。 |
| `**/*.rs`                                       | `rust.md`                                                                                        |
| `**/*.{cpp,cc,cxx,hpp,hxx}`                     | `cpp.md`                                                                                         |
| `**/*.c`                                        | `c.md`                                                                                           |
| `**/*.{cu,cuh}`                                 | `cuda_hip.md` — CUDA 内核和头文件。                                                           |
| `**/*.hip`                                      | `cuda_hip.md` — HIP 内核（AMD ROCm）。                                                             |
| `**/*.{py,pyi,ipynb}`                           | `python.md` — Python 源代码。                                                               |
| `**/*.{rb,rake}`, `**/*.gemspec`, `**/{Gemfile,Rakefile}` | `ruby.md` — Ruby 源代码、Rake 任务、gemspec、Gemfile 和 Rakefile。 |
| `**/*.{php,phtml}`                              | `php.md` — PHP 源代码和 PHP 模板。                                                       |
| `**/*.proto`                                    | `protobuf.md` — Protocol Buffers wire 级兼容性。                                   |
| `**/*.po`                                       | `po.md` — gettext 翻译源目录。                                                   |
| `**/*.pot`                                      | `pot.md` — gettext 模板文件。                                                               |
| `**/*.{graphql,gql}`                            | `graphql.md` — GraphQL Schema 和操作。                                                         |
| `