---
title: 安装
sidebar:
  order: 4
---

安装 `ocr` CLI 有 5 种受支持的方式。

## NPM（推荐）

#### 安装

```bash
npm install -g @alibaba-group/open-code-review
```

固定到特定版本：

```bash
npm install -g @alibaba-group/open-code-review@<version>
```

#### 更新

通过 NPM 安装时，`ocr` 默认会自动保持最新
（静态二进制不受此机制影响）。每次运行 `ocr` 时，wrapper 会在
后台静默检查 registry 上的最新版本，发现更新后自动升级，
且不影响本次审查。检查之间有 18 分钟冷却时间，可通过
`OCR_UPDATE_INTERVAL`（分钟）调整。

要关闭自动更新，将 `OCR_NO_UPDATE` 设为任意非空值。

```bash
export OCR_NO_UPDATE=1
```

#### 卸载

```bash
npm uninstall -g @alibaba-group/open-code-review
```

## Homebrew（macOS / Linux）

```bash
brew install open-code-review
```

该 formula 从源码构建并安装 `ocr` 二进制。

后续升级：

```bash
brew upgrade open-code-review
```

## 安装脚本（curl | sh）

这是一个便捷安装器，封装了 GitHub Release 二进制的下载（带校验）——适合 CI 基础
镜像或无头环境。

```bash
curl -fsSL https://open-codereview.ai/install.sh | sh
```

识别 3 个环境变量。

| 变量 | 默认值 | 用途 |
|---|---|---|
| `OCR_INSTALL_DIR` | `/usr/local/bin` | `ocr` 二进制的放置位置。 |
| `OCR_VERSION` | 最新 release | 固定到特定 release tag（例如：`v1.2.3`）。 |
| `OCR_GITHUB_MIRROR` | （未设置） | 通过 GitHub 镜像域名下载发布二进制及其校验和（例如：`gh-proxy.com`）。 |

该脚本支持 `darwin` 和 `linux` 的 `amd64` / `arm64`。

#### 使用 GitHub 镜像

部分地区访问 GitHub 网络较慢，可将 `OCR_GITHUB_MIRROR` 设为镜像域名，通过镜像下载发布二进制及其校验和：

```bash
export OCR_GITHUB_MIRROR='YOUR_MIRROR_DOMAIN'
```

值必须是不含协议和末尾斜杠的裸域名（`gh-proxy.com`，而非 `https://gh-proxy.com/`）。它作为*路径前缀*镜像使用。二进制将从
`https://<镜像>/github.com/alibaba/open-code-review/releases/download/<版本>/…`
获取。域名替换型镜像（例如将 `github.com` 重写为 `hub.example.org`）不符合此格式——请使用路径前缀型镜像。

镜像同时覆盖发布二进制及其 `sha256sum.txt` 校验和。版本解析（`OCR_VERSION` 未设置时）仍直接调用 GitHub API，而非镜像。要完全跳过版本解析，请固定版本：

```bash
export OCR_VERSION='v1.2.3'
```

> **安全提示：** 镜像是第三方服务，设置 `OCR_GITHUB_MIRROR` 后，二进制及其 `sha256sum.txt` 均从镜像下载。也就是说，恶意镜像可以同时分发被篡改的二进制和与之匹配的校验和。因此，镜像模式下没有完整性保证。若不信任镜像，请与 [releases 页面](https://github.com/alibaba/open-code-review/releases) 上游的 `sha256sum.txt` 对照验证。

Windows（PowerShell 5.1+）请改用 PowerShell 安装器：

```powershell
irm https://open-codereview.ai/install.ps1 | iex
```

同样识别 `OCR_INSTALL_DIR`、`OCR_VERSION`、`OCR_GITHUB_MIRROR`
（通过 `$env:OCR_INSTALL_DIR` / `$env:OCR_VERSION` /
`$env:OCR_GITHUB_MIRROR` 设置）。默认安装位置为
`%LOCALAPPDATA%\Programs\ocr`。

## GitHub Release 二进制

不想安装 Node.js 时，可直接从
[releases 页面](https://github.com/alibaba/open-code-review/releases) 获取
静态二进制。

```bash
# macOS (Apple Silicon)
curl -Lo ocr https://github.com/alibaba/open-code-review/releases/latest/download/opencodereview-darwin-arm64
chmod +x ocr && sudo mv ocr /usr/local/bin/ocr

# macOS (Intel)
curl -Lo ocr https://github.com/alibaba/open-code-review/releases/latest/download/opencodereview-darwin-amd64
chmod +x ocr && sudo mv ocr /usr/local/bin/ocr

# Linux x86_64
curl -Lo ocr https://github.com/alibaba/open-code-review/releases/latest/download/opencodereview-linux-amd64
chmod +x ocr && sudo mv ocr /usr/local/bin/ocr

# Linux ARM64
curl -Lo ocr https://github.com/alibaba/open-code-review/releases/latest/download/opencodereview-linux-arm64
chmod +x ocr && sudo mv ocr /usr/local/bin/ocr

# Windows (AMD64)
curl -Lo ocr.exe https://github.com/alibaba/open-code-review/releases/latest/download/opencodereview-windows-amd64.exe

# Windows (ARM64)
curl -Lo ocr.exe https://github.com/alibaba/open-code-review/releases/latest/download/opencodereview-windows-arm64.exe
```

每个 release 还会在二进制旁发布 `sha256sum.txt`，可用于验证完整性。

```bash
curl -LO https://github.com/alibaba/open-code-review/releases/latest/download/sha256sum.txt
shasum -a 256 -c sha256sum.txt --ignore-missing
```

## 从源码构建

仅在需要修改 OCR 本身，或要在没有预编译二进制的平台上运行时，才需要此方式。

#### 前提条件

- [Go ≥ 1.26.10](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

#### 构建

```bash
git clone https://github.com/alibaba/open-code-review.git
cd open-code-review
make build              # 生成 dist/opencodereview（Windows 上为 dist/opencodereview.exe）
sudo cp dist/opencodereview /usr/local/bin/ocr
```

#### 为其他平台构建

```bash
make build-linux-amd64
make build-linux-arm64
make build-darwin-amd64
make build-darwin-arm64
make build-windows-amd64   # Windows (x86_64)
make build-windows-arm64   # Windows (ARM64)
make build-all          # 一次性构建全部 6 个
make sha256sum          # 同时生成 sha256sum.txt
```

`make dist` 执行 `clean → build-all → sha256sum`，并在二进制旁写入
`VERSION` 文件——这正是 release 流水线执行的步骤。

#### 运行测试

```bash
make test               # LC_ALL=C go test -v -race -count=1 ./...
```

## 验证安装

无论二进制来自何处：

```bash
ocr version             # 输出版本 + git commit + 构建时间
ocr --help              # 顶层用法
ocr review --help       # review 命令的完整参数列表
```

若出现 "command not found" 错误，请确认安装目录在 `$PATH` 上。

```bash
which ocr
echo $PATH
```

## 启用 Shell 补全（可选）

`ocr` 支持 bash、zsh、fish、PowerShell 的 Tab 补全。

```bash
# bash
source <(ocr completion bash)

# zsh
ocr completion zsh > "${fpath[1]}/_ocr"
```

fish、PowerShell 及持久化的详细配置方法请参阅 [CLI 参考](./cli-reference.md#ocr-completion)。


## OCR 保存状态的位置

| 路径 | 保存内容 |
|---|---|
| `~/.opencodereview/config.json` | LLM 端点、语言、遥测配置（通过 `ocr config set` 管理）。 |
| `~/.opencodereview/rule.json` | 可选的全局审查规则。 |
| `~/.opencodereview/sessions/<encoded-repo-path>/<session-id>.jsonl` | 每次审查会话的流式 JSONL 记录。供 `ocr viewer` 使用。 |
| `~/.opencodereview/{last-update-check,update.lock,update-available}` | NPM wrapper 后台更新检查的状态。wrapper 轮询是否有更新的 release（默认约每 18 分钟一次），并显示升级提示。用 `OCR_NO_UPDATE=1` 禁用，或用 `OCR_UPDATE_INTERVAL`（分钟）调整间隔。静态二进制不会写入这些文件。 |
| `<repo>/.opencodereview/rule.json` | 可选的项目级审查规则——可安全提交。 |

OCR 绝不会写入 `~/.opencodereview/` 之外（NPM 临时下载二进制的情况除外）。
删除该目录即可完成干净卸载。

## 相关条目

- [快速开始](../quickstart/)——配置 LLM 并完成首次审查。
- [配置](../configuration/)——OCR 接受的各环境变量与 config key。
- [贡献](../contributing/)——从源码构建、运行测试并参与开发。