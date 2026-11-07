# hyperframes-video-prompt

![HyperFrames](https://img.shields.io/badge/HyperFrames-Video-7C3AED)

## 简介

一个用于制作 HyperFrames 动态视频提示词的 Skill，帮助 AI 编程助手整理时间轴、分镜，并单独输出普通话旁白 Markdown。

**先问清变量，再写成片提示词，不把示例时长写死。**

只要提出用 HyperFrames 制作视频就会触发，不需要同时说明分镜、3D、旁白或动效要求。

- 未提供时长时，直接询问要制作多少秒或多少分钟。
- 根据主题、平台、画幅、语言和风格动态安排内容。
- 用连续镜头、物体运动和动态图表避免 PPT 式静止画面。
- 让时间轴、旁白和音效严格对齐实际总时长。
- 将普通话旁白另存一份 Markdown，包含时间码和连续朗读稿。
- 核对数字、公式和假设，不沿用其他视频的示例数据。
- 可按用户指定位置保存 Markdown，不默认写死桌面路径。

> [!IMPORTANT]
> 用户本次要求优先。Skill 负责整理提示词，不代替事实核验、素材授权或投资等专业判断。

## 安装

本项目以文档形式提供 Skill，没有可执行源码或依赖，不需要运行 `npm install`。

1. 获取完整的 `hyperframes-video-prompt` 目录。
2. 将目录放入所用 AI 编程助手支持的 Skill 目录。
3. 加载 Skill；具体安装路径与发现机制以宿主工具为准。

## 使用

### 用自然语言提出需求

```text
用 HyperFrames 做一个XXX 3D 科普视频。
```

如果上下文没有时长，Skill 会先问：

```text
想做多少秒或多少分钟？
```

给出时长后，交付两份独立 Markdown：

```text
[主题]-HyperFrames提示词.md
[主题]-普通话旁白.md
```

## 许可证

本项目采用 [ISC License](LICENSE)。使用、复制、修改或分发时，请保留版权声明与许可声明。
