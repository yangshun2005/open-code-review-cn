#### 安全性
- **`pull_request_target` 误用**：将 `pull_request_target` 与 `actions/checkout` 结合使用并引用 PR 头部代码是危险的——它会以写入权限运行不受信任的代码。如果检出引用指向 PR 头部且没有隔离，则标记。
- **密钥泄露**：密钥不得打印到日志中（例如，`echo ${{ secrets.X }}`）。确保密钥仅通过 `env:` 块传递给需要它们的步骤。
- **权限过大**：检查 `permissions` 是否设置为最小权限。标记 `permissions: write-all` 或缺少 `permissions` 键（默认为广泛访问权限）。每个作业应仅声明其所需的权限。
- **未固定操作版本**：第三方操作应固定到完整的提交 SHA（例如，`uses: actions/checkout@<sha>`），而不仅仅是标签。标签是可变的，可能被劫持。第一方（`actions/*`）固定到 `v4` 是可接受的。
- **脚本注入**：像 `${{ github.event.issue.title }}` 这样的表达式直接用于 `run:` 块中会引发代码注入。这些必须通过环境变量传递。
- **硬编码凭据**：工作流文件中直接包含的令牌、密码或 API 密钥（未通过 secrets 提供）。

#### 正确性
- **缺少 `fetch-depth: 0`**：当工作流需要 Git 历史（标签、合并基础、变更日志生成）时，验证 `actions/checkout` 是否使用 `fetch-depth: 0`。
- **条件逻辑错误**：验证 `if:` 条件是否正确（例如，`github.event_name == 'pull_request'` 与 `'pull_request_target'`）；确保布尔表达式正确引用。
- **矩阵策略缺口**：检查矩阵组合是否覆盖所需的平台。如果 `fail-fast` 为 true（默认值）但所有矩阵分支都必须成功，则标记。
- **缺少 `shell` 规范**：在自托管运行器上使用 `run:` 执行多行脚本时，应明确指定 shell（bash、sh 或 pwsh）。
- **作业依赖关系断裂**：验证 `needs:` 引用是否确实存在于同一工作流中的作业 ID。检查循环依赖。
- **操作输入拼写错误**：操作输入名称拼写错误（例如，`fetch-detph` 而不是 `fetch-depth`）会被静默忽略。

#### 可靠性
- **缺少超时**：没有 `timeout-minutes` 的作业可能无限运行并消耗运行器资源。标记缺少超时的作业（尤其是在自托管运行器上）。
- **无并发控制**：由 push/PR 触发且没有 `concurrency` 组的工作流可能会产生冗余运行。建议在适当情况下使用带 `cancel-in-progress` 的 `concurrency`。
- **未缓存的依赖**：每次运行都安装依赖而不进行缓存（没有 `actions/cache` 或内置缓存）的构建工作流。

#### 最佳实践
- **已弃用功能**：标记使用已弃用语法的情况（`set-output`、`save-state`、`::set-output`、`actions/checkout@v2/v3`，当 v4 可用时）。
- **缺少 `continue-on-error` 意识**：如果某个步骤失败不应导致整个作业失败，则需要 `continue-on-error: true`；相反，验证非关键步骤不会通过 `|| true` 静默吞掉失败，从而隐藏真实错误。
- **容器镜像标签**：使用 `latest` 标签作为容器镜像不可靠；建议使用特定版本标签。