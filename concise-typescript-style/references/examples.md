# 代码风格示例与补充规则

本文件补充 `SKILL.md` 未展开的具体表达、适用条件和反例。对风格写法、规则取舍或适用边界拿不准，或者 `SKILL.md` 缺少当前场景的对应要求时，在输出、修改或评审相关 TS/JS 代码前读取本文件的相关章节。已有明确要求且能确定如何应用时，直接按 `SKILL.md` 执行，不要求每次通读示例。

改前/改后的表达方式、解释中的适用条件、应保留的业务步骤和最后的反例都是必要规则；不能只模仿改后代码而忽略边界。这些示例不要求所有代码都缩成一行。示例中的请求、监听和存储函数假设由调用环境提供。

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

## 8. 短中文注释：步骤放上方，短说明放行尾

普通逻辑使用 `//`，其后留一个空格；独立注释紧贴对应代码并保持相同缩进，行尾注释与代码之间留一个空格。

```ts
const history: string[] = []
const maxSize = 30 // 最多保留30条记录

// 添加历史记录
export const addHistory = (value: string) => {
  // 满额时先移除旧记录 (避免添加后超出容量)
  if (history.length >= maxSize) history.shift()
  history.push(value)
}
```

- `maxSize` 后的行尾注释补充容量含义，适合短说明；单行操作的非直观副作用也可在行尾解释。
- 函数或业务阶段前的独立注释直接说明这一段做什么，不扩成 JSDoc、参数列表或“该函数用于……”式文档段落。
- 分支前的独立注释说明执行顺序与原因，必要时用半角括号补充。规范规定、初始化锁或特殊返回规则同样放在相关逻辑之前，说清关键条件，不只留下模糊标签。
- `history.push(value)` 已经清楚，不再写“添加到数组”等逐行复述。注释数量由真实阅读需要决定，不给所有语句补齐注释。
- 有价值的短中文注释应保留；逻辑变化时同步修正，不为了压缩行数删除。允许混写实际标识符，不强行把变量名翻译成长中文。
- 普通逻辑不默认使用英文或块注释。明确要求的接口文档和工具链注释，以及 JSX 标记内部的语法限制，按对应规范处理，不能据此给普通业务代码套文档模板。

## 不要机械套用

- 偏好箭头函数，不意味着替换依赖动态 `this` 或声明提升的函数。
- 减少变量是阅读优化，不是计数竞赛；单次使用的业务步骤变量也有价值。
- 简单类、闭包和原生集合不等于过度封装，普通组件也不必改成箭头函数。
- 短注释有助阅读，但对外接口文档与使用示例仍有用途。
- `any`、同步 I/O 和短变量名是否合适，要根据类型边界与运行环境判断。
- 明确的项目格式配置优先，不为了套用默认格式制造无关 diff。
