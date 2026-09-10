// Menu 窗口入口：建壳 → mount。窗口 chrome 与配置行都在组件层（Panel / menu-panel）。

import { mount } from "svelte";
import { createWindowShell } from "../shell/window-shell";
import MenuWindow from "../windows/MenuWindow.svelte";

export async function main() {
  if (!("__TAURI_INTERNALS__" in window)) return;
  const shell = await createWindowShell("menu");
  mount(MenuWindow, { target: document.getElementById("app")!, props: { shell } });
}
