# hyperframes-video-prompt

![HyperFrames](https://img.shields.io/badge/HyperFrames-Video-7C3AED)

## 简介

一个为 HyperFrames 整理动态视频提示词、时间轴和独立旁白稿的 Skill。

**只要用户要用 HyperFrames 制作视频就触发；先问清必要变量，再按实际时长生成。**

- 未提供时长时，直接询问要做多少秒或多少分钟。
- 不写死画幅、镜头数、示例数据、视觉风格或保存路径。
- 让镜头、物体和图表持续产生有意义的运动，避免 PPT 式静止画面。
- 旁白解释画面没有写出的信息，不照读标题和大字，也不留下大段空白。
- 分别交付 HyperFrames 主提示词和旁白 Markdown，时间码与正文保持一致。
- 核对公式、数字、假设和最终时长。

> [!IMPORTANT]
> 用户本次要求优先。本 Skill 负责组织视频提示词，不替代事实核验、素材授权或专业判断。

## 安装

本项目只有文档，不需要运行 `npm install`。

1. 获取完整的 `hyperframes-video-prompt` 目录。
2. 放入所用 AI 编程助手支持的 Skill 目录。
3. 按宿主工具的方式加载 Skill。

## 使用

```text
用 HyperFrames 做一个 XXX 科普视频，全程不要像 PPT。
```

如果没有给时长，Skill 会先问：

```text
想做多少秒或多少分钟？
```

信息齐全后交付：

```text
[主题]-HyperFrames提示词.md
[主题]-普通话旁白.md
```

## 许可证

本项目采用 [ISC License](LICENSE)。使用、复制、修改或分发时，请保留版权声明与许可声明。
