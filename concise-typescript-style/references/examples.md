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

## 8. 短中文注释：函数职责和调用阶段都写清楚

普通业务函数先用一条 `//` 说明整体职责；编排函数中的每个业务阶段或关键调用，再说明它在当前链路中的作用。目标是只扫函数和注释，就能看懂主流程：

```text
publish()
  ├─ advance()      计算此刻应该播放哪首歌
  ├─ scheduleNext() 安排下一次切歌
  └─ emit()         广播最新快照
```

对应源码写法：

```ts
// 推进主线并发布最新播放状态
function publish() {
  // 根据经过时间定位此刻应播放的歌曲
  advance(performance.now())

  // 按当前歌曲剩余时长安排下一次切歌
  scheduleNext()

  // 将最新快照广播给主线连接
  playbackEvents.emit('change', snapshot())
}
```

函数职责注释回答“这个函数整体做什么”，内部阶段注释回答“这一步为什么在这里调用”。两层注释不算重复，因为阅读粒度不同。

状态和局部规则仍可使用紧贴代码的阶段注释或行尾注释：

```ts
const history: string[] = []
const maxSize = 30 // 最多保留30条记录

// 保存一条历史记录并维持容量上限
export const addHistory = (value: string) => {
  // 满额时先移除旧记录，避免添加后超出容量
  if (history.length >= maxSize) history.shift()
  history.push(value)
}
```

- 每个具有独立业务职责的函数默认有职责注释；不要因为函数名较清楚就省略主流程导航。
- 编排函数中的每个业务阶段和关键函数调用都写清当前作用。连续的同类调用属于同一阶段时可以共用一条注释。
- 注释必须包含具体业务动作，例如“按剩余时长安排切歌”，不要只写“处理定时器”“执行下一步”。
- `JSON.parse`、数组 `push`、简单赋值、React setter 等普通语句不需要逐行解释；注释覆盖的是业务职责和调用链，不是语法翻译。
- `//` 后留一个空格；独立注释紧贴对应代码并保持同级缩进，短状态或副作用说明可以放在行尾。
- 行为、调用顺序或失败规则变化时同步修改或删除注释，不能让旧注释继续描述已经不存在的链路。
- 普通逻辑不默认使用英文或块注释。明确要求的接口文档、工具链注释和 JSX 内语法限制仍按对应规范处理。

反例：

```ts
// 调用函数
advance(now)
// 设置
setReady(true)
// 返回结果
return result
```

这些注释只复述语法，没有说明调用在业务链路中的作用，应改成具体职责，或在没有业务信息时直接省略。

## 9. 独立异步操作用 Promise.all，有依赖的步骤仍顺序执行

假设两份数据互不依赖、都必须读取成功，且接口允许并发。

改前：

```ts
const profile = await loadProfile(userId)
const preferences = await loadPreferences(userId)
return { profile, preferences }
```

改后：

```ts
const [profile, preferences] = await Promise.all([loadProfile(userId), loadPreferences(userId)])
return { profile, preferences }
```

不要仅因为代码写成了多行，就让独立请求串行等待；也不为几次请求新建任务调度器或 Promise 包装函数。

反例：以下业务明确要求先通过账号校验，再保存账号，保存成功后才能签发会话，因此不能并发。

```ts
const account = await validateAccount(input)
await saveAccount(account)
return createSession(account.id)
```

- 并发前确认结果、权限、事务和外部副作用之间没有依赖；同一数据库连接的顺序命令不能靠 `Promise.all` 变成安全并发。
- `Promise.all` 有一个任务失败时不会取消其他任务；不能提前释放仍被使用的资源。需要等所有任务结束并分别处理成功或失败时，再用 `Promise.allSettled`，不默认吞掉错误。
- 大批量操作遵循已有并发上限；同步逻辑和 React 状态更新不包装成 Promise。

## 10. 未主动要求验证，就不运行检查或测试

- 用户说“帮我修一下登录弹窗”：只读取必要文件并完成修改，不自行运行类型检查、lint、构建、测试或 IDE 诊断。
- 用户说“补一个退出登录的测试”：编写测试代码，但不默认执行测试。
- 用户说“改完运行退出登录测试”：执行要求的测试，不顺带跑全量测试、构建或启动浏览器。
- 用户说“验证这个 Skill 的效果”：才使用对应评估材料，不在普通编码任务中主动运行 Skill 评估。

未运行时如实说明“未运行验证或测试”；不能把保存文件、静态阅读或工具自动返回的诊断称为运行验证通过，也不通过其他工具、代理或后台任务绕过授权。

## 不要机械套用

- 偏好箭头函数，不意味着替换依赖动态 `this` 或声明提升的函数。
- 减少变量是阅读优化，不是计数竞赛；单次使用的业务步骤变量也有价值。
- 简单类、闭包和原生集合不等于过度封装，普通组件也不必改成箭头函数。
- 短注释有助阅读，但对外接口文档与使用示例仍有用途。
- `any`、同步 I/O 和短变量名是否合适，要根据类型边界与运行环境判断。
- 明确的项目格式配置优先，不为了套用默认格式制造无关 diff。
