<!-- 一级 widget：Button —— 包 bits-ui 的 Button 原语。
     行为与无障碍归原语；外观变体在本仓定义（./button-variants.ts）。
     只渲染：不取数据、不做业务判断，点击语义由调用方的回调决定。 -->
<script lang="ts">
  import { Button as BitsButton } from "bits-ui";
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { button, type ButtonVariant } from "./button-variants";

  let {
    variant = "quiet",
    type = "button",
    class: className = "",
    children,
    ...rest
  }: Omit<HTMLButtonAttributes, "class"> & {
    variant?: ButtonVariant;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<BitsButton.Root {type} class={button({ variant, class: className })} {...rest}>
  {@render children()}
</BitsButton.Root>
