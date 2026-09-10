<!-- 一级 widget：Panel —— 窗口的面板 chrome（标题栏可选）。
     一个 Surface 有标题栏时用 Panel 包住内容；pet 与 Cards Shelf 不包（无标题栏）。
     变体是 chrome 的两档：panel（有边框的对话面板）与 popup（软边、圆角内裁的瞬时弹出层）。
     字号不走工具类（非 scale 值，主题不带尺寸），在本组件的 scoped 样式里定。
     只渲染：标题文案与关闭的语义由调用方给（关闭 = 隐藏窗口 / dismiss 卡片，由调用方决定）。
     标题栏类名 `panel-head` / 关闭按钮 `panel-close` 是窗口拖拽与跳过按钮的语义钩子。 -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { tv, type VariantProps } from "tailwind-variants";
  import Button from "../button/Button.svelte";

  export const panel = tv({
    base: "relative flex h-full min-h-0 w-full flex-col",
    variants: {
      tone: {
        panel: "bg-panel border border-panel-border rounded-panel text-fg",
        popup: "overflow-hidden bg-panel border border-panel-border-soft rounded-panel text-fg-strong",
      },
    },
    defaultVariants: { tone: "panel" },
  });

  type PanelTone = VariantProps<typeof panel>["tone"];

  let {
    id = null,
    title = null,
    onClose = null,
    tone = "panel",
    headRight = null,
    children,
  }: {
    id?: string | null;
    title?: string | null;
    onClose?: (() => void) | null;
    tone?: PanelTone;
    /** 标题栏右侧的额外内容（状态字等），排在关闭按钮之前 */
    headRight?: Snippet | null;
    children: Snippet;
  } = $props();
</script>

<div id={id} data-tone={tone} class={panel({ tone })}>
  {#if title !== null || onClose || headRight}
    <div class="panel-head flex select-none items-center justify-between px-3 pt-2.5 pb-1.5 font-semibold">
      <span>{title ?? ""}</span>
      {#if headRight || onClose}
        <div class="flex items-center gap-2">
          {#if headRight}
            {@render headRight()}
          {/if}
          {#if onClose}
            <Button variant="close" class="panel-close" onclick={onClose}>×</Button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
  <div class="flex min-h-0 flex-1 flex-col">
    {@render children()}
  </div>
</div>

<style>
  /* 面板字号：非 scale 值（13px / 12px），只在此处定义；颜色仍走 token */
  [data-tone="panel"] {
    font-size: 13px;
  }
  [data-tone="popup"] {
    font-size: 12px;
  }
</style>
