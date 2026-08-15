#### 明显的拼写错误或拼写错误
- 变量名、常量名或函数名在声明位置的拼写错误；不要在调用位置报告拼写错误
- 日志消息或异常消息中包含影响可读性的拼写错误的字符串

#### 正确的 malloc/free 配对
**关键检查点：**
- 每个 `malloc()` 都有对应的 `free()`
- 避免对同一内存块进行双重释放
- 释放后将指针设置为 NULL

**示例：**
```c
// 错误
char* buffer = malloc(1024);
// 使用 buffer...
// 忘记释放内存

// 正确
char* buffer = malloc(1024);
if (buffer != NULL) {
    // 使用 buffer...
    free(buffer);
    buffer = NULL;
}
```

#### 内存泄漏检测
**关键检查点：**
- 所有分配的内存在函数退出前被释放
- 在错误处理路径中也释放内存
- 使用 Valgrind 等工具进行检测

#### 缓冲区溢出防护
**关键检查点：**
- 在数组访问前检查边界
- 使用安全的字符串操作函数
- 确保循环边界条件正确

**示例：**
```c
// 错误：危险操作
char buffer[100];
strcpy(buffer, user_input); // 可能溢出

// 正确：安全操作
char buffer[100];
strncpy(buffer, user_input, sizeof(buffer) - 1);
buffer[sizeof(buffer) - 1] = '\0';
```

#### 安全字符串操作
**推荐的安全函数：**
- 使用 `strncpy()` 替代 `strcpy()`
- 使用 `strncat()` 替代 `strcat()`
- 使用 `snprintf()` 替代 `sprintf()`

#### 命名规范
**要求：**
- 使用 snake_case 命名风格
- 变量名应具有意义
- 常量应使用大写字母（UPPER_CASE）