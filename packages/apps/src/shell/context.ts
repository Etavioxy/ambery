// 窗口壳的 Svelte context 键：窗口组件发布，内容组件按需取用。

import type { WindowShell } from "./window-shell";

export const shellContext = Symbol("ambery.window-shell");
export type { WindowShell };
