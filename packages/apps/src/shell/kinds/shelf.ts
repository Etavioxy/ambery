// Shelf 窗口的宿主接线与面板动作（Tauri 模式）。
// 面板动作 = 读卡片走 store、写走 bridge / 动作层；宿主接线 = 中键 toggle 的尺寸与定位、
// 系统藏、失焦即关、中键点任意位置关闭。数据逻辑只在这里与壳里，不在组件里。

import type { WindowShell } from "../window-shell";
import type { ShelfActions } from "../../components/shelf-panel";
import * as actions from "../../tauri_runtime_actions";

const MIN_W = 180;
const MAX_W = 480;
const MIN_H = 120;
const MAX_H = 240;
/** 失焦关闭的武装延迟：显示后 600ms 内的失焦事件忽略（焦点接力失败不秒杀） */
const FOCUS_ARM_MS = 600;

let shownAt = 0;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** 面板动作：Cards Shelf 的读写收口 */
export function createShelfActions(shell: WindowShell): ShelfActions {
  const { bridge, store } = shell;
  return {
    list: async () => store.cards ?? [],
    setUserClosed: async (c, userClosed) => {
      const id = c.component.id;
      const resp = await bridge.setCardUserClosed?.(id, userClosed);
      if (resp && !resp.ok) {
        console.warn("[shelf] set_card_user_closed 失败", resp);
        return;
      }
      await actions.emitEvent("shelf:visibility", { id, visible: !userClosed, spec: c.component }, "pet");
      await store.refreshCards();
      shell.invalidate();
    },
    dismiss: async (c, title) => {
      void title; // 文本由 core 现写（lifecycle 单源）
      bridge.pushEvent({ action: "dismiss", cardId: c.component.id });
      await actions.emitEvent("shelf:dismiss", { id: c.component.id }, "pet");
      await store.refreshCards();
      shell.invalidate();
    },
    onCardsChanged: (cb) => store.onCards(cb),
  };
}

/** 宿主接线：窗口动作 + 监听（浏览器模式无 OS 窗口，直接返回） */
export async function wireShelfWindow(shell: WindowShell): Promise<void> {
  if (!("__TAURI_INTERNALS__" in window) || !shell.adapter) return;
  const { listen } = await import("@tauri-apps/api/event");
  const { getCurrentWindow, currentMonitor } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  const adapter = shell.adapter;
  const close = () => void adapter.hide();

  // 中键 toggle（pet 或 shelf 任意位置中键都直接关闭）：pet 发来中心与物理宽高——
  // 尺寸 = pet ×3（钳制），左下角落在 pet 中心、向右上延伸（屏边界钳制）
  await listen<{ x: number; y: number; w: number; h: number }>("shelf:toggle", async (ev) => {
    if (await win.isVisible()) {
      close();
      return;
    }
    const w = clamp(Math.round(ev.payload.w * 3), MIN_W, MAX_W);
    const h = clamp(Math.round(ev.payload.h * 3), MIN_H, MAX_H);
    await adapter.setSize(w, h);
    const mon = await currentMonitor();
    const sx = mon ? mon.position.x + mon.size.width : Infinity;
    const x = Math.min(Math.round(ev.payload.x), sx - w - 8);
    const y = Math.max(8, Math.round(ev.payload.y) - h);
    await adapter.setPosition(x, y);
    shownAt = Date.now();
    await adapter.show();
    shell.invalidate();
  });
  // 系统藏（pet 拖拽/托盘连坐）：瞬时面板直接关
  await listen("shelf:hide", close);

  // 中键点 shelf 任意位置 = 关闭（行内按钮保持左键语义）
  document.addEventListener("auxclick", (e) => {
    if ((e as MouseEvent).button === 1) {
      e.preventDefault();
      close();
    }
  });

  // 失焦即关（瞬时语义；武装延迟防显示瞬间焦点接力失败秒杀）
  await win.onFocusChanged((ev) => {
    if (!ev.payload && Date.now() - shownAt > FOCUS_ARM_MS) {
      close();
    }
  });
}
