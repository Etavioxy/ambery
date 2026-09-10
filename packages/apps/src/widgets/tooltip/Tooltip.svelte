<!-- 一级 widget：Tooltip —— 包 bits-ui 的 Tooltip 原语（延迟、定位、Esc、aria-describedby 归原语）。
     用在「只有图标或符号的控件」上：它给可见提示，并给触发器挂无障碍描述。
     纯文本补充说明仍用原生 title（慢提示、零代码）——不要一律换 Tooltip。
     用法：调用方给一个 children snippet，把 props 铺到自己的元素上（bits-ui 的组合约定）。 -->
<script lang="ts">
  import { Tooltip as BitsTooltip } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    text,
    side = "top",
    children,
  }: {
    text: string;
    side?: "top" | "right" | "bottom" | "left";
    children: Snippet<[{ props: Record<string, unknown> }]>;
  } = $props();
</script>

<BitsTooltip.Provider delayDuration={400}>
  <BitsTooltip.Root>
    <BitsTooltip.Trigger>
      {#snippet child({ props })}
        {@render children({ props })}
      {/snippet}
    </BitsTooltip.Trigger>
    <BitsTooltip.Portal>
      <BitsTooltip.Content class="tooltip-content" {side} sideOffset={4}>
        {text}
      </BitsTooltip.Content>
    </BitsTooltip.Portal>
  </BitsTooltip.Root>
</BitsTooltip.Provider>

<style>
  /* 内容元素由 bits-ui 渲染（子组件元素拿不到本组件的作用域哈希），故 :global */
  :global(.tooltip-content) {
    z-index: 10001;
    background: var(--ov-modal-bg);
    color: var(--ov-modal-text);
    border: 1px solid var(--ov-panel-border);
    border-radius: var(--ov-control-radius);
    padding: 3px 8px;
    font-size: 11px;
    box-shadow: var(--ov-popup-shadow);
  }
</style>
