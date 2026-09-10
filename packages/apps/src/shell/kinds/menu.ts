// Menu 窗口的宿主接线：隐藏窗口、脚部两键、config 广播重载。
// 数据与写值在 ./menu-state.svelte.ts；本模块只把宿主事件翻译成状态调用。
import type { MenuState } from "./menu-state.svelte";
import * as actions from "../../tauri_runtime_actions";

/** 关面板 = 隐藏窗口（托盘面板是瞬时弹出层，不销毁） */
export async function hideMenuWindow(): Promise<void> {
  if (!("__TAURI_INTERNALS__" in window)) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const { hideWindow, tauriWindowLike } = await import("../../tauri_runtime_actions");
  await hideWindow(tauriWindowLike(getCurrentWindow()));
}

export function togglePet(): void {
  void actions.togglePet();
}

export function quitApp(): void {
  void actions.quitApp();
}

export async function wireMenuWindow(state: MenuState): Promise<void> {
  // 外部自动载入 / 其他入口写入 → core 广播 config effect，面板重载（错误横幅/值/pending 刷新）
  if ("__TAURI_INTERNALS__" in window) {
    const { listen } = await import("@tauri-apps/api/event");
    await listen("effect", (ev) => {
      if ((ev.payload as { kind?: string })?.kind === "config") void state.load();
    });
  }
  await state.load();
}
