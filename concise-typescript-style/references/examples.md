# 代码风格示例

这些示例展示表达方式，不要求所有代码都缩成一行。示例中的请求、监听和存储函数假设由调用环境提供。

## 1. 内联短表达式，直接返回

改前：

```ts
export const getData = async (url: string) => {
  const options = { url, method: 'GET' as const }
  const result = await request(options)
  return result
}
```

改后：

```ts
export const getData = (url: string) => request({ url, method: 'GET' })
```

包装函数没有额外的错误处理、清理或转换，可以直接返回原 Promise。若原函数位于 `try/finally` 中，或 `catch` 需要捕获异步拒绝，不要据此删除 `await`。

错误信息也是同样的原则：

```ts
// 改前
const message = e instanceof Error ? e.message : String(e)
throw new Error(`Operation failed: ${message}`)

// 改后
throw new Error(`Operation failed: ${e instanceof Error ? e.message : String(e)}`)
```

若消息需要使用多次，或加入复杂映射和上下文，就保留变量。示例注释用于比较，实际提交的代码不需要这些“改前/改后”注释。

## 2. 解构结果，但保留异步时序与错误边界

改前：

```ts
const responsePromise = waitForResponse()
await startOperation()

const response = await responsePromise.catch(() => {
  throw new Error('Operation was cancelled or timed out')
})
const result = (await response.json()) as { token?: unknown }
if (typeof result.token !== 'string' || !result.token) {
  throw new Error('No valid token was returned')
}
await saveToken(result.token)
return result.token
```

改后：

```ts
const responsePromise = waitForResponse()
await startOperation()

const { token }: { token?: unknown } = await responsePromise
  .catch(() => {
    throw new Error('Operation was cancelled or timed out')
  })
  .then((res) => res.json())
if (typeof token !== 'string' || !token) {
  throw new Error('No valid token was returned')
}
await saveToken(token)
return token
```

- `responsePromise` 保证先注册监听、再触发操作，因此保留。
- `.catch()` 位于 JSON 解析之前，解析错误不会被错误地改成“取消或超时”。
- `token` 是外部字段，仍然做运行时校验；类型标注不会验证返回数据。
- 外层若有 `try/finally` 释放资源，保持原位置和顺序。

不要为了压缩变量而写出多层嵌套 `await`。如果响应还用于读取状态或响应头，就保留 `response`。

## 3. 小函数、早返回和有意义的变量

假设 `load`、`equal`、`prepare` 和 `save` 是现有的存储操作；保存前必须完成准备操作。

```ts
export const saveIfChanged = async (key: string, content: Uint8Array) => {
  const previous = await load(key)
  if (equal(previous, content)) return false
  await prepare(key)
  await save(key, content)
  return true
}
```

`previous` 仅供一次比较，且调用很短，可以进一步写成：

```ts
export const saveIfChanged = async (key: string, content: Uint8Array) => {
  if (equal(await load(key), content)) return false
  await prepare(key)
  await save(key, content)
  return true
}
```

但如果后续还需要旧值，就应该保留变量：

```ts
export const saveIfChanged = async (key: string, content: Uint8Array) => {
  const previous = await load(key)
  if (equal(previous, content)) return false
  await prepare(key, previous)
  await save(key, content)
  return true
}
```

这里 `previous` 有复用职责，已经足够直接：

- 不重复调用 `load`，因为读取既有成本，也可能返回不同状态。
- 早返回跳过不必要的保存，不需要 `else`。
- 有先后依赖的操作不改成并行执行。
- `true` 和 `false` 向调用方传达是否发生更新，不合并成无返回值的函数。
- 复用现有存储能力，不为了包装几个调用新建类或框架。

## 不要机械套用

- 偏好箭头函数，不意味着替换依赖动态 `this` 或声明提升的函数。
- 减少变量是阅读优化，不是计数竞赛。
- 短注释有助阅读，但对外接口文档与使用示例仍有用途。
- `any`、同步 I/O 和短变量名是否合适，要根据类型边界与运行环境判断。
- 明确的项目格式配置优先，不为了套用默认格式制造无关 diff。
