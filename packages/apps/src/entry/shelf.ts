// Shelf 窗口入口：建壳 → mount。Cards Shelf 是 pet 锚定的瞬时管理弹出层，没有 Surface 也没有标题栏。

import { mount } from "svelte";
import { createWindowShell } from "../shell/window-shell";
import ShelfWindow from "../windows/ShelfWindow.svelte";

export async function main() {
  if (!("__TAURI_INTERNALS__" in window)) return; // browser 由 pet 页内嵌 ShelfPanel
  const shell = await createWindowShell("shelf");
  mount(ShelfWindow, { target: document.body, props: { shell } });
}
