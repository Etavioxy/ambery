<!-- Pet 窗口：无 chrome（无标题栏、无关闭按钮）。内容由 pet 接线在挂载后启动——
     尺寸控制器要测量已渲染的 #face，所以启动点必须在 DOM 就位之后。 -->
<script lang="ts">
  import { onMount } from "svelte";
  import Window from "./Window.svelte";
  import { startPetWindow } from "../shell/kinds/pet";
  import type { WindowShell } from "../shell/context";

  let { shell }: { shell: WindowShell } = $props();
  let host: HTMLElement;

  onMount(() => {
    void startPetWindow(shell, host);
  });
</script>

<Window kind="pet" {shell}>
  <div bind:this={host}></div>
</Window>
