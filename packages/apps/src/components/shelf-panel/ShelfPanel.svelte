<!-- 二级业务组件：Cards Shelf 面板 —— 行列表与空态。
     数据与动作都从外面进来（state 只读、actions 只调用）；组件不取数、不写状态。
     面板 chrome 走 Panel 的 popup 档（软边、圆角内裁、无标题栏）。 -->
<script lang="ts">
  import { t } from "../../i18n";
  import { flattenSpec } from "../component-spec";
  import type { RestoredCard } from "../../bridge";
  import type { ShelfActions } from "./shelf-actions";
  import type { ShelfState } from "../../shell/kinds/shelf-state.svelte";
  import Panel from "../../widgets/panel/Panel.svelte";
  import ShelfRow from "./ShelfRow.svelte";

  let { state, actions }: { state: ShelfState; actions: ShelfActions } = $props();

  /** 行标题：类型内容里的 title / label 优先，缺则退回 id */
  function rowTitle(card: RestoredCard): string {
    const spec = flattenSpec(card.component) as { title?: string; label?: string };
    return spec.title ?? spec.label ?? card.component.id;
  }
</script>

<Panel id="shelf-panel" tone="popup">
  <div id="shelf-body">
    {#if state.cards === null}
      <div class="dim select-none">{t("shelf.loading")}</div>
    {:else if state.cards.length === 0}
      <div class="dim select-none py-1.5 px-2">{t("shelf.empty")}</div>
    {:else}
      {#each state.cards as card (card.component.id)}
        <ShelfRow {card} {actions} title={rowTitle(card)} />
      {/each}
    {/if}
  </div>
</Panel>

<style>
  #shelf-body {
    flex: 1;
    overflow-y: auto;
    padding: 4px 6px;
  }
</style>
