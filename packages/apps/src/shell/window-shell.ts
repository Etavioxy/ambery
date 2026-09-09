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
  /** 语言切换后需要重绘的内容（组件挂载时注册） */
  onRerender(cb: () => void): void;
}

export async function createWindowShell(kind: WindowKind): Promise<WindowShell> {
  const bridge = await createBridge();
  const store = await Store.create(bridge);
  wireTheme(store);

  const rerenders = new Set<() => void>();
  wireI18n(store, () => {
    for (const cb of rerenders) cb();
  });

  const isHost = "__TAURI_INTERNALS__" in window;
  return {
    kind,
    bridge,
    store,
    adapter: isHost ? await createTauriAdapter(document.body, 1) : null,
    onRerender(cb) {
      rerenders.add(cb);
    },
  };
}
