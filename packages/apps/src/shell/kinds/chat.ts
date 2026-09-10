// Chat 窗口的宿主接线：唤出 / 关闭 / 系统藏 / 系统恢复 / 头部拖拽 / 面板尺寸测量与定位，
// 以及未配置检测（LLM 未配置或初始化失败 → banner + 引导 modal）。
// 可见性语义单源在 chat-state（userClosed / visible），这里只把宿主事件翻译成状态调用；
// 浏览器模式没有 OS 窗口，本模块直接返回（由 pet 页内的 overlay 路径接管）。
import type { WindowShell } from "../window-shell";
import type { ChatState } from "./chat-state.svelte";
import { requestPlace, requestRelease, reportMoved } from "../../positioning/tauri-server";
import { Direction } from "../../positioning/types";
import { openSetupModal } from "../../components/setup-modal/mount-setup.svelte";

export async function wireChatWindow(shell: WindowShell, state: ChatState): Promise<void> {
  if (!("__TAURI_INTERNALS__" in window) || !shell.adapter) return;
  const adapter = shell.adapter;
  const { listen } = await import("@tauri-apps/api/event");
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  /** 面板物理尺寸（引擎与 OS 都吃物理像素） */
  let panelW = 320;
  let panelH = 380;
  /** 未配置检测只跑一次（首次打开 chat 时弹引导，之后不重复弹） */
  let checkedUnconfigured = false;

  await listen("pet:moved", () => {}); // 占位，确保事件系统初始化

  // 唤出/关闭由 pet 右键 toggle 驱动：chat:toggle → 开则关、关则开
  await listen("chat:toggle", () => {
    if (state.visible) {
      state.intentClose();
      return;
    }
    state.intentOpen();
    void show();
  });
  // 系统藏（pet 拖动/托盘）：只藏不动 userClosed——占区原地保留，不调 release
  await listen("chat:hide", () => {
    state.systemHide();
    void adapter.hide();
  });
  // 系统恢复：统一 API 判定（A 语义）
  await listen("chat:show", () => {
    if (state.systemRestore()) void show();
  });
  win.onCloseRequested(() => {
    state.intentClose(); // OS 关闭请求 = 用户意图关
  });

  // 配置引导 modal：未配置与初始化失败同一入口；重复打开先收旧的
  let setupDismiss: (() => void) | null = null;
  state.onOpenSetup = () => {
    setupDismiss?.();
    setupDismiss = openSetupModal(shell.bridge);
  };

  // 用户意图关的副作用：释放占区（布局入记忆，重开原位恢复）+ 藏窗口 + 收掉引导 modal
  state.onIntentClose = () => {
    setupDismiss?.();
    setupDismiss = null;
    void requestRelease("chat-panel");
    void adapter.hide();
  };

  // 头部可拖拽（排除 × 按钮）
  document.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest(".panel-head") && !target.closest(".panel-close")) {
      void import("../../tauri_runtime_actions").then((m) =>
        m.startDragging(m.tauriWindowLike(win)),
      );
    }
  });

  // 拖拽结束（onMoved 防抖）→ 回写真实位置为跟随基准
  let moveTimer: number | undefined;
  await win.onMoved(() => {
    clearTimeout(moveTimer);
    moveTimer = window.setTimeout(async () => {
      const pos = await win.outerPosition();
      await reportMoved("chat-panel", { x: pos.x + panelW / 2, y: pos.y + panelH / 2 });
    }, 250);
  });

  // 窗口尺寸 = 面板实际渲染尺寸（面板填充窗口，无内缩环）
  const el = document.getElementById("chat-panel");
  if (el) {
    await new Promise((r) => requestAnimationFrame(r));
    const r = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    panelW = Math.ceil(r.width * dpr) || 320;
    panelH = Math.ceil(r.height * dpr) || 380;
    await adapter.setSize(panelW, panelH);
  }
  await adapter.hide();

  /** 唤出：未配置检测 → 固定 sse 方位经引擎落位 → 显示 */
  async function show() {
    state.show();
    if (!checkedUnconfigured) {
      checkedUnconfigured = true;
      await checkUnconfigured();
    }
    const pos = await requestPlace(
      "chat-panel",
      { id: "chat-panel", width: panelW, height: panelH },
      Direction.sse,
    );
    await adapter?.setPosition(Math.round(pos.x - panelW / 2), Math.round(pos.y - panelH / 2));
    await adapter?.show();
  }

  /** LLM 未配置 / 初始化失败检测：unconfigured → 引导 modal + banner；
   *  损坏 provider（active 指向真实 provider 但 init 失败）→ 常驻 banner，同一引导入口 */
  async function checkUnconfigured() {
    try {
      const resp = await shell.bridge.getConfigSchema!();
      const active = resp.nodes.find((n) => n.path === "llm.active")?.value;
      if (active === "unconfigured") {
        state.setUnconfigured(true);
        state.showSetupBanner();
        state.onOpenSetup?.();
      } else if (resp.llmError) {
        state.showSetupError(resp.llmError);
      }
    } catch {
      // core 不可达：不弹（offline 已有独立提示）
    }
  }
}
