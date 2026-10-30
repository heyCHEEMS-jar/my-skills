# concise-typescript-style

<div align="center">
<img alt="Tests: not run" src="https://img.shields.io/badge/tests-not_run-lightgrey"> <img alt="License: ISC" src="https://img.shields.io/badge/license-ISC-blue"> <img alt="Version: unspecified" src="https://img.shields.io/badge/version-unspecified-lightgrey"> <img alt="Language: TypeScript / JavaScript" src="https://img.shields.io/badge/language-TypeScript%20%2F%20JavaScript-blue">
</div>

## 简介

一个面向 TypeScript / JavaScript 开发者的代码风格 Skill，帮助 AI 编程助手写出简洁、直接、低抽象成本的实现。

**减少阅读负担，而不是追求最少的变量或行数。**

- 减少只用于转交结果的中间变量，优先直接返回、解构和早返回。
- 默认利用类型推断，优先箭头函数与小函数，避免不必要的类、工厂和通用框架。
- 保留有复用、状态、类型收窄或执行时序职责的变量。
- 保持返回值、错误边界、异步顺序、外部副作用与资源释放逻辑。
- 沿用目标项目的运行环境和现有规范，不擅自迁移语言、升级依赖或改造架构。

> [!IMPORTANT]
> 明确的用户要求和目标项目约束优先于本 Skill 的默认风格。它只指导风格与表达优化，不代替正确性或安全审查。

## 安装

本项目以文档形式提供 Skill，没有可执行源码、依赖清单或构建脚本，不需要运行 `npm install`。

1. 获取完整的 `concise-typescript-style` 目录。
2. 将目录放入所用 AI 编程助手支持的 Skill 目录。
3. 加载 Skill；具体安装路径与发现机制以宿主工具为准。

## 使用

### 用自然语言提出需求

加载 Skill 后，可以结合目标文件或代码片段提出请求：

```text
帮我写XX代码，简洁点。
```

### 示例：直接返回包装调用

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

## 许可证

本项目采用 [ISC License](LICENSE)。使用、复制、修改或分发时，请保留版权声明与许可声明。
