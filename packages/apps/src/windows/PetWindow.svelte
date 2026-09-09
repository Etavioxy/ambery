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
    bind:this={viewEl}
    data-motion={petFace.motion}
    style:--view-scale={petFace.scale}
    onpointerdown={(e) => gestures?.pointerDown(e)}
    oncontextmenu={(e) => gestures?.contextMenu(e)}
    onauxclick={(e) => gestures?.auxClick(e)}
  >
    <span id="face" bind:this={faceEl}>{petFace.text}</span>
    <div
      id="pet-badge"
      class={`badge-${petFace.badge.style} side-${petFace.badge.side}`}
      style:display={petFace.badge.visible ? "block" : "none"}
      style:font-size={petFace.badge.fontSize}>{petFace.badge.text}</div>
  </div>
</Window>
