---
title: 安装
sidebar:
  order: 4
---

安装 `ocr` CLI 有六种受支持的方法。

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

通过 NPM 安装时，`ocr` 默认会自动保持最新状态
（静态二进制文件不在此机制范围内）。每次运行 `ocr` 时，wrapper 都会
在后台静默检查 registry 中的最新版本，如果发现更新，
会在不影响本次审查的情况下自动升级。检查之间有
18 分钟的冷却时间，可通过 `OCR_UPDATE_INTERVAL`（分钟）进行调整。

要关闭自动更新，请将 `OCR_NO_UPDATE` 设置为任意非空值。

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

此 formula 会从源码构建并安装 `ocr` 二进制文件。

之后升级：

```bash
brew upgrade open-code-review
```

## MacPorts（macOS）

```bash
sudo port install open-code-review
```

此 port 会从源码构建并安装 `ocr` 二进制文件。

之后升级：

```bash
sudo port upgrade open-code-review
```

## 安装脚本（curl | sh）

一个便捷的安装器，封装了 GitHub Release 二进制的下载（带验证）——适用于 CI 基础
镜像或无人值守环境。

```bash
curl -fsSL https://open-codereview.ai/install.sh | sh
```

它识别两个环境变量。

| 变量 | 默认值 | 用途 |
|---|---|---|
| `OCR_INSTALL_DIR` | `/usr/local/bin` | `ocr` 二进制的放置位置。 |
| `OCR_VERSION` | 最新 release | 固定到特定 release tag（例如：`v1.2.3`）。 |

此脚本支持 `darwin` 和 `linux` 的 `amd64` / `arm64` 架构。

在 Windows（PowerShell 5.1+）上，请改用 PowerShell 安装器：

```powershell
irm https://open-codereview.ai/install.ps1 | iex
```

它同样识别 `OCR_INSTALL_DIR` 和 `OCR_VERSION`（通过 `$env:OCR_INSTALL_DIR` /
`$env:OCR_VERSION` 设置）。默认安装位置是
`%LOCALAPPDATA%\Programs\ocr`。

## GitHub Release 二进制文件

如果不想安装 Node.js，可以直接从
[releases 页面](https://github.com/alibaba/open-code-review/releases) 获取
静态二进制文件。

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

每个 release 在二进制文件旁边还会发布 `sha256sum.txt`，可用于验证完整性。

```bash
curl -LO https://github.com/alibaba/open-code-review/releases/latest/download/sha256sum.txt
shasum -a 256 -c sha256sum.txt --ignore-missing
```

## 从源码构建

仅在需要修改 OCR 本身，或在没有预编译二进制的平台上运行时，才需要此方法。

#### 前提条件

- [Go ≥ 1.25](https://go.dev/dl/)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/)

#### 构建

```bash
git clone https://github.com/alibaba/open-code-review.git
cd open-code-review
make build              # 生成 dist/opencodereview
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

`make dist` 会执行 `clean → build-all → sha256sum`，并在二进制文件旁边写入
`VERSION` 文件——这正是 release 流水线所执行的步骤。

#### 运行测试

```bash
make test               # LC_ALL=C go test -v -race -count=1 ./...
```

## 验证安装

无论二进制文件来自何处：

```bash
ocr version             # 输出版本 + git commit + 构建时间
ocr --help              # 顶层用法
ocr review --help       # review 命令的完整参数列表
```

如果出现 "command not found" 错误，请确认安装位置在 `$PATH` 中。

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

关于 fish、PowerShell 以及持久化配置的详细方法，请参阅 [CLI 参考](./cli-reference.md#ocr-completion)。


## OCR 存储状态的位置

| 路径 | 存储内容 |
|---|---|
| `~/.opencodereview/config.json` | LLM 端点、语言、遥测设置（通过 `ocr config set` 管理）。 |
| `~/.opencodereview/rule.json` | 可选的全局审查规则。 |
| `~/.opencodereview/sessions/<encoded-repo-path>/<session-id>.jsonl` | 每个审查会话的流式 JSONL 转录。供 `ocr viewer` 使用。 |
| `~/.opencodereview/{last-update-check,update.lock,update-available}` | NPM wrapper 的后台更新检查状态。wrapper 会轮询是否有更新版本（默认约每 18 分钟一次），并显示升级提示。可通过 `OCR_NO_UPDATE=1` 禁用，或通过 `OCR_UPDATE_INTERVAL`（分钟）调整间隔。静态二进制文件不会写入这些文件。 |
| `<repo>/.opencodereview/rule.json` | 可选的项目级审查规则——可以安全地提交。 |

OCR 绝不会在 `~/.opencodereview/` 之外写入任何内容（NPM 临时下载二进制文件的情况除外）。
删除此目录即可完成干净卸载。

## 相关页面

- [快速开始](../quickstart/)——配置 LLM 并完成首次审查。
- [配置](../configuration/)——OCR 接受的各种环境变量和 config key。
- [贡献](../contributing/)——从源码构建、运行测试并参与开发。