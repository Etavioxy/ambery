<!-- Pet 窗口：无 chrome（无标题栏、无关闭按钮）。
     颜文字 / 角标 / 缩放的显示状态来自接线写的响应式状态；手势只上报给接线，组件不判断宿主。 -->
<script lang="ts">
  import { onMount } from "svelte";
  import Window from "./Window.svelte";
  import { startPetWindow, type PetGestures } from "../shell/kinds/pet";
  import { petFace } from "../shell/kinds/pet-state.svelte";
  import type { WindowShell } from "../shell/context";

  let { shell }: { shell: WindowShell } = $props();
  let viewEl: HTMLElement;
  let faceEl: HTMLElement;
  let gestures: PetGestures | null = null;

  // 浏览器模式的拖拽目标（默认自身；debug wrapper 由接线在适配器建好后写回）
  const dragTarget: { el: HTMLElement | null } = { el: null };

  onMount(() => {
    dragTarget.el = viewEl;
    void startPetWindow(shell, { view: viewEl, face: faceEl, dragTarget }).then((g) => {
      gestures = g;
    });
  });
</script>

<Window kind="pet" {shell}>
  <!-- 鼠标手势面（拖拽 / 右键唤 chat / 中键唤 shelf）：桌宠无键盘交互路径，故不设 ARIA 角色 -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    id="view"
    class="select-none"
    bind:this={viewEl}
    data-motion={petFace.motion}
    style:--view-scale={petFace.scale}
    onpointerdown={(e) => gestures?.pointerDown(e)}
    oncontextmenu={(e) => gestures?.contextMenu(e)}
    onauxclick={(e) => gestures?.auxClick(e)}
  >
    <span id="face" class="select-none" bind:this={faceEl}>{petFace.text}</span>
    <div
      id="pet-badge"
      class={`badge-${petFace.badge.style} side-${petFace.badge.side}`}
      style:display={petFace.badge.visible ? "block" : "none"}
      style:font-size={petFace.badge.fontSize}>{petFace.badge.text}</div>
  </div>
</Window>

<!-- 本窗口自己的外观：窗内只有颜文字、角标与动作，没有别的消费者，故不再写在共享样式表里。
     几何与动作两处是 CSS ↔ JS 一致性契约，数值改动必须同步 app/src/pet-size.ts 与 app/src/motions.ts。 -->
<style>
  /* ── View：球场圆形浮动窗口，窗内仅颜文字 ──
     ⚠ CSS ↔ JS 一致性契约：标注 token 被 JS 直接读取，
     修改必须在 app/src/pet-size.ts 同步，否则窗口尺寸会错 */
  #view {
    --view-scale: 1;
    position: fixed;
    min-width: calc(36px * var(--view-scale)); /* ← JS: minFaceW 基底 */
    height: calc(20px * var(--view-scale)); /* ← JS: baselineH 基底 */
    padding: 0 calc(11px * var(--view-scale)); /* ← JS: padLR 基底（11×2） */
    border-radius: calc(10px * var(--view-scale)); /* 球场圆形（pill）= height/2 */
    background: var(--ov-view-bg);
    /* 描边（#17 增补）：白胶囊与背景区分；1px 不随 scale。窗口公式 +BORDER_PX 补偿（pet-size.ts） */
    border: 1px solid var(--ov-view-border);
    box-sizing: content-box;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    touch-action: none;
  }

  #face {
    font-size: calc(11.25px * var(--view-scale));
    line-height: 1; /* ← JS: height 由 line-height=1 保证 */
    white-space: nowrap;
    flex-shrink: 0; /* 必须：禁止被容器压缩，确保测量为自然宽度 */
    pointer-events: none;
  }

  /* #5 pet 未读角标：样式/方位由 Config 驱动（pet.ts 切 class），默认纯数字容器内右。
     颜色默认灰（--ov-text）；字号为固有 px（12px 的 40% = 5px 基线，
     跟随 viewScale 由 pet.ts 覆写 fontSize——缩放不变时即 5px） */
  #pet-badge {
    display: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 5px; /* 基线：12px 的 40%；pet.ts 按 scale 覆写 */
    font-weight: 700;
    line-height: 1;
    z-index: 10;
    pointer-events: none;
  }
  #pet-badge.side-right { right: 8px; }
  #pet-badge.side-left { left: 8px; }
  #pet-badge.badge-number { color: var(--ov-text); }
  #pet-badge.badge-bubble {
    background: color-mix(in srgb, var(--ov-text) 75%, transparent);
    color: var(--ov-view-bg);
    border-radius: 5px;
    padding: 0.5px 3px;
  }

  /* ── Autonomy motion ──
     ⚠ CSS ↔ JS 一致性契约：translateX/Y 极值与
     animation-duration 必须与 app/src/motions.ts 的 MotionDef 同步——
     极值 → overflow 四向预留；duration → durationMs（once:true 的 TTL）。
     名字带 pet- 前缀：Tailwind v4 主题自带 float/bounce/shake 三份同名 keyframes，
     裸名解析到后加载的那份（实测 pet 的 bounce 被 Tailwind 的 translateY(-25%) 顶掉——幅度变成元素高度的四分之一）。 */
  @keyframes pet-float {
    /* MotionDef float: overflow.top=10, durationMs=4000 */
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes pet-bounce {
    /* MotionDef bounce: overflow.top=18, durationMs=900 */
    0%, 100% { transform: translateY(0); }
    30% { transform: translateY(-18px); }
    60% { transform: translateY(0); }
  }

  @keyframes pet-shake {
    /* MotionDef shake: overflow.left=6, overflow.right=6, durationMs=400 */
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }

  #view[data-motion="float"] { animation: pet-float 4s ease-in-out infinite; }
  #view[data-motion="bounce"] { animation: pet-bounce 0.9s ease-in-out infinite; }
  #view[data-motion="shake"] { animation: pet-shake 0.4s ease-in-out infinite; }
  /* data-motion="still"：无动画 */
</style>
