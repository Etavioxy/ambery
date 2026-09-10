<!-- 一级 widget：Panel —— 窗口的面板 chrome（标题栏可选）。
     一个 Surface 有标题栏时用 Panel 包住内容；pet 与 Cards Shelf 不包（无标题栏）。
     只渲染：标题文案与关闭的语义由调用方给（关闭 = 隐藏窗口 / dismiss 卡片，由调用方决定）。
     标题栏类名 `panel-head` / 关闭按钮 `panel-close` 是窗口拖拽与跳过按钮的语义钩子。 -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "../button/Button.svelte";

  let {
    id = null,
    title = null,
    onClose = null,
    children,
  }: {
    id?: string | null;
    title?: string | null;
    onClose?: (() => void) | null;
    children: Snippet;
  } = $props();
</script>

<div id={id} class="flex h-full min-h-0 flex-col">
  {#if title !== null || onClose}
    <div class="panel-head flex select-none items-center justify-between px-3 pt-2.5 pb-1.5 font-semibold">
      <span>{title ?? ""}</span>
      {#if onClose}
        <Button variant="close" class="panel-close" onclick={onClose}>×</Button>
      {/if}
    </div>
  {/if}
  <div class="flex min-h-0 flex-1 flex-col">
    {@render children()}
  </div>
</div>
