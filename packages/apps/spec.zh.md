# Spec — packages/apps

[English](spec.md) | 中文

## 技术选型

| 形态 | 技术 |
|---|---|
| tauri | Tauri 2 壳 + 共享前端 |
| webui | 纯 web 形态，同一前端代码的第二宿主 |
| 前端 | Svelte 5 组件 + bits-ui 行为原语 + Tailwind 4 与 tailwind-variants |

取舍：

- **一份前端，两个宿主**——窗口管理与 IPC 因形态而异；前端代码不变。bridge 层（bridge.ts / effects）是缝；宿主实现它，UI 保持宿主无关。
- **UI 层用 Svelte 5**——展示逻辑是数据驱动的（Component 注册表、schema 驱动的设置表单、消息列表）；相比直接构造 DOM，组件框架承载同样的逻辑所需的手写 DOM 与手工重渲染更少。框架运行时体积不构成判据：app 是本地应用，一个窗口的 webview 成本是兆字节级，与包体无关。
- **bits-ui 作依赖，widget 是本仓库自己的代码**——bits-ui 承担行为、无障碍与定位；外观、变体与 token 留在本仓库（`docs/ui-composition.md`）。

## 架构决定

1. **每个形态是同一前端核心之上的一个包**：tauri 与 webui 内嵌/服务同一份 src；差异在宿主层（窗口管理、IPC 传输、打包）。
2. **形态只经既定通道与 core 通信**——打包态 tauri 走原生 IPC；浏览器/webui 态走薄 HTTP+WS loopback（127.0.0.1）。两种模式同一份前端代码。

## 固定约束

- 唯一 UI 框架是 Svelte 5；不引入第二个 UI 框架，也不用 Web Components。
- UI 交互禁止浏览器原生弹窗（alert / prompt / confirm）：错误与输入用应用内 UI 元素表达。
