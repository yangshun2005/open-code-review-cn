#### 明显的拼写错误或拼写错误
- 宏名称、赋值变量名称或用户可见文本在其声明位置存在拼写错误；不要在引用位置报告
- `<#assign>`/`<#macro>`/`<#function>` 名称中的拼写错误仅在渲染时显现（`InvalidReferenceException` / 宏未找到），或被 `!` 默认值和 `??` 守卫静默掩盖

#### 输出转义与 XSS
- 未经过转义就进入 HTML 的插值（`${...}`）：仅在自动转义未激活时标记——即模板缺少 `<#ftl output_format="HTML">`（FreeMarker 2.3.24+）且未使用 `.ftlh`/`.ftlx` 扩展名（这些扩展名通过 `recognize_standard_file_extensions` 自动激活 HTML/XML 转义，自 2.3.24 起默认开启）——并且值未根据其输出位置（HTML 正文、属性、URL、JS、CSS）通过 `?html`/`?url`/`?js_string` 进行适当处理
- 对携带用户控制数据的值显式使用 `?no_esc` 或 `<#noautoesc>`——视为高风险逃生通道；除非来源明确可信或已净化，否则标记
- 使用错误的上下文内置函数进行转义（例如，对放置在 URL 或内联 `<script>` 中的值使用 `?html`）
- 当文件的输出格式已激活自动转义且没有覆盖禁用它时，不要报告缺少 `?html`

#### 模板注入 / RCE（SSTI）
- 用户控制的数据拼接到模板源码中，或模板名称/内容源自请求输入（`<#include>`、`<#import>`、`.get_optional_template(userValue)`）——可实现服务端模板注入
- 使用 `?new()` 内置函数实例化 `TemplateModel` 类，尤其是 `freemarker.template.utility.Execute` 或 `ObjectConstructor`——任意代码执行；除非该类是经过审查的内部类型，否则标记
- 对不可信输入使用 `?api` / `?eval`，或将可访问原始 `Class`/`ClassLoader`/`ProcessBuilder` 的对象暴露到数据模型中
- 从未受信任的输入编写模板且未使用受限的 `TemplateClassResolver`（如 `SAFER_RESOLVER`）——将其指出为加固缺口

#### 空值与缺失值处理
- 对可能不存在的值进行插值或指令参数传递，未使用 `!`（默认值）或 `??`（存在性检查）——缺失值在渲染时会引发 `InvalidReferenceException`
- 过度使用裸 `!`，用静默空字符串掩盖真正必需的数据；在缺失有意义的情况下，优先使用显式默认值（`value!"fallback"`）或 `<#if value??>` 守卫
- 表达式中的 `!` 优先级错误（`a.b.c!` 仅守卫最后一步）；确认预期的可空段

#### 模板中的逻辑异味
- 嵌入模板中的业务逻辑、数据访问或非平凡计算，这些应属于控制器/模型层
- 深度嵌套的 `<#if>`/`<#list>` 或重复的条件块，表明视图在承担模型的工作
- 使用 `<#assign>` 构建本应在渲染前准备好的状态

#### 宏与包含卫生
- 在应使用 `<#import>`（带命名空间）时使用 `<#include>`，导致全局命名空间污染或意外变量遮蔽
- 定义了但从未调用的宏/函数，或跨模板重复定义而未通过公共库模板共享
- 传递给 `<#include>`/`.get_optional_template` 的相对模板名称在解析上下文不明确时未使用 `?absolute_template_name`
- 可选包含的模板缺失失败未处理（`.get_optional_template(...).exists`）

#### 国际化与区域敏感格式化
- 数字、日期、时间和货币使用区域默认格式输出，而需要固定机器格式（例如，URL、JSON 或 ID 中的数字使用 `?string`/`?c`）——`?c`（计算机格式）可防止区域相关的千位分隔符破坏非显示输出
- 硬编码的用户可见字符串应来自本地化消息/资源包
- 日期/数字输出依赖隐式区域/时区，而未确认渲染环境有意设置它们