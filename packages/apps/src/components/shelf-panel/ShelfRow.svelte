<!-- 二级业务组件：Cards Shelf 的一行 —— 类型图标 + 标题 + 显隐 / 删除两图标。
     只渲染与回调：显隐语义、dismiss 的后果都由动作层决定，本组件不做判断。
     两个图标按钮是「只有图标」的控件：配 Tooltip（可见提示 + 无障碍描述）+ aria-label。 -->
<script lang="ts">
  import type { RestoredCard } from "../../bridge";
  import { t } from "../../i18n";
  import Button from "../../widgets/button/Button.svelte";
  import Tooltip from "../../widgets/tooltip/Tooltip.svelte";
  import type { ShelfActions } from "./shelf-actions";

  let {
    card,
    title,
    actions,
  }: { card: RestoredCard; title: string; actions: ShelfActions } = $props();

  /** 类型图标（五类 Component）；未登记类型给占位符 */
  const TYPE_ICON: Record<string, string> = {
    text_card: "📄",
    quick_jump: "↗️",
    git_display: "🌿",
    data_chart: "📊",
    todobox: "☑️",
  };

  const id = $derived(card.component.id);
  const hidden = $derived(card.user_closed === true);
</script>

<div class="flex items-center gap-1.5 py-1 px-0.5 border-b border-divider-soft">
  <span class="shrink-0 w-4.5 text-center select-none" title={card.component.type}>
    {TYPE_ICON[card.component.type] ?? "▢"}
  </span>
  <span
    class="flex-1 min-w-0 truncate select-none{hidden ? ' opacity-45 line-through' : ''}"
    title={`${title} (${id})`}
  >{title}</span>
  <Tooltip text={hidden ? t("shelf.show") : t("shelf.hide")}>
    {#snippet children({ props })}
      <Button
        variant="quiet"
        {...props}
        aria-label={hidden ? t("shelf.show") : t("shelf.hide")}
        onclick={() => void actions.setUserClosed(card, !hidden)}
      >{hidden ? "👁" : "🙈"}</Button>
    {/snippet}
  </Tooltip>
  <Tooltip text={t("shelf.dismiss-title")}>
    {#snippet children({ props })}
      <Button
        variant="danger"
        {...props}
        aria-label={t("shelf.dismiss-title")}
        onclick={() => void actions.dismiss(card, title)}
      >✕</Button>
    {/snippet}
  </Tooltip>
</div>
