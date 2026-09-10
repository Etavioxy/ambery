// Pet 窗口接线：pet 内容 + Autonomy + 位置广播 + 动画窗口自适应。
// 尺寸走 pet 公式（纯函数 + 六入口 + 中心锚定，钉基准中心，非窗口几何中心）。
// 本模块由窗口组件在挂载后启动——尺寸控制器要测量已渲染的 #face。
import { Autonomy } from "../../autonomy";
import { BrowserMockBridge, type AppConfig, type Motion } from "../../bridge";
import { reportEffect } from "../../effects";
import { motionDef } from "../../motions";
import { contextSize, MAX_FACE_MARGIN, MIN_FACE_W, obstacleSize, windowSize } from "../../pet-size";
import { engine, setupServer } from "../../positioning/tauri-server";
import { createBrowserAdapter, createTauriAdapter, type WindowAdapter } from "../../window-adapter";
import type { WindowShell } from "../window-shell";
import { petFace } from "./pet-state.svelte";

/** 组件提供的 DOM 与拖拽目标（浏览器模式的 debug wrapper 由适配器写回） */
export interface PetView {
  view: HTMLElement;
  face: HTMLElement;
  dragTarget: { el: HTMLElement | null };
}

/** 手势：组件只上报，宿主差异由接线判断 */
export interface PetGestures {
  pointerDown(e: PointerEvent): void;
  contextMenu(e: MouseEvent): void;
  auxClick(e: MouseEvent): void;
}

export async function startPetWindow(shell: WindowShell, dom: PetView): Promise<PetGestures> {
  const { bridge, store } = shell;
  const viewEl = dom.view;
  const faceEl = dom.face;
  const mount = viewEl.parentElement ?? document.body;

  // #5 pet 未读角标（默认纯数字、容器内右上；样式/方位走 Config，视觉在 styles/index.css 类）
  const applyBadgeStyle = (style: string, side: string) => {
    petFace.badge.style = style === "bubble" ? "bubble" : "number";
    petFace.badge.side = side === "left" ? "left" : "right";
  };
  // 角标字号：固有基线 5px（12px 的 40%）× viewScale；CSS 默认灰 --ov-text
  const applyBadgeScale = () => {
    petFace.badge.fontSize = `${Math.max(3, Math.round(5 * scale))}px`;
  };
  let unreadCount = 0;
  store.onContext((msgs) => {
    const userMsgs = msgs.filter(m => m.role === "user").length;
    const prev = unreadCount > 0 ? unreadCount : userMsgs;
    const newAssist = msgs.filter(m => m.role === "assistant").length;
    unreadCount = Math.max(0, newAssist - prev);
    petFace.badge.text = String(unreadCount);
    petFace.badge.visible = unreadCount > 0;
  });

  // ── 适配模式 ──
  const isTauri = "__TAURI_INTERNALS__" in window;
  const adapter: WindowAdapter = isTauri
    ? await createTauriAdapter(viewEl, window.devicePixelRatio || 1)
    : await createBrowserAdapter(mount, viewEl, dom.dragTarget);
  shell.setAdapter(adapter);

  // ── 尺寸控制器（纯函数，不读当前 OS 窗口大小） ──
  // dpr 现读（多屏不同 DPI：拖到别的显示器后换算不失真，#19 坐标契约）
  const dpr = () => (isTauri ? (window.devicePixelRatio || 1) : 1);
  let scale = 1;
  let faceW = 0; // 未缩放 face 渲染宽度（Layer 1 测量层：只测 #face，不测 #view）
  let maxFaceW = MIN_FACE_W; // 系统池扫描 max + 余量（未缩放）
  let curMotion: Motion = "still";
  /** 基准中心（engine 帧：Tauri 物理 px / browser CSS px）。动画不改中心（原则⑦）：
   *  拖拽、附属窗口跟随、障碍区定位与边界校验始终使用同一个中心 */
  let petCenter: { x: number; y: number } | null = null;

  /** 入口 1 测量：#face 当前渲染宽度 ÷ scale 还原为未缩放值（公式输入是未缩放宽度） */
  const measureFaceW = () => faceEl.getBoundingClientRect().width / scale;

  /** #view 的屏幕中心（CSS px）——锚点几何的统一取口 */
  const center = () => {
    const r = viewEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  /** 系统池扫描取 max + 余量（maxFaceWidth 唯一来源；只扫系统池） */
  function scanMaxFaceW(cfg: AppConfig): number {
    const probe = document.createElement("span");
    probe.style.cssText =
      "position:absolute;visibility:hidden;white-space:nowrap;line-height:1;";
    probe.style.fontSize = getComputedStyle(faceEl).fontSize; // 与 #face 同字体同缩放
    document.body.appendChild(probe);
    let max = 0;
    for (const entry of Object.values(cfg.kaomoji.system)) {
      probe.textContent = entry.face;
      max = Math.max(max, probe.getBoundingClientRect().width);
    }
    probe.remove();
    return max / scale + MAX_FACE_MARGIN;
  }

  /** 基准中心在窗口内的偏移（CSS px）：view 归位于 motion 上/左溢出之后 */
  const centerOffset = () => {
    const o = motionDef(curMotion).overflow;
    const c = contextSize(faceW, scale);
    return { x: o.left + c.w / 2, y: o.top + c.h / 2 };
  };

  /** 程序化移动抑制计数：锚定/拉回产生的 onMoved 不触发附属窗口藏显（M2：
   *  onMoved 不分用户拖拽与程序化移动，表情变化引起的锚定会让 chat/cards 闪） */
  let suppressMoveEvents = 0;
  async function setPositionQuiet(x: number, y: number) {
    suppressMoveEvents++;
    try {
      await adapter.setPosition(x, y);
    } finally {
      // onMoved 经 IPC 异步到达，窗口期后递减（用户拖拽是连续事件流，误抑一个无感）
      setTimeout(() => {
        suppressMoveEvents = Math.max(0, suppressMoveEvents - 1);
      }, 300);
    }
  }

  /** #27：尺寸/偏移未变不调 setSize/setOffset（window_resized 回归只记真正 resize） */
  let lastSizeKey = "";
  let lastOffsetKey = "";

  /** 一个公式 → setSize + 中心锚定（入口 1/2/3 共用）。anchor=false 仅重设尺寸（init 时中心待推） */
  async function applySize(anchor: boolean) {
    const o = motionDef(curMotion).overflow;
    const sz = windowSize(faceW, scale, o);
    if (faceW > maxFaceW) {
      console.warn(
        `[pet] face 宽 ${faceW.toFixed(1)} 超 maxFaceWidth ${maxFaceW.toFixed(1)}（障碍区外，clip 风险）`,
      );
    }
    const w = Math.ceil(sz.w * dpr());
    const h = Math.ceil(sz.h * dpr());
    const sizeKey = `${w}x${h}`;
    if (sizeKey !== lastSizeKey) {
      lastSizeKey = sizeKey;
      await adapter.setSize(w, h);
    }
    // view 在窗口内归位（CSS px）：上/左留出当前 motion 的溢出空间
    const offsetKey = `${o.top},${o.left}`;
    if (offsetKey !== lastOffsetKey) {
      lastOffsetKey = offsetKey;
      adapter.setOffset(o.top, o.left);
    }
    if (anchor && petCenter) {
      // 原则① 中心不变：先定新 center = old center，再反推新左上角
      const off = centerOffset();
      await setPositionQuiet(
        Math.round(petCenter.x - off.x * dpr()),
        Math.round(petCenter.y - off.y * dpr()),
      );
    }
  }

  /** 从窗口实际位置推基准中心（init 与入口 4 drag 结束） */
  async function derivePetCenter() {
    const pos = await adapter.getPosition();
    const off = centerOffset();
    return { x: pos.x + off.x * dpr(), y: pos.y + off.y * dpr() };
  }

  /** 障碍区注册（入口 5/6：只随 scale/系统池扫描/拖拽更新，不随状态抖动，原则③） */
  const syncObstacle = () => {
    if (!petCenter) return;
    const ob = obstacleSize(maxFaceW, scale);
    engine.registerPet(petCenter, {
      w: Math.round(ob.w * dpr()),
      h: Math.round(ob.h * dpr()),
    });
  };

  /** 原则⑥ 中心不离屏：基准中心必须落在某个显示器可用工作区内；
   *  越界拉回最近工作区的最近点（尺寸变化不参与此修正，仅拖拽结束校验） */
  async function clampCenterToWorkArea(c: { x: number; y: number }) {
    let areas: { x: number; y: number; width: number; height: number }[];
    if (isTauri) {
      const { availableMonitors } = await import("@tauri-apps/api/window");
      const ms = await availableMonitors();
      areas = ms.map((m) => ({
        x: m.workArea.position.x,
        y: m.workArea.position.y,
        width: m.workArea.size.width,
        height: m.workArea.size.height,
      }));
    } else {
      // browser：DOM 世界 = 视口
      areas = [{ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }];
    }
    const inside = areas.some(
      (a) => c.x >= a.x && c.x < a.x + a.width && c.y >= a.y && c.y < a.y + a.height,
    );
    if (inside) return c;
    let best = c;
    let bestD = Infinity;
    for (const a of areas) {
      const p = {
        x: Math.min(Math.max(c.x, a.x), a.x + a.width - 1),
        y: Math.min(Math.max(c.y, a.y), a.y + a.height - 1),
      };
      const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  /** 拖拽结束收束（入口 4 + 原则⑥）：测 center → 越界拉回 → 更新引擎障碍区 */
  async function settleDragEnd() {
    if (!petCenter) return;
    const clamped = await clampCenterToWorkArea(petCenter);
    if (clamped.x !== petCenter.x || clamped.y !== petCenter.y) {
      petCenter = clamped;
      const off = centerOffset();
      await setPositionQuiet(
        Math.round(clamped.x - off.x * dpr()),
        Math.round(clamped.y - off.y * dpr()),
      );
    }
    syncObstacle();
  }

  // ── 初始尺寸（config 加载即重测+setSize，#18 消时序空窗） ──
  // 基线读 store；core 未就绪兜底最小默认（原 getConfig 直抛会让 main 崩）
  const cfg: AppConfig = store.config ?? {
    kaomoji: { system: {}, user: {} },
    setAutonomyDefaultTtlMs: 5000,
    viewScale: 1,
  };
  applyBadgeStyle(cfg.badgeStyle ?? "number", cfg.badgeSide ?? "right");
  scale = cfg.viewScale ?? 1;
  applyBadgeScale();
  petFace.scale = scale;
  maxFaceW = scanMaxFaceW(cfg);
  faceW = measureFaceW(); // face 未渲染（空）→ 0 → minFaceW 兜底
  await applySize(false);
  petCenter = await derivePetCenter();
  syncObstacle();

  // 手势动作：各分支按宿主装配（组件只上报事件）
  let startDrag: () => void = () => {};
  let endDrag: () => void = () => {};
  let onChatToggle: () => void = () => {};
  let onShelfToggle: () => void = () => {};

  // ── Tauri 特有 ──
  if (isTauri) {
    viewEl.dataset.tauriDragRegion = "";
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    // 非只读 Tauri 运行时动作只经动作层执行：
    // 动作层执行真实 API 成功后自记 effect；业务只编排语义化动作，不拼 kind/payload
    const actions = await import("../../tauri_runtime_actions");
    const emitR = (event: string, payload?: unknown) => { void actions.emitEvent(event, payload); };
    const emitToR = (target: string, event: string, payload?: unknown) => { void actions.emitEvent(event, payload, target); };
    const win = getCurrentWindow();
    setupServer(bridge);
    startDrag = () => { void actions.startDragging(actions.tauriWindowLike(win)); };

    const { dragDebounce } = await import("../../utils/debounce");

    async function broadcastPosition() {
      petCenter = await derivePetCenter(); // 入口 4：drag 结束测 center
      syncObstacle();
      if (suppressMoveEvents > 0) return; // 程序化移动：只更新 center/障碍区，不藏显
      emitR("pet:moved", petCenter);
      onMove(petCenter);
    }

    const onMove = dragDebounce(
      // 系统藏（#12 定案：不动 engine，无快照）
      () => { emitR("chat:hide"); emitR("cards:hide"); emitR("shelf:hide"); },
      (latest: { x: number; y: number }) => {
        // 拖拽结束收束：原则⑥ 越界拉回后再恢复附属窗口
        void settleDragEnd().then(() => {
          const r = engine.restorePositions(petCenter ?? latest);
          if (r.some((w) => w.id === "chat-panel")) emitR("chat:show");
          for (const w of r) {
            if (w.id.startsWith("card-")) emitR("cards:show", { id: w.id, x: w.center.x, y: w.center.y });
          }
        });
      },
      200,
    );

    // #13: pet 隐藏时 card 窗口延迟到恢复显示（整段 ensure 推迟，同 id 最新 spec 覆盖）
    let petVisible = true;
    const pendingCards = new Map<string, any>();

    const { listen } = await import("@tauri-apps/api/event");
    listen("pet:hidden", () => { petVisible = false; });
    listen("pet:shown", () => {
      petVisible = true;
      for (const [id, spec] of pendingCards) {
        void actions.ensureCardWindow(id, spec);
      }
      pendingCards.clear();
      // 托盘回来：恢复位置广播（#12 定案 grill⑤——系统藏的系统恢复，各窗口自查 userClosed）
      void (async () => {
        petCenter = await derivePetCenter();
        const r = engine.restorePositions(petCenter);
        if (r.some((w) => w.id === "chat-panel")) emitR("chat:show");
        for (const w of r) {
          if (w.id.startsWith("card-")) emitR("cards:show", { id: w.id, x: w.center.x, y: w.center.y });
        }
      })();
    });

    // Cards Shelf（瞬时管理弹出层，不属于 Surface）：中键唤出——
    // 发去 pet 中心与物理宽高，shelf 按 ×3 现算尺寸、遮挡 pet 向右上延伸；
    // 关闭走 中键/失焦/pet 拖拽
    onShelfToggle = () => {
      void (async () => {
        const c = petCenter ?? center();
        const size = await win.outerSize();
        void actions.emitEvent("shelf:toggle", { x: c.x, y: c.y, w: size.width, h: size.height }, "shelf");
      })();
    };
    listen<{ id: string; visible: boolean; spec?: any }>("shelf:visibility", async (ev) => {
      const { id, visible, spec } = ev.payload;
      const label = `card-${id}`;
      if (visible) {
        // 显示：Rust 注册表决策 reuse（重发 spec 原位恢复）/ create（重建），无需 getByLabel
        if (spec) void actions.ensureCardWindow(id, spec);
      } else {
        // 用户隐藏：释放占区保留布局记忆（一致性剖析），窗口藏起
        engine.release(label);
        emitToR(label, "cards:hide");
      }
    });
    listen<{ id: string }>("shelf:dismiss", async (ev) => {
      // 统一关闭收口（Rust destroy 同步出注册表）
      void actions.closeCardWindow(ev.payload.id);
      engine.remove(`card-${ev.payload.id}`);
    });

    // #9: 每个 card 一个独立 Tauri 窗口；#25 断根——窗口决策上提 Rust 权威注册表
    const renderCard = (spec: any) => {
      if (!petVisible) {
        pendingCards.set(spec.id, spec);
        return;
      }
      void actions.ensureCardWindow(spec.id, spec).catch((e) => {
        console.error("[pet] ensureCardWindow 失败:", e);
      });
    };
    bridge.onRenderComponent(renderCard);

    // 显式关闭（持续管理协议：agent close action；统一关闭收口，window_closed Rust 端记录）
    bridge.onCloseComponent?.((id) => {
      void actions.closeCardWindow(id);
      engine.remove(`card-${id}`);
    });

    // 手势：右键 = 唤出/关闭 Chat（chat:toggle，
    // pet 原地不动——无吸附态）；chat 窗口位置经 engine.place 自定位（chat-window.ts）
    onChatToggle = () => emitToR("chat", "chat:toggle");

    broadcastPosition();
    await win.onMoved(() => broadcastPosition());

    // Card 跨重启恢复：pull-on-ready——store 基线即
    // 存活卡片（component + _meta）；可见（user_closed=false）的重建窗口；manual 布局
    // 先 seed engine（相对 pet 偏移原样接棒），card 的 requestPlace 命中 manual 占区即原位恢复
    for (const c of store.cards ?? []) {
      if (c.user_closed) continue;
      if (c.layout.manual && c.layout.offset) {
        engine.seedManual(`card-${c.component.id}`, { x: c.layout.offset[0], y: c.layout.offset[1] });
      }
      void renderCard(c.component);
    }
  } else if (!import.meta.env.PROD) {
    // 浏览器模式（仅 Vite dev / preview，prod build tree-shaking 剔除）
    const CHAT_W = 320;
    const CHAT_H = 380;
    const { Direction } = await import("../../positioning/types");
    const { mount: mountChatComponent } = await import("svelte");
    const { default: ChatPanel } = await import("../../components/chat-panel/ChatPanel.svelte");
    const { createChatState } = await import("../../shell/kinds/chat-state.svelte");
    const { ComponentManager } = await import("../../components/component-manager");
    const mgr = new ComponentManager(mount, bridge, () => center(), false, engine);
    // browser 与 Tauri 共享同一面板组件与同一份状态；这里只做宿主侧的事：
    // 挂载、位置、拖拽、引导 modal、显示/隐藏
    const chatState = createChatState(bridge, store);
    const chatMount = document.createElement("div");
    document.body.appendChild(chatMount);
    mountChatComponent(ChatPanel, { target: chatMount, props: { chat: chatState } });
    const chatEl = () => chatMount.querySelector<HTMLElement>("#chat-panel");
    // 浏览器形态的几何由宿主给：固定尺寸浮层（窗口形态由窗口尺寸决定，面板填满窗口）
    const chatPanelEl = chatEl();
    if (chatPanelEl) {
      chatPanelEl.style.position = "fixed";
      chatPanelEl.style.width = `${CHAT_W}px`;
      chatPanelEl.style.height = `${CHAT_H}px`;
      chatPanelEl.hidden = true;
    }
    const { openSetupModal } = await import("../../components/setup-modal/mount-setup.svelte");
    let setupDismiss: (() => void) | null = null;
    chatState.onOpenSetup = () => {
      setupDismiss?.();
      setupDismiss = openSetupModal(bridge);
    };
    chatState.onIntentClose = () => {
      setupDismiss?.();
      setupDismiss = null;
      engine.release("chat-panel");
      const el = chatEl();
      if (el) el.hidden = true;
    };
    const { attachDrag } = await import("../../drag");
    attachDrag(chatMount, ".panel-head", ".panel-close", (c) =>
      engine.updateCenter("chat-panel", c),
    );

    // 手势（browser 与 Tauri 同一语义）：
    // 右键 = 唤出/关闭 Chat（chat:toggle；pet 原地不动，无吸附态）
    onChatToggle = () => {
      if (chatState.visible) {
        chatState.intentClose();
        return;
      }
      const el = chatEl();
      if (!el) return;
      chatState.intentOpen();
      const pos = engine.place({ id: "chat-panel", width: CHAT_W, height: CHAT_H }, Direction.sse);
      // 不做 clamp（不压人 > 完全可见，部分出屏接受）
      el.style.left = `${pos.x - CHAT_W / 2}px`;
      el.style.top = `${pos.y - CHAT_H / 2}px`;
      el.hidden = false;
      chatState.show();
    };

    // debug：positioning 面板（α/β 滑块 + 窗口注册）
    const { DebugPositioningPanel } = await import("../../positioning/debug-vite-panel");
    const panel = new DebugPositioningPanel(engine);

    // Cards Shelf（browser 与 Tauri 共享同一面板组件与同一份数据状态）：中键 toggle——瞬时 overlay，
    // 尺寸 = pet ×3、左下角落在 pet 中心向右上延伸；中键点 pet 或 shelf 任意位置 /
    // 点面板外（失焦等价）/ pet 拖拽关闭
    const { mount: mountComponent } = await import("svelte");
    const { default: ShelfPanel } = await import("../../components/shelf-panel/ShelfPanel.svelte");
    const { createShelfState } = await import("../../shell/kinds/shelf-state.svelte");
    const shelfMount = document.createElement("div");
    shelfMount.id = "shelf-overlay";
    shelfMount.style.display = "none";
    document.body.appendChild(shelfMount);
    const clampN = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const closeShelfOverlay = () => {
      shelfMount.style.display = "none";
    };
    const shelfActions: import("../../components/shelf-panel/shelf-actions").ShelfActions = {
      list: async () => store.cards ?? [],
      setUserClosed: async (c, userClosed) => {
        await bridge.setCardUserClosed?.(c.component.id, userClosed);
        mgr.setHidden(c.component.id, userClosed);
        await store.refreshCards();
        await shelfState.load();
      },
      dismiss: async (c, title) => {
        // 结构化事实；closed_by_user 双行事件由 core 按 lifecycle 单源现写
        void title;
        bridge.pushEvent({ action: "dismiss", cardId: c.component.id });
        mgr.closeById(c.component.id);
        await store.refreshCards();
        await shelfState.load();
      },
      onCardsChanged: (cb) => store.onCards(cb),
    };
    const shelfState = createShelfState(shelfActions);
    mountComponent(ShelfPanel, { target: shelfMount, props: { state: shelfState, actions: shelfActions } });
    // Card 集合外部变化（agent 增删）→ 面板重取
    shelfActions.onCardsChanged?.(() => void shelfState.load());
    onShelfToggle = () => {
      if (shelfMount.style.display === "none") {
        const r = viewEl.getBoundingClientRect();
        const w = clampN(Math.round(r.width * 3), 180, 480);
        const h = clampN(Math.round(r.height * 3), 120, 240);
        shelfMount.style.width = `${w}px`;
        shelfMount.style.height = `${h}px`;
        const c = center();
        shelfMount.style.left = `${Math.min(Math.round(c.x), window.innerWidth - w - 8)}px`;
        shelfMount.style.top = `${Math.max(8, Math.round(c.y) - h)}px`;
        shelfMount.style.display = "";
        void shelfState.load();
      } else {
        closeShelfOverlay();
      }
    };
    // 中键点 shelf 任意位置 = 关闭
    shelfMount.addEventListener("auxclick", (e) => {
      if ((e as MouseEvent).button === 1) {
        e.preventDefault();
        closeShelfOverlay();
      }
    });
    // 失焦等价：点面板外关闭（pet 自身除外——pet 的中键 toggle 与拖拽关闭各自走自己通道）
    document.addEventListener("mousedown", (e) => {
      const t = e.target as HTMLElement;
      if (shelfMount.style.display !== "none" && !t.closest("#shelf-overlay") && !t.closest("#view")) {
        closeShelfOverlay();
      }
    });
    // 拖拽时隐藏所有附属窗口，结束后以相对偏移恢复
    let markOffsets: { dx: number; dy: number; css: string }[] = [];
    const syncPanel = () => {
      const wr = viewEl.parentElement!.getBoundingClientRect();
      const c = { x: wr.x + wr.width / 2, y: wr.y + wr.height / 2 };
      panel.setPet(c, { w: Math.round(wr.width), h: Math.round(wr.height) });
      syncObstacle();
    };
    startDrag = () => {
      closeShelfOverlay();
      // 系统藏（统一 API，无快照，#12 定案）；debug marks 单独处理
      const wr = viewEl.parentElement!.getBoundingClientRect();
      const petX = wr.x + wr.width / 2;
      const petY = wr.y + wr.height / 2;
      markOffsets = [];
      document.querySelectorAll(".dbg-place-mark").forEach((el) => {
        const s = (el as HTMLElement).style;
        markOffsets.push({
          dx: parseFloat(s.left) + 75 - petX,
          dy: parseFloat(s.top) + 50 - petY,
          css: s.cssText,
        });
        el.remove();
      });
      chatState.systemHide();
      const chatHidden = chatEl();
      if (chatHidden) chatHidden.hidden = true;
      mgr.systemHideAll();
    };
    endDrag = () => {
      void (async () => {
        petCenter = await derivePetCenter();
        await settleDragEnd(); // 原则⑥：拖拽结束越界拉回
        const petC = petCenter;
        syncPanel();
        // 系统恢复（统一 API：systemRestore 判定 + showAt 定位，不再 toggle）
        const restored = engine.restorePositions(petC);
        for (const r of restored) {
          if (r.id !== "chat-panel" || !chatState.systemRestore()) continue;
          const chatRestored = chatEl();
          if (!chatRestored) continue;
          chatRestored.style.left = `${r.center.x - CHAT_W / 2}px`;
          chatRestored.style.top = `${r.center.y - CHAT_H / 2}px`;
          chatRestored.hidden = false;
          chatState.show();
        }
        // card 跟随（browser DOM 卡片纳入 engine 语义，#12）
        mgr.followRestore(restored);
        mgr.systemShowAll();
        // 恢复 debug marks
        for (const mo of markOffsets) {
          const mark = document.createElement("div");
          mark.className = "dbg-place-mark";
          mark.style.cssText = mo.css;
          mark.style.left = `${petC.x + mo.dx - 75}px`;
          mark.style.top = `${petC.y + mo.dy - 50}px`;
          document.body.appendChild(mark);
        }
      })();
    };
    syncPanel();
  }

  // ── Autonomy：expression 变化驱动尺寸重算（入口 1/3） ──
  const autonomy = new Autonomy(store, (e, source) => {
    petFace.text = e.face;
    petFace.motion = e.motion;
    faceW = measureFaceW(); // 入口 1：face 变 → 重测自然宽度
    curMotion = e.motion; // 入口 3：motion 变 → 换当前四向溢出
    // #27：表情变化专用 effect（Tauri 模式；browser 为 no-op），覆盖/回落/推导语义显式
    reportEffect("expression_changed", { face: e.face, motion: e.motion, source });
    void applySize(true); // 中心锚定（petCenter 已就位；尺寸未变内部跳过 setSize）
  });
  bridge.onSetAutonomy?.((args) => autonomy.setAutonomy(args)); // set_autonomy 是推送事件（非 store 状态）

  store.onConfig((cfg) => {
    autonomy.updateConfig(cfg); // 表情解析热更新（key 消失回落在 deriveDefault）
    applyBadgeStyle(cfg.badgeStyle ?? "number", cfg.badgeSide ?? "right"); // badge 热更新
    //  字段表：系统池变更 → 立即重扫、重算 pet 尺寸与固定障碍区
    maxFaceW = scanMaxFaceW(cfg);
    const ns = cfg.viewScale ?? 1;
    if (ns !== scale) {
      scale = ns; // 入口 2/6：scale 变 → 重算 + 障碍区同步
      applyBadgeScale();
      petFace.scale = scale;
    }
    faceW = measureFaceW();
    void applySize(true).then(() => syncObstacle());
  });

  await autonomy.init();

  const debug: Record<string, unknown> = {
    setAutonomy: (args: any) => autonomy.setAutonomy(args),
    viewState: () => ({
      center: center(),
      face: petFace.text,
      motion: petFace.motion,
    }),
  };
  if (bridge instanceof BrowserMockBridge) {
    debug.setInstanceStatus = (n: any, s: any) => bridge.debugSetInstanceStatus(n, s);
    debug.addInstance = (n: any, s: any) => bridge.debugAddInstance(n, s);
    debug.notify = (n: any) => bridge.debugNotify(n);
    debug.clearNotifications = () => bridge.debugClearNotifications();
    debug.callComponent = (spec: any) => bridge.debugCallComponent(spec);
    debug.eventBuffer = () => bridge.debugEventBuffer();
    debug.flushEventBuffer = () => bridge.debugFlushEventBuffer();
    debug.appendMessage = (role: any, content: any) => bridge.debugAppendMessage(role, content);
  }
  window.__ambery = debug as any;

  return {
    pointerDown(e) {
      if (e.button !== 0) return;
      startDrag();
      if (isTauri) return; // 原生拖拽：位置变化由窗口 onMoved 广播
      // 浏览器：DOM 拖拽（指针会移出小窗口，故监听挂 window）
      const target = dom.dragTarget.el ?? viewEl;
      const r = target.getBoundingClientRect();
      const grab = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      const move = (ev: PointerEvent) => {
        target.style.left = `${ev.clientX - grab.dx}px`;
        target.style.top = `${ev.clientY - grab.dy}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        endDrag();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    contextMenu(e) {
      e.preventDefault();
      onChatToggle(); // 右键 = 唤出/关闭 Chat（pet 原地不动，无吸附态）
    },
    auxClick(e) {
      if (e.button !== 1) return;
      e.preventDefault();
      onShelfToggle();
    },
  };
}
