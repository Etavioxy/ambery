// Chat 窗口入口：建壳 → mount。窗口 chrome 由 ChatWindow 组件渲染（Panel 标题栏 + 关闭）。
// browser 模式没有 chat 窗口：面板由 pet 页内的 overlay 路径挂载。

import { mount } from "svelte";
import { createWindowShell } from "../shell/window-shell";
import ChatWindow from "../windows/ChatWindow.svelte";

export async function main() {
  if (!("__TAURI_INTERNALS__" in window)) return;
  // chat 窗口：面板填充整个窗口（无内缩环），尺寸由壳测量后设给窗口
  document.getElementById("app")?.classList.add("chat-mode");
  const shell = await createWindowShell("chat");
  mount(ChatWindow, { target: document.getElementById("app")!, props: { shell } });
}
