# Spec — packages/apps

[English](spec.md) | 中文

## 结构

```
packages/apps/                     前端包
├── index.html                     每个窗口共用的页面壳
├── vite.config.ts                 前端构建与 dev server
├── package.json                   前端依赖与脚本
├── src/                           前端本体（宿主无关）
│   ├── main.ts                    窗口 label / hash → 入口模块
│   ├── entry/                     每个窗口一个入口模块：建 shell → mount
│   ├── shell/                     入口创建的服务：bridge、store、动作层、theme、i18n、窗口 adapter
│   ├── windows/                   窗口组件：外框与恰好一个 Surface 的内容
│   ├── widgets/                   一级 widget 与其变体
│   ├── components/                二级业务件：Card 渲染与类型注册表、消息列表、配置字段行
│   ├── size/                      尺寸模型：文本度量、块模型、按类型的 sizeModel
│   ├── positioning/               窗口定位引擎
│   └── styles/                    token 表与 Tailwind 入口
├── test/                          前端 headless case（vitest）
├── tauri/                         tauri 形态：宿主层 + Tauri 壳
│   └── src-tauri/                 壳 crate（frontendDist 指 ../../dist）
└── webui/                         纯 web 形态：宿主层（静态服务 + 浏览器侧 IPC 传输）
```

- 形态只加宿主层——建窗、IPC 传输、打包——同一份 `src/` 之上。
- `entry/` 是唯一创建服务的地方；`windows/`、`widgets/`、`components/` 放组件；`size/` 只放尺寸模型。分层规则与 widget 层级见 `docs/ui-composition.md`。
- 窗口管理——建窗、定尺寸、定位、显隐、销毁——归形态的宿主层（`tauri/src-tauri/`）；前端不执行这些动作。
- 只有一个窗口用的内容放在它的窗口组件旁；跨窗口共用的内容放 `components/`。

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

1. **一份前端，两个形态**：tauri 与 webui 是同一份 `src/` 之上的宿主层；差异在宿主层（窗口管理、IPC 传输、打包）。
2. **形态只经既定通道与 core 通信**——打包态 tauri 走原生 IPC；浏览器/webui 态走薄 HTTP+WS loopback（127.0.0.1）。两种模式同一份前端代码。

## 固定约束

- 唯一 UI 框架是 Svelte 5；不引入第二个 UI 框架，也不用 Web Components。
- UI 交互禁止浏览器原生弹窗（alert / prompt / confirm）：错误与输入用应用内 UI 元素表达。
