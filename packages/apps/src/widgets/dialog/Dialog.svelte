<!-- 一级 widget：Dialog —— 包 bits-ui 的 Dialog 原语（遮罩、焦点陷阱、Esc/点外关闭、portal 归原语）。
     外观沿用既有 .setup-* 契约（引导 modal 的视觉，视觉零变化）；样式收在此处，不再进全局表。
     只渲染：开合由 open（可绑）与 onClose 决定，内容由调用方给。 -->
<script lang="ts">
  import { Dialog as BitsDialog } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    open = $bindable(false),
    onClose = null,
    children,
  }: { open?: boolean; onClose?: (() => void) | null; children: Snippet } = $props();
</script>

<BitsDialog.Root
  bind:open
  onOpenChange={(next) => {
    if (!next) onClose?.();
  }}
>
  <BitsDialog.Portal>
    <BitsDialog.Overlay class="setup-overlay" />
    <BitsDialog.Content class="setup-modal">
      <div class="setup-head">
        <BitsDialog.Close class="setup-close">×</BitsDialog.Close>
      </div>
      <div class="setup-body">
        {@render children()}
      </div>
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>

<style>
  /* 注意：`.setup-*` 类名落在 bits-ui 的 Overlay/Content/Close 上（子组件元素拿不到本组件
     的作用域哈希），故这里的规则必须 :global——否则 Svelte 会当"未使用"把它们从产物里剪掉。 */
  :global(.setup-overlay) {
    position: fixed;
    inset: 0;
    background: var(--ov-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  /* 与设置面板视觉对齐：字号/文字色显式对齐菜单面板（否则继承 chat 的 13px/--ov-text）；
     背景用主题 modal token（--ov-modal-bg）——modal 是独立视觉层，不是 panel。
     尺寸受宿主窗口约束：引导 modal 就开在 320×380 的 chat 窗里，写死 360 会被窗口裁掉。
     Portal 把 Overlay/Content 铺成 body 的同胞节点，Content 不自带定位——居中与层级这边给，
     否则 modal 会落回文档流、还被 overlay 的 z-index 压住。 */
  :global(.setup-modal) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    width: min(360px, calc(100% - 16px));
    max-height: calc(100% - 16px);
    overflow-y: auto;
    background: var(--ov-modal-bg);
    color: var(--ov-text-strong);
    border: 1px solid var(--ov-panel-border);
    border-radius: var(--ov-panel-radius);
    padding: 12px 14px;
    font-size: 12px;
  }
  .setup-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 6px;
  }
  :global(.setup-close) {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 16px;
    color: var(--ov-muted);
  }
  /* 行间距是 modal 的排布，作用到子组件渲染的行上（故 :global） */
  .setup-body :global(.cfg-row) {
    margin-bottom: 8px;
  }
</style>
