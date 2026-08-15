### 1. 空安全
- **问题**：可空类型未正确处理，可能导致潜在的 `NullPointerException`。
- **关键检查点**：
  - 避免过度使用 `!!`（非空断言）；优先使用安全调用 `?.` 或 Elvis 操作符 `?:`。
  - 确保数据类或 API 响应中的可空属性得到妥善处理。
- **反面示例**：
  ```kotlin
  val length: Int = text!!.length // 风险：text 可能为 null
  ```
- **改进示例**：
  ```kotlin
  val length: Int = text?.length ?: 0 // 安全处理
  ```

#### 死代码
- 永远无法到达的代码块（例如，条件始终为假的分支、return 语句之后的代码）
- 已声明但从未读取或引用的变量
- 大段被注释掉的代码（且没有明显的保留意图）

### 2. 函数与表达式简洁性
- **问题**：冗余代码削弱了 Kotlin 的简洁性。
- **关键检查点**：
  - 使用 `=` 简化单表达式函数（例如，`fun sum(a: Int, b: Int) = a + b`）。
  - 使用 `when` 替换复杂的 `if-else` 链。
  - 避免不必要的 `return`（例如，在 lambda 中直接使用表达式结果）。
- **反面示例**：
  ```kotlin
  fun getGrade(score: Int): String {
      if (score >= 90) return "A"
      else if (score >= 80) return "B"
      else return "C"
  }
  ```
- **改进示例**：
  ```kotlin
  fun getGrade(score: Int) = when {
      score >= 90 -> "A"
      score >= 80 -> "B"
      else -> "C"
  }
  ```

### 3. 集合操作优化
- **问题**：低效的集合操作导致性能问题。
- **关键检查点**：
  - 对于大型集合，优先使用 `Sequence`（惰性求值减少中间对象）。
  - 避免冗余操作（例如，将多个 `filter` 调用合并为一个）。
  - 使用 `groupBy`、`associate` 等代替手动迭代。
- **反面示例**：
  ```kotlin
  val evenSquares = listOf(1, 2, 3).map { it * it }.filter { it % 2 == 0 } // 创建中间集合
  ```
- **改进示例**：
  ```kotlin
  val evenSquares = listOf(1, 2, 3).asSequence()
      .map { it * it }
      .filter { it % 2 == 0 }
      .toList() // 惰性求值
  ```

---

### 4. 协程的正确使用
- **问题**：协程泄漏或异常处理不当。
- **关键检查点**：
  - 使用结构化并发（`coroutineScope` 或 `supervisorScope` 管理生命周期）。
  - 避免使用 `GlobalScope`（容易导致资源泄漏）。
  - 异常处理：将 `withContext` 或 `async` 包裹在 `try/catch` 中。
- **反面示例**：
  ```kotlin
  GlobalScope.launch { // 逃逸作用域，可能泄漏
      fetchData()
  }
  ```
- **改进示例**：
  ```kotlin
  viewModelScope.launch { // 结构化并发
      try {
          withContext(Dispatchers.IO) { fetchData() }
      } catch (e: Exception) { /* 处理异常 */ }
  }
  ```

### 5. 类与对象设计
- **问题**：未充分利用 Kotlin 特性导致冗余。
- **关键检查点**：
  - **数据类**：对纯数据对象使用 `data class`（自动生成 `equals`/`hashCode`）。
  - **密封类/接口**：对受限类型层次结构使用 `sealed class`（支持穷尽式 `when` 分支检查）。
  - **委托**：属性委托（例如，`by lazy`）或类委托（`by` 用于装饰器模式）。
- **反面示例**：
  ```kotlin
  class User(val name: String) {
      // 手动实现 toString()/equals()...
  }
  ```
- **改进示例**：
  ```kotlin
  data class User(val name: String) // 标准方法自动生成
  ```

### 6. 资源管理与作用域函数
- **问题**：资源未释放或作用域函数使用不当。
- **关键检查点**：
  - 使用 `use` 自动关闭文件/网络资源（例如，`FileInputStream().use { ... }`）。
  - 作用域函数（`let`、`apply` 等）应保持可读性；避免过度嵌套。
- **反面示例**：
  ```kotlin
  val file = File("path")
  val reader = BufferedReader(FileReader(file))
  // 忘记调用 reader.close()
  ```
- **改进示例**：
  ```kotlin
  File("path").inputStream().use { stream ->
      // 资源自动关闭
  }
  ```

### 7. 性能陷阱
- **问题**：隐藏的性能开销。
- **关键检查点**：
  - 内联函数：对高阶函数使用 `inline` 以减少 lambda 开销（但避免内联大型函数）。
  - 常量：对编译期常量使用 `const val`（而不是 `val`）。
  - 避免在循环内创建对象（例如，`Regex` 实例）。

### 8. 互操作性（与 Java 交互）
- **问题**：Java 代码调用 Kotlin 代码时的兼容性问题。
- **关键检查点**：
  - 使用 `@JvmStatic` 和 `@JvmOverloads` 优化暴露给 Java 调用方的 API。
  - 空安全注解：使用 `@Nullable`/`@NonNull` 帮助 Java 识别可空性。

### 9. 其他关键点
- **不可变性**：优先使用 `val` 而非 `var`。
- **字符串处理**：使用字符串模板（`"Value: $value"`）代替拼接。