# 安全政策

## 支持的版本

| 版本 | 支持状态          |
|---------|--------------------|
| 最新版  | :white_check_mark: |
| 低于最新版 | :x:               |

仅最新发布的版本接收安全更新。建议用户及时升级。

## 报告漏洞

**请勿通过公开的 GitHub Issue 报告安全漏洞。**

请使用 **GitHub 私有漏洞报告**功能——前往[安全公告](https://github.com/alibaba/open-code-review/security/advisories/new)页面提交新的公告。

### 需要包含的内容

- 漏洞描述及其潜在影响。
- 复现问题的分步说明。
- 受影响的版本。
- 任何建议的修复或缓解措施（如有）。

## 响应时间线

- **确认收到**：在收到报告后的 **3 个工作日内**。
- **初步评估**：在 **7 个工作日内**。
- **修复与披露**：对于确认的严重或高危问题，我们力争在 **14 天内**发布修复，并与报告者协调披露事宜。

## 范围

以下内容属于安全报告的范围：

- 通过精心构造的差异、配置或 LLM 响应实现远程代码执行或命令注入。
- 通过日志、遥测或输出文件泄露凭据或 API 密钥。
- 允许在预期工作目录之外进行读写的路径遍历。
- 可通过本项目利用的依赖项漏洞。

以下内容不在范围内：

- 第三方 LLM 提供商或 API 的问题。
- 需要本地访问权限的拒绝服务攻击。
- 社会工程攻击。

## 发布签名

所有发布二进制文件和校验和均使用 [GitHub Artifact Attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds)（Sigstore）签名。签名采用无密钥模式——由 GitHub Actions OIDC 支持，不涉及长期有效的私钥。版本标签通过 `git tag -s` 使用 SSH 密钥签名。

验证下载的二进制文件：

```bash
gh attestation verify opencodereview-linux-amd64 --repo alibaba/open-code-review
```

验证版本标签：

```bash
git tag -v v1.6.4
```

## 致谢

我们感谢安全研究社区的贡献。遵循负责任披露流程的报告者将在发布说明中获得致谢（除非其希望保持匿名）。