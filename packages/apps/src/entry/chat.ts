// Chat 窗口入口：建壳 → mount。窗口 chrome 由 ChatWindow 组件渲染（Panel 标题栏 + 关闭）。
// browser 模式没有 chat 窗口：面板由 pet 页内的 overlay 路径挂载。

import { mount } from "svelte";
import { createWindowShell } from "../shell/window-shell";
import ChatWindow from "../windows/ChatWindow.svelte";

export async function main() {
  if (!("__TAURI_INTERNALS__" in window)) return;
  const shell = await createWindowShell("chat");
  mount(ChatWindow, { target: document.getElementById("app")!, props: { shell } });
}
