# <img src="packages/apps/tauri/src-tauri/icons/icon.png" width="52" height="52" alt="ambery icon"> Ambery

[English](README.md) | 中文

Ambery 是一个基于 Tauri 的 agent harness：为 agent 提供记忆、工具与日程；它是一只可拖动、始终置顶的桌宠，信息以卡片呈现。

早期阶段：所有发布均为 pre-release，协议尚未冻结，发布阶梯见 [docs/roadmap.zh.md](docs/roadmap.zh.md)。

它的核心是 [Ambery Protocol](docs/access-protocol.zh.md)：基于 MCP 的更高一层访问协议，让外部的软件与文件成为桌宠能观察的对象。每个对象有稳定编号，变化按编号归入；消息由对象推送，或由桌宠按计划主动读取。

## 快速开始

前置：Rust stable、Node 24 + npm；Windows 构建还需要 .NET 9，未安装时可用 `packages/apps` 下的 no-sidecar 脚本，构建与运行不受影响。

```bash
# 让桌宠接收 Claude Code 会话（Windows，PowerShell 7），在仓库根目录执行
# 当前为安装 hook 脚本的方式，后续会改为直接解析会话文件
pwsh -File scripts/install-hooks.ps1

# 安装前端依赖并启动壳（壳内嵌 core）
cd packages/apps && npm ci
cd tauri && npx tauri dev
```

`npx tauri build` 产出安装包，`cargo test --workspace` 运行 Rust 测试。headless case、浏览器调试 UI 与 storage 工具见 [docs/DEVELOPING.zh.md](docs/DEVELOPING.zh.md)。

## 平台矩阵

| 平台 | 状态 |
|---|---|
| Windows 10/11 | Tauri 壳 + 托盘 + hook 安装脚本 |
| macOS | Tauri 壳 + Hook 驱动的监督 |
| Linux | Tauri 壳 + Hook 驱动的监督 |

## 文档

- [concepts.zh.md](concepts.zh.md) — 概念模型
- [spec.zh.md](spec.zh.md) — 仓库结构与技术选型
- [docs/roadmap.zh.md](docs/roadmap.zh.md) — 发布阶梯
- [docs/DEVELOPING.zh.md](docs/DEVELOPING.zh.md) — 构建、运行、调试
- [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md) — 贡献指南

## License

MIT
