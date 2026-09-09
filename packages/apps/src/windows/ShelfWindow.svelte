<!-- Cards Shelf 内容：列表 + 显隐/删除，数据动作由壳提供（components 里的 ShelfPanel 负责行渲染）。 -->
<script lang="ts">
  import { onMount } from "svelte";
  import Window from "./Window.svelte";
  import { ShelfPanel } from "./shelf-panel";
  import { createShelfActions } from "../shell/kinds/shelf";
  import type { WindowShell } from "../shell/context";

  let { shell }: { shell: WindowShell } = $props();
  let host: HTMLElement;
  let panel: ShelfPanel | null = null;

  onMount(() => {
    panel = new ShelfPanel(host, createShelfActions(shell));
    shell.onInvalidate(() => void panel?.refresh());
    void panel.refresh();
  });
</script>

<Window kind="shelf" {shell}>
  <div bind:this={host}></div>
</Window>
