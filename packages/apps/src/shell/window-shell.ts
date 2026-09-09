// 窗口壳（模块，非组件）：一个窗口的服务与宿主接线收在这一处——
// bridge、store、主题、i18n、窗口 adapter，以及该 kind 的宿主监听。
// 入口只做「建壳 → mount」；组件从 context 取壳，不创建服务。

import { createBridge, type Bridge } from "../bridge";
import { Store } from "../store";
import { wireTheme } from "../theme";
import { wireI18n } from "../i18n";
import { createTauriAdapter, type WindowAdapter } from "../window-adapter";

export type WindowKind = "pet" | "chat" | "menu" | "shelf" | "card";

export interface WindowShell {
  kind: WindowKind;
  bridge: Bridge;
  store: Store;
  /** 宿主窗口动作；浏览器模式为 null（没有 OS 窗口） */
  adapter: WindowAdapter | null;
  /** 内容需要重读数据/重绘（宿主事件、语言切换）；组件挂载时注册 */
  onInvalidate(cb: () => void): void;
  /** 请求内容重读（宿主接线调用） */
  invalidate(): void;
}

/** 各 kind 的宿主接线（监听 + 窗口动作）；浏览器模式不接线 */
const HOST_WIRING: Partial<Record<WindowKind, (shell: WindowShell) => Promise<void>>> = {
  shelf: async (shell) => (await import("./kinds/shelf")).wireShelfWindow(shell),
};

export async function createWindowShell(kind: WindowKind): Promise<WindowShell> {
  const bridge = await createBridge();
  const store = await Store.create(bridge);
  wireTheme(store);

  const invalidators = new Set<() => void>();
  const invalidate = () => {
    for (const cb of invalidators) cb();
  };
  wireI18n(store, invalidate);

  const isHost = "__TAURI_INTERNALS__" in window;
  const shell: WindowShell = {
    kind,
    bridge,
    store,
    adapter: isHost ? await createTauriAdapter(document.body, 1) : null,
    onInvalidate(cb) {
      invalidators.add(cb);
    },
    invalidate,
  };
  if (isHost) await HOST_WIRING[kind]?.(shell);
  return shell;
}
