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

假设原调用返回 Promise 且不会同步抛错，包装函数没有额外的错误处理、清理或转换，可以直接返回原 Promise。若原函数位于 `try/finally` 中，或 `catch` 需要捕获异步拒绝，不要据此删除 `await`；调用方依赖 `async` 将同步抛错转成 Promise 拒绝时，也保留该边界。

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

const res = await responsePromise.catch(() => {
  throw new Error('Operation was cancelled or timed out')
})
const { token }: { token?: unknown } = await res.json()
if (typeof token !== 'string' || !token) {
  throw new Error('No valid token was returned')
}
await saveToken(token)
return token
```

- `responsePromise` 保证先注册监听、再触发操作，因此保留。
- `res` 命名“等到响应”这一步，后面再解析 JSON；不为少一个变量把两步嵌套或串成长链。
- `.catch()` 只处理等待响应的错误，解析错误不会被错误地改成“取消或超时”。
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

这是可选的局部内联，不是要求删除 `previous`；它本身也在清楚地命名“读取旧值”这一步。如果后续还需要旧值，就应该保留变量：

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

## 4. 按业务步骤保留变量

```ts
// 获取缓存内容
export const getCache = async (id: string) => {
  const db = await openDB('content')
  const res = await db.getById(id)
  return res?.content || ''
}

// 格式化运行时长
export const formatUptime = (seconds: number) => {
  if (!seconds) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days} 天 ${hours} 小时 ${minutes} 分`
}
```

`db`、`res`、`days` 等即使只用一次，也让获取资源、读取内容和格式化更容易看懂。不要把它们改成嵌套 `await` 或塞满插值的长表达式。这里的短中文功能注释也不必删除。

## 5. 组件用普通函数，小回调就地写

```tsx
interface SearchProps {
  keyword: string
  onChange: (value: string) => void
}

export default function Search({ keyword, onChange }: SearchProps) {
  return <input value={keyword} onChange={(e) => onChange(e.target.value)} placeholder="搜索" />
}
```

组件用具名 `function`，对象参数用简单接口；单步事件不另外定义 `handleChange`、抽 Hook 或套 `useCallback`。多步骤处理或确有复用时再命名函数。

## 6. 小状态类不是过度封装

```ts
class UndoRedo {
  private undoStack: string[] = []
  private redoStack: string[] = []
  private current = ''

  execute(value: string) {
    this.undoStack.push(this.current)
    this.current = value
    this.redoStack = [] // 新操作清空重做记录
  }

  undo() {
    if (!this.undoStack.length) return this.current
    this.redoStack.push(this.current)
    this.current = this.undoStack.pop()!
    return this.current
  }

  redo() {
    if (!this.redoStack.length) return this.current
    this.undoStack.push(this.current)
    this.current = this.redoStack.pop()!
    return this.current
  }
}
```

这是字段与相关操作的直接组织方式，不需要为了“少用类”改成纯函数、状态容器加管理器，或再引入基类和策略接口。局部定时器则用闭包即可；选择取决于真实职责。

## 7. 必要动作不能被早返回或节流跳过

```tsx
<form
  onSubmit={(e) => {
    e.preventDefault()
    throttledSubmit(e)
  }}
>
  <button type="submit">提交</button>
</form>
```

`preventDefault` 放在节流外部，冷却期内仍然执行。不为了少一层回调，把它搬进可能根本不执行的 `throttledSubmit`。同理，加载缓存时的 `inited` 状态锁应保留，不能在初始化读取完成前把初始空值写回。

## 不要机械套用

- 偏好箭头函数，不意味着替换依赖动态 `this` 或声明提升的函数。
- 减少变量是阅读优化，不是计数竞赛；单次使用的业务步骤变量也有价值。
- 简单类、闭包和原生集合不等于过度封装，普通组件也不必改成箭头函数。
- 短注释有助阅读，但对外接口文档与使用示例仍有用途。
- `any`、同步 I/O 和短变量名是否合适，要根据类型边界与运行环境判断。
- 明确的项目格式配置优先，不为了套用默认格式制造无关 diff。

## 参考依据

这些例子提炼自手写代码的组织习惯，不照搬文章中的错误示例、教学简化或不统一的排版；应用 Skill 时不需要重新联网检索。

- [JS 常见手写题](https://mizuki.heycheems.top/posts/js_%E5%B8%B8%E8%A7%81%E6%89%8B%E5%86%99%E9%A2%98/)：早返回、局部状态、简单类、原生集合和小方法。
- [手搓 uniapp vue3 虚拟列表遇到的坑](https://mizuki.heycheems.top/posts/%E6%89%8B%E6%90%93_uniapp_vue3_%E8%99%9A%E6%8B%9F%E5%88%97%E8%A1%A8%E9%81%87%E5%88%B0%E7%9A%84%E5%9D%91/)：有意义的索引、尺寸变量、局部重置方法和状态缓存。
- [一个 React 缓存节流导致页面刷新的 bug](https://mizuki.heycheems.top/posts/%E4%B8%80%E4%B8%AA_react_%E7%BC%93%E5%AD%98%E8%8A%82%E6%B5%81%E5%AF%BC%E8%87%B4%E9%A1%B5%E9%9D%A2%E5%88%B7%E6%96%B0%E7%9A%84_bug/)：事件默认行为与业务节流的顺序。
- [React 为什么刷新页面，异步加载的本地缓存会被清空？](https://mizuki.heycheems.top/posts/react_%E4%B8%BA%E4%BB%80%E4%B9%88%E5%88%B7%E6%96%B0%E9%A1%B5%E9%9D%A2%E5%BC%82%E6%AD%A5%E5%8A%A0%E8%BD%BD%E7%9A%84%E6%9C%AC%E5%9C%B0%E7%BC%93%E5%AD%98%E4%BC%9A%E8%A2%AB%E6%B8%85%E7%A9%BA/)：初始化状态锁与读写顺序。
- Mizuki-Manager 的前端 TS / TSX：薄接口封装、具名函数组件、简单接口、推导类型和按业务步骤展开的异步代码。
