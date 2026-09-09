<!-- 窗口组件：渲染本窗口的外框，并把窗口壳发布到 context。
     不创建服务、不定尺寸、不移动/显隐窗口——窗口是宿主对象（docs/ui-composition.md §Window assembly）。 -->
<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import { shellContext, type WindowShell } from "../shell/context";

  let {
    kind,
    shell,
    children,
  }: { kind: string; shell: WindowShell; children: Snippet } = $props();

  // 壳由入口创建一次；窗口组件只发布它，不随 props 变化——按初始值捕获是意图
  // svelte-ignore state_referenced_locally
  setContext(shellContext, shell);
</script>

<div class="window" data-kind={kind}>
  {@render children()}
</div>
