---
title: 安装
sidebar:
  order: 4
---

安装 CLI `ocr` 有五种方式。

## npm（推荐）

#### 安装

```bash
npm install -g @alibaba-group/open-code-review
```

固定特定版本：

```bash
npm install -g @alibaba-group/open-code-review@<version>
```

#### 更新

通过 npm 安装时，`ocr` 会自动更新。静态二进制文件不参与此机制。每次启动时，包装器会在后台检查 npm 仓库，并在不中断当前审查的情况下安装发现的更新。检查间隔为 18 分钟。可通过 `OCR_UPDATE_INTERVAL`（以分钟为单位）修改。

要禁用自动更新，将 `OCR_NO_UPDATE` 设为任意非空值：

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

该 Formula 从源码构建 `ocr` 并安装二进制文件。

更新：

```bash
brew upgrade open-code-review
```

## 安装脚本（curl | sh）

安装器从 GitHub Release 下载二进制文件并校验其校验和。适用于基础 CI 镜像和无图形界面的系统：

```bash
curl -fsSL https://open-codereview.ai/install.sh | sh
```

脚本识别三个环境变量：

| 变量 | 默认值 | 用途 |
|---|---|---|
| `OCR_INSTALL_DIR` | `/usr/local/bin` | `ocr` 二进制文件的放置位置。 |
| `OCR_VERSION` | 最新发布版本 | 固定特定发布标签（例如 `v1.2.3`）。 |
| `OCR_GITHUB_MIRROR` | 未设置 | 通过 GitHub 镜像下载发布二进制文件及其校验和（例如 `gh-proxy.com`）。 |

脚本支持 `darwin` 和 `linux` 上的 `amd64` / `arm64`。

#### 使用 GitHub 镜像

某些地区访问 GitHub 可能较慢。将 `OCR_GITHUB_MIRROR` 设为镜像域名，以通过它下载发布二进制文件及其校验和：

```bash
export OCR_GITHUB_MIRROR='YOUR_MIRROR_DOMAIN'
```

值必须是“裸”域名——不带 `https://` 协议，也不带末尾斜杠（`gh-proxy.com`，而非 `https://gh-proxy.com/`）。它作为*路径前缀*镜像使用：二进制文件从
`https://<镜像>/github.com/alibaba/open-code-review/releases/download/<版本>/…` 下载。
域名替换型镜像（例如将 `github.com` 重写为 `hub.example.org`）不适用此形式——请使用路径前缀镜像。

镜像同时覆盖发布二进制文件及其 `sha256sum.txt` 校验和。版本解析（未设置 `OCR_VERSION` 时）仍直接访问 GitHub API，而非镜像。要完全跳过版本解析，请固定版本：

```bash
export OCR_VERSION='v1.2.3'
```

> **安全提示：** 镜像是第三方服务，因此设置 `OCR_GITHUB_MIRROR` 后，二进制文件及其 `sha256sum.txt` 均从镜像下载。这意味着恶意镜像可以返回被替换的二进制文件及匹配的校验和；镜像模式下完整性保证不生效。如果镜像不可信，请将下载的文件与[发布页面](https://github.com/alibaba/open-code-review/releases)上的原始 `sha256sum.txt` 进行比对。

在 Windows 上使用 PowerShell 5.1 或更高版本运行 PowerShell 安装器：

```powershell
irm https://open-codereview.ai/install.ps1 | iex
```

安装器识别相同的 `OCR_INSTALL_DIR`、`OCR_VERSION` 和
`OCR_GITHUB_MIRROR` 变量（通过 `$env:OCR_INSTALL_DIR` /
`$env:OCR_VERSION` / `$env:OCR_GITHUB_MIRROR`）。默认情况下文件
安装到 `%LOCALAPPDATA%\Programs\ocr`。

## 从 GitHub Release 获取二进制文件

如果不需要 Node.js，可直接从[发布页面](https://github.com/alibaba/open-code-review/releases)下载静态二进制文件：

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

每个发布版本附带包含校验和的 `sha256sum.txt` 文件。可用它校验下载文件的完整性：

```bash
curl -LO https://github.com/alibaba/open-code-review/releases/latest/download/sha256sum.txt
shasum -a 256 -c sha256sum.txt --ignore-missing
```

## 从源码构建

如果你在开发 OCR，或你的平台没有预编译二进制文件，则需要从源码构建。

#### 前置要求

- [Go ≥ 1.26.10](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

#### 构建

```bash
git clone https://github.com/alibaba/open-code-review.git
cd open-code-review
make build              # 输出 dist/opencodereview（Windows 为 dist/opencodereview.exe）
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
make build-all          # 一次构建全部六个
make sha256sum          # 同时生成 sha256sum.txt
```

`make dist` 执行 `clean → build-all → sha256sum`，并将 `VERSION` 文件保存到二进制文件所在目录。官方发布版本也以此方式构建。

#### 运行测试

```bash
make test               # LC_ALL=C go test -v -race -count=1 ./...
```

## 验证安装

无论通过何种方式获取二进制文件：

```bash
ocr version             # 版本 + git commit + 构建日期
ocr --help              # 顶层帮助
ocr review --help       # review 命令的完整标志列表
```

如果看到“command not found”错误，请确认安装目录在 `$PATH` 中：

```bash
which ocr
echo $PATH
```

## 启用 Shell 自动补全（可选）

`ocr` 支持 bash、zsh、fish 和 PowerShell 的 Tab 自动补全。

```bash
# bash
source <(ocr completion bash)

# zsh
ocr completion zsh > "${fpath[1]}/_ocr"
```

fish、PowerShell 及永久配置的详情参见
[CLI Reference](./cli-reference.md#ocr-completion)。


## OCR 状态存储位置

| 路径 | 内容 |
|---|---|
| `~/.opencodereview/config.json` | LLM 端点、语言和遥测设置（通过 `ocr config set` 管理）。 |
| `~/.opencodereview/rule.json` | 可选的全局审查规则。 |
| `~/.opencodereview/sessions/<encoded-repo-path>/<session-id>.jsonl` | 每次审查会话的 JSONL 格式日志，供 `ocr viewer` 使用。 |
| `~/.opencodereview/{last-update-check,update.lock,update-available}` | npm 包装器后台更新检查状态。包装器轮询新发布版本（默认约每 18 分钟一次）并打印更新提示。禁用：`OCR_NO_UPDATE=1`；间隔：`OCR_UPDATE_INTERVAL`（分钟）。静态二进制文件不写入这些文件。 |
| `<repo>/.opencodereview/rule.json` | 可选的特定项目审查规则文件。可存储在仓库中。 |

OCR 不在 `~/.opencodereview/` 之外存储持久数据：例外是通过 npm 安装时临时下载的二进制文件。删除该目录会完全清除 OCR 的本地数据。

## 另见

- [快速开始](../quickstart/)：配置 LLM 并进行首次审查。
- [配置](../configuration/)：OCR 识别的所有环境变量和配置键。
- [参与开发](../contributing/)：从源码构建、测试和改进 OCR。