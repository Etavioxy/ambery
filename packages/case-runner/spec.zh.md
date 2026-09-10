# Spec — packages/case-runner

[English](spec.md) | 中文

## 技术选型

- Rust 二进制 crate（`ambery-case`），依赖 `ambery-core`（case-runner feature）——唯一允许以库消费者身份依赖 core 的包。
- 无头前端测试内嵌 core + 经 RemoteBridge 的 TS 测试进程，与 Tauri 壳形态镜像。

## 架构决定

1. **对每个包只读服务**：case 文件可演练 core、终端包与 apps；case 不向它们暴露自己的契约面。
2. **快照即真相**：case 数据段保留 JSONL 原文；回放断言从日志推导，不来自手写期望。
3. **执行器在二进制、概念在 core**：step 执行器（沙盒、终端剧情状态、打印）住在 ambery-case 二进制侧；core 只在 `case-runner` feature 后承载解析/求值/观测，保持库纯粹。

## 固定约束

- 本 crate 不承载生产行为；这里的一切都是测试基础设施。
