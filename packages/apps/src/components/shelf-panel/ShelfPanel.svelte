<!-- 二级业务组件：Cards Shelf 面板 —— 行列表与空态。
     数据与动作都从外面进来（state 只读、actions 只调用）；组件不取数、不写状态。
     面板 chrome（#shelf-panel / #shelf-body）暂时仍在全局样式里：窗口外框随 Panel 一级 widget 落地时一并收回。 -->
<script lang="ts">
  import { t } from "../../i18n";
  import { flattenSpec } from "../component-spec";
  import type { RestoredCard } from "../../bridge";
  import type { ShelfActions } from "./shelf-actions";
  import type { ShelfState } from "../../shell/kinds/shelf-state.svelte";
  import ShelfRow from "./ShelfRow.svelte";

  let { state, actions }: { state: ShelfState; actions: ShelfActions } = $props();

  /** 行标题：类型内容里的 title / label 优先，缺则退回 id */
  function rowTitle(card: RestoredCard): string {
    const spec = flattenSpec(card.component) as { title?: string; label?: string };
    return spec.title ?? spec.label ?? card.component.id;
  }
</script>

<div id="shelf-panel">
  <div id="shelf-body">
    {#if state.cards === null}
      <div class="dim">{t("shelf.loading")}</div>
    {:else if state.cards.length === 0}
      <div class="dim py-1.5 px-2">{t("shelf.empty")}</div>
    {:else}
      {#each state.cards as card (card.component.id)}
        <ShelfRow {card} {actions} title={rowTitle(card)} />
      {/each}
    {/if}
  </div>
</div>
