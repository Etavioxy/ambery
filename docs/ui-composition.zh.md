# UI Composition

[English](ui-composition.md) | 中文

> 每个 Surface 是什么归 concepts.md §Surface 与 `docs/multi-window.md`；窗口创建、摆放与坐标单位归 `docs/window-follow.md`；Card 尺寸推导归 `docs/card-window-size.md`；主题取值归 `docs/theme.md`；模块分层与数据流归 `docs/module-storage-flow.md`。

## 原则

> **本文范围**——本文定义 UI 代码如何分层与组合：Window 组件、widget 各层、样式组合，以及组件遵循的规则；它不定义 Surface 是什么、窗口如何创建与摆放、Card 尺寸如何推导、有哪些主题取值。

> **组件只承担渲染**——数据逻辑不进组件，复杂逻辑抽成纯模块或纯函数，组件只消费其结果。落到 UI 代码上的含义见 §组件原则。

## 分层

```
OS 窗口            host        壳负责创建、定尺寸、摆放、显示、隐藏与销毁
Window 组件        component   每个窗口一个——窗口的外观与挂载约定；组件世界的入口
Surface 内容       component   它里面渲染的业务组件树
widget 各层        component   原子件、复合件与业务件
DOM                rendering   用户看到的东西
```

- 窗口是宿主对象。组件从不创建、定尺寸、移动或显示窗口；那是窗口层的事（`docs/module-storage-flow.md`）。
- Window 组件是窗口的外观与挂载约定：渲染 chrome、声明该窗口的尺寸模型（`fill` 或 `intrinsic`）、渲染恰好一个 Surface 的内容。它是组件世界的入口；窗口管理在它之外。
- 同一张 Card 只有一个组件：无论渲染在自己的窗口里，还是渲染在容器 Surface 里。

## widget 各层

| 层 | 归属 | 例子 | 规则 |
|---|---|---|---|
| 0 行为原语 | bits-ui（依赖） | Select、Checkbox、Dialog、Tooltip | 行为、无障碍、定位；不带样式 |
| 1 widget | 本项目 | Button、Input、Panel、Field | 变体在这里定义；widget 之间可以互相组合 |
| 2 业务件 | 本项目 | ChatPanel、CardBox | 只做组合与业务语义 |

- 第 1 层 widget 要么给第 0 层原语套本项目的变体，要么在 bits-ui 没有对应物时自写。
- 依赖单向：2 → 1 → 0；第 2 层不得直接用第 0 层原语。
- 变体属于第 1 层。第 2 层只组合与摆放，不定义自己的外观规则。
- widget 的高度是声明的布局常量，绝不由内容撑开（`docs/card-window-size.md` §内容块）。
- 出现于两处以上、或带有行为/无障碍契约的东西才做成 widget；一次性布局内联。

## 样式组合

| 层 | 来源 | 产出 |
|---|---|---|
| token | `--ov-*` 表（主题的落点） | CSS 自定义属性 |
| 语义工具类 | 由 token 映射的 Tailwind theme | 工具类 |
| 原语状态 | bits-ui 的 data attribute | 状态选择器 |
| 变体 | tailwind-variants | 类名函数与 slot |
| 动效 | Svelte transition | `transition:`、`animate:flip` |
| 实例覆盖 | 调用方传入的 `class` | 局部调整 |

纪律：工具类只读 token，绝不写字面值；变体只用工具类与原语状态；实例覆盖只调整、不重定义；主题层不携带尺寸（`docs/card-window-size.md` §重算触发）。

## 组件原则

组件只承担渲染；以下是把这条原则落到 UI 代码上：

- 组件不调 IPC、定位引擎、存储或 Harness；数据经 props 进来，经回调出去。
- 输入是 props（数据）与 snippet（结构）；输出是 DOM 与事件。
- 组件绝不推导尺寸；尺寸来自尺寸模型（`docs/card-window-size.md`）。

## 命名与文件

- 文件名语义化、多词；一个 widget 一个文件，变体放在它旁边。
- 组件文件装组件；共享的纯逻辑放在 `.ts` 模块里。
- widget 的对外面是 props 与 snippet；调用方不用类名去寻址它的内部元素。
