// Pet 窗口入口：建壳 → mount。

import { mount } from "svelte";
import { createWindowShell } from "../shell/window-shell";
import PetWindow from "../windows/PetWindow.svelte";

export async function main() {
  if (!("__TAURI_INTERNALS__" in window)) document.documentElement.classList.add("browser");
  const shell = await createWindowShell("pet");
  mount(PetWindow, { target: document.getElementById("app")!, props: { shell } });
}
