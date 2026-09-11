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
│   ├── shell/                     入口创建的服务与宿主接线：bridge、store、动作层、theme、i18n、窗口 adapter
│   │   └── kinds/                 每个窗口的宿主接线与共享状态（`<kind>.ts` / `<kind>-state.svelte.ts`）
│   ├── windows/                   窗口组件：外框与恰好一个 Surface 的内容
│   ├── widgets/                   一级 widget 与其变体
│   ├── components/                二级业务件：Card 渲染与类型注册表、消息列表、配置字段行
│   ├── size/                      尺寸模型：文本度量、块模型、按类型的 sizeModel
│   ├── positioning/               窗口定位引擎
│   ├── utils/                     无 UI、无服务的小工具（防抖、文本）
│   └── styles/                    token 表、Tailwind 入口，以及组件共用的规则（配置行族）
├── test/                          前端 headless case（vitest）
├── tauri/                         tauri 形态：宿主层 + Tauri 壳
│   └── src-tauri/                 壳 crate（frontendDist 指 ../../dist）
└── webui/                         纯 web 形态：宿主层（静态服务 + 浏览器侧 IPC 传输）
```

- 形态只加宿主层——建窗、IPC 传输、打包——同一份 `src/` 之上。
- `entry/` 是唯一创建服务的地方；`windows/`、`widgets/`、`components/` 放组件；`size/` 只放尺寸模型。分层规则与 widget 层级见 `docs/ui-composition.md`。
- 窗口管理——建窗、定尺寸、定位、显隐、销毁——归形态的宿主层（`tauri/src-tauri/`）；前端不执行这些动作。
- 只有一个窗口用的内容放在它的窗口组件旁；跨窗口共用的内容放 `components/`。

## 最佳实践

本包采纳的规则，取自它构建其上的框架——组件层是 Svelte 与 bits-ui 的官方 best practices，样式层是 Tailwind 管线的实际行为——以及它们隐含的放置约定。上游规则不是本地口味：局部复用是 snippet、keyed 块按身份取键、effect 不写 state。

### Svelte 与 bits-ui 的 best practices

[Svelte best practices](https://svelte.dev/docs/svelte/best-practices) · [bits-ui dialog](https://bits-ui.com/docs/components/dialog)

- **一个组件一个文件**，命名 `PascalCase.svelte`；文件名即组件名。窗口组件用窗口名（`windows/ChatWindow.svelte`）。
- **带私有文件的组件用同名目录**——变体、纯逻辑、自己的状态模块与它并排：`widgets/button/Button.svelte` + `button-variants.ts`、`components/chat-panel/ChatPanel.svelte` + `chat-rows.ts`；没有私有文件的组件平铺在本层目录里。
- **纯逻辑是消费它的组件旁的普通模块**：无 DOM、无服务、不用 runes——组件调用它并渲染结果。
- **宿主与组件共享的响应式状态住在 shell**（`shell/kinds/<kind>-state.svelte.ts`）；组件以 props 收到它，不自己创建。
- **局部复用是 snippet**（`{#snippet}` 配合 `{@render}`）；出现第二个使用方、或它自带行为契约时，才升为组件文件。
- **keyed each 块按身份取键**——不用索引。
- **`$derived` 承担计算；`$effect` 是逃生口**，只做 DOM 副作用（滚动、度量、观察者）且不写 state——交互经自己的处理函数驱动状态。
- **测量读的是它依赖的那次渲染之后的 DOM**：state 写入要到下一次渲染才落到 DOM，所以跟着写入的测量先 `await tick()`；在同一任务里读量到的是上一帧，得到按过期几何算出的尺寸或矩形。
- **prop 或局部绑定不叫 `state`**：与 rune 同名会让 `$state(...)` 被读成 store 订阅，组件悄悄失去响应性。
- **交给子组件的 class 用 `:global()` 定样式**，且写在持有该类名的组件里：作用域哈希到不了子组件元素，Svelte 会把规则当未使用剪掉——样式在产物里消失。
- **原语的 portal 是平铺的**：bits-ui 的 dialog portal 把 `Overlay` 与 `Content` 作为兄弟节点放进页面根，而 `Content` 自身不带定位——调用方给它盒子（`position: fixed`、自己的居中、高于遮罩的 `z-index`），否则它会落进文档流、被遮罩压在下面。
- **只显示图标或符号的控件配 Tooltip 与 `aria-label`**；已带标签的行上的文字提示仍用原生 `title`。
- **新代码只用 runes**：`onclick={...}`、`$props()`、snippet 取代 slot；不用 legacy API。

### Tailwind 的 best practices

[Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles#using-custom-css)

- **widget 的变体声明在它旁边**（tailwind-variants），不写进共享样式表。
- **自有 keyframes 带前缀**：Tailwind 主题自带 `float`、`bounce`、`shake` 三份同名 keyframes，裸名会解析到后加载的那份——pet 的动作动画因此叫 `pet-*`，主题的 keyframes 永远抢不走。
- **手写声明在 `tauri dev` 下不带前缀**：Tailwind 的 vite 插件只在构建时跑它那趟 Lightning CSS，所以 dev server 原样吐出声明，只有打包形态带 `-webkit-` 形式——WebKit 只认带前缀的属性（`-webkit-user-select` 有效而裸 `user-select` 被丢弃）因此要读工具类或两种写法，不能只写裸声明。
- **前缀覆盖是逐属性的，不是逐层的**：Tailwind 把 `-webkit-` 烤进 `select-*`、`backdrop-*`、`line-clamp-*`、`hyphens-*`、`box-decoration-*`，但没有进 `appearance-none`；构建期那趟 Lightning CSS 会给 `user-select`、`backdrop-filter`、`mask-image`、`hyphens`、`box-decoration-break`、`text-size-adjust` 补前缀，却不动 `touch-action`、`clip-path`、`position: sticky`——看吐出来的声明，不要假设。
- **手写的共享规则要进层**：未分层的规则压过 Tailwind 的每一层，不论特异性，所以写在 `@layer base` 或 `@layer components` 之外的规则根本无法被工具类覆盖；共享样式表未分层的期间，它的选择器赢过任何工具类。
- **共享规则按 class 或按 widget 自己的元素取键**：按 id 或原生标签写的规则，会在节点变成组件那个带 class 的元素之后悄悄失配——面板头是 `panel-head`、关闭控件是 widget 自己的按钮，所以共享样式表里的 `#panel-head` 与 `#btn-close` 什么也不匹配，`select` 那几条只匹配调试面板的控件。
- **样式结论要在出货形态里确认**：`tauri dev` 与打包构建是两条 CSS 管线，构建期优化器还会改写它改写得了的东西（把与 `appearance` 并排的手写 `-webkit-appearance` 丢掉），所以只在 `tauri dev` 下看到的样式不算验过。

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
