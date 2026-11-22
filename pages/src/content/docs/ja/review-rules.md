---
title: 审查规则
sidebar:
  order: 7
---

规则告诉 OCR 在审查每个文件时**应关注什么**。规则存储在 3 层 JSON 文件中，此外还有随二进制一同打包的内置系统默认规则。

## 优先级链

OCR 按**4 层优先级链**解析规则。对于每个文件路径，依次尝试各层，第一个匹配的模式生效。

| 优先级 | 来源 | 路径 | 说明 |
| --------- | ------------------ | ------------------------------------- | -------------------------------------------------------- |
| 1（最高） | `--rule` 参数 | 用户指定 | CLI 覆盖。只要指定就始终生效。 |
| 2 | 项目配置 | `<repoDir>/.opencodereview/rule.json` | 项目级规则。可安全提交。 |
| 3 | 全局配置 | `~/.opencodereview/rule.json` | 用户级偏好。 |
| 4（最低） | 系统默认 | 内置 `system_rules.json` | 覆盖常见语言的内置规则。 |

较高优先级层的文件不存在时会静默跳过，不算错误。因此从未添加过 `.opencodereview/rule.json` 的项目会直接落到全局 / 系统层。

系统层**始终**存在（随二进制打包），因此必定会解析出*某种*规则。

## 规则文件格式（第 1〜3 层） {#rule-file-format-layers-1-3}

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

共有 3 个独立字段：

- `include`：可选。用于*绕过*内置默认排除模式（测试文件排除，见下文）的 glob 模式。它不是白名单。不匹配任何 `include` 模式的文件仍会通过 `unsupported_ext` 和 `default_path` 检查，仍可能被审查。
- `exclude`：可选。OCR 不审查的文件的 glob 模式。在用户配置的过滤器中优先级最高。
- `rules`：`{path, rule}` 条目数组，按**声明顺序**求值。第一个匹配该文件的 `path` glob 条目决定 OCR 发送给模型的 prompt。

每个 `rules` 条目还接受一个可选的第三个字段：

- `merge_system_rule` — 可选。默认 `false`。为 `false`（默认）时，匹配的条目会**替换**该文件的内置系统规则。为 `true` 时，保留匹配的系统规则，并与用户规则**合并**。

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

添加此条目后，`ocr rules check src/main/java/com/example/UserService.java`
会报告两部分：

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

关于合并如何组装，有两点值得了解：

- **系统侧部分按文件解析**（而非每次运行解析一次）。上面的条目是通用条目，但 `.java` 文件会使用 `java.md`，`.py` 文件会使用 `python.md`，OCR 不认识的扩展名会使用 `default.md`。因此一个条目就能在无需枚举扩展名的情况下，在所有位置将你的规则叠加到合适的语言规则之上。
- 两部分都可能为空。若系统层对该文件解析为空，则只得到你的规则。若你的规则文本为空，则只得到系统规则。两种情况下都只使用剩下的那一半，另一半不会被任何占位符填充。

该字段会从全部 3 个用户层读取 — `--rule`、项目的 `.opencodereview/rule.json`、`~/.opencodereview/rule.json`。层优先级不变。第一个匹配的条目仍然胜出，匹配的层仍然会遮蔽其下的层。

需要记住的限制：合并只作用于**系统**层。若你自己的两个条目匹配同一文件，仍然是第一个完全胜出 — `merge_system_rule` 不会将它们彼此合并。

### glob 的功能

OCR 使用 [`bmatcuk/doublestar/v4`](https://pkg.go.dev/github.com/bmatcuk/doublestar/v4) 进行匹配：

- `*`：匹配除 `/` 以外的任意字符。
- `**`：跨目录边界匹配（`src/**/*.go` 覆盖任意深度）。
- `{a,b,c}`：花括号展开。`*.{ts,tsx,js,jsx}` 展开为 4 个模式，依次尝试匹配。
- `?`：匹配单个字符。
- `[abc]`：字符类。

> 模式匹配**不区分大小写**（匹配前文件路径会转为小写）。不确定时请用 `ocr rules check <path>` 确认。

## 文件如何被过滤

过滤是 6 阶段的门控算法，位于 [`internal/agent/selection.go`](https://github.com/alibaba/open-code-review/blob/main/internal/agent/selection.go)。对于每个 diff，OCR 依次询问：

1. **`binary`**：文件是二进制吗？ 排除。
2. **`secret_exclude`**：旧路径或新路径是否命中内置的密钥路径保护？ 命中则排除。该保护先于用户规则应用，无法通过 `include` 模式覆盖。模式列表见下文[内置密钥路径](#built-in-secret-paths)。

3. **`user_exclude`**：路径是否匹配任一用户 `exclude` 模式？ 排除。
4. **`user_include`**：若用户定义了 `include`，路径是否匹配？ 匹配则**立即保留**（绕过下文的 `unsupported_ext` 和 `default_path` 门控）。
5. **`unsupported_ext`**：文件扩展名是否在[白名单](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/supported_file_types.json)中？ 不在则排除。
6. **`default_path`**：路径是否匹配任一内置测试文件排除模式（`**/*_test.go`、`**/*.test.{js,jsx,ts,tsx}`、`**/*_spec.rb`……）？ 排除。

只有通过全部 6 个门控的文件才会发送给 LLM。例外：若仅 diff 就超过 `max_tokens` 的 80%，`selectFiles` 会在门控之后应用该上限，将该文件作为 `too_large` 排除。同样，新路径为 `/dev/null` 的文件会标记为 `deleted`，没有需要审查的新内容。使用 `ocr review --preview` 可在不消耗 token 的情况下输出该过滤结果。

### 内置密钥路径 {#built-in-secret-paths}

内置密钥路径不会被审查（参见
[`internal/config/allowlist/default_secret_patterns.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/default_secret_patterns.json)）：

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

此外，`.env` 及 `.env.*` 的各种变体（`.env.example`、`.env.sample`、`.env.template` 除外）也视为密钥路径。

### 默认路径排除

内置排除列表（参见 [`internal/config/allowlist/default_exclude_patterns.json`](https://github.com/alibaba/open-code-review/blob/main/internal/config/allowlist/default_exclude_patterns.json)）针对两组。第一组是各语言的测试文件，外加测试 fixture、快照和生成代码：

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

……以及依赖和构建输出目录：

- `**/node_modules/**`
- `**/bower_components/**`
- `**/vendor/**`
- `**/target/**`
- `**/dist/**`
- `**/__pycache__/**`、`**/.venv/**`、`**/site-packages/**`
- `**/Pods/**`、`**/Carthage/**`
- `**/.next/**`、`**/.nuxt/**`、`**/.gradle/**`、`**/.terraform/**`……

`**/build/**` 和 `**/bin/**` 有意未包含，因为许多项目将手写源码放在那里。

相同目录也会在更早的 [`internal/diff/git.go`](https://github.com/alibaba/open-code-review/blob/main/internal/diff/git.go) diff 层被过滤。该列表按路径前缀匹配，因此只捕获**仓库根目录**下的目录。`vendor/pkg/x.go` 不会到达逐文件过滤器，而是报告为 `provider_directory`；`api/vendor/pkg/x.go` 会到达并被 `default_path` 排除。`include` 规则只能恢复后者。

要**审查**匹配上述任一模式的文件，请将其添加到用户 `include` 列表。这会覆盖 default-path 门控。

## 逐文件规则解析

过滤决定某文件*会被审查*后，OCR 选择 agent 应遵循的规则文本：

1. 按声明顺序尝试 `--rule`（custom）层。
2. 按声明顺序尝试 `<repo>/.opencodereview/rule.json`。
3. 按声明顺序尝试 `~/.opencodereview/rule.json`。
4. 回退到内置系统规则层。

以下列出内置 `system_rules.json` 的所有模式，按相对匹配顺序：

| 模式 | 规则文档 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `**/*.properties`                               | `properties.md`：i18n / 配置文件。 |
| `**/*{mapper,dao}*.xml`                         | `mapper_dao_xml.md`：MyBatis 形式的 mapper SQL。 |
| `**/pom.xml`                                    | `pom_xml.md`：Maven 依赖。 |
| `**/build.gradle`                               | `build_gradle.md`：Gradle 依赖。 |
| `**/package.json`                               | `package_json.md`：NPM 依赖 / 脚本。 |
| `**/Cargo.toml`                                 | `cargo_toml.md`：Rust manifest。 |
| `**/Move.toml` | `move_toml.md`：Move 包 manifest。 |
| `**/*.move` | `move.md`：Move 源代码。 |
| `**/composer.json`                              | `composer_json.md`：Composer 依赖、自动加载、脚本、插件、包配置。 |
| `**/*.{json,json5,jsonc}`                       | `json.md`：通用 JSON（也匹配 `.json5` 和 `.jsonc`）。 |
| `.github/workflows/**/*.{yaml,yml}`             | `github_workflows.md`：GitHub Actions 工作流 YAML。 |
| `.github/**/*.{yaml,yml}`                       | `github_config.md`：其他 `.github` 配置 YAML。 |
| `**/*.{yaml,yml}`                               | `yaml.md` |
| `**/*.java`                                     | `java.md` |
| `**/*.go`                                       | `go.md`：Go 源代码。 |
| `**/*.{ftl,ftlh,ftlx}`                          | `freemarker.md`：FreeMarker 模板（SSTI / XSS / null 处理）。 |
| `**/*.{hbs,mustache}`                           | `handlebars_mustache.md`：Handlebars / Mustache 模板。 |
| `**/*.{jinja2,j2}`                              | `jinja.md`：Jinja 模板 |
| `**/*.pug`                          | `pug.md`：Pug 模板。 |
| `**/*.{ejs,liquid,njk}`                         | `ejs_liquid_njk.md`：EJS / Liquid / Nunjucks 模板（SSTI / XSS / 转义）。 |
| `**/*.{haml,slim}`                              | `haml_slim.md`：HAML / Slim 模板（SSTI / XSS / 转义 / 缩进语义）。 |
| `**/*.erb`                                      | `erb.md`：ERB 模板（SSTI / XSS / 转义 / 空白与输出结构）。 |
| `**/*.ets`                                      | `arkts.md`：ArkTS / HarmonyOS。 |
| `**/*.astro`                                    | `astro.md`：Astro 组件与 islands。 |
| `**/*.{ts,js,tsx,jsx,mjs,cjs,mts,cts}`          | `ts_js_tsx_jsx.md` |
| `**/*.{kt,kts}`                                 | `kotlin.md` |
| `**/*.scala`                                    | `scala.md` |
| `**/*.{fs,fsi,fsx}`                             | `fsharp.md`：F# 实现、签名、脚本文件。 |
| `**/*.cs`                                       | `csharp.md`：C# 源文件。 |
| `**/*.rs`                                       | `rust.md` |
| `**/*.{cpp,cc,cxx,hpp,hxx}`                     | `cpp.md` |
| `**/*.c`                                        | `c.md` |
| `**/*.{cu,cuh}`                                 | `cuda_hip.md`：CUDA 内核与头文件。 |
| `**/*.hip`                                      | `cuda_hip.md`：HIP（AMD ROCm）内核。 |
| `**/*.{py,pyi,ipynb}`                           | `python.md`：Python 源代码。 |
| `**/*.{rb,rake}`, `**/*.gemspec`, `**/{Gemfile,Rakefile}` | `ruby.md`：Ruby 源码、Rake 任务、gemspec、Gemfile、Rakefile。 |
| `**/*.{php,phtml}`                              | `php.md`：PHP 源码与 PHP 模板。 |
| `**/*.proto`                                    | `protobuf.md`：Protocol Buffers 线格式兼容性。 |
| `**/*.po`                                       | `po.md`：gettext 翻译源目录。 |
| `**/*.pot`                                      | `pot.md`：gettext 模板文件。 |
| `**/*.{graphql,gql}`                            | `graphql.md`：GraphQL Schema 与操作。 |
| `**/*.prisma`                                   | `prisma.md`：Prisma Schema。 |
| `**/*.jl`                                       | `j