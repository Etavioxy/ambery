<!-- Cards Shelf 窗口内容：壳给数据状态与动作，面板组件只渲染。 -->
<script lang="ts">
  import { onMount } from "svelte";
  import Window from "./Window.svelte";
  import ShelfPanel from "../components/shelf-panel/ShelfPanel.svelte";
  import { createShelfActions, wireShelfWindow } from "../shell/kinds/shelf";
  import { createShelfState } from "../shell/kinds/shelf-state.svelte";
  import type { WindowShell } from "../shell/context";

  let { shell }: { shell: WindowShell } = $props();
  // 壳由入口创建一次，动作与状态随之绑定一次——按初始值捕获是意图
  // svelte-ignore state_referenced_locally
  const actions = createShelfActions(shell);
  const state = createShelfState(actions);

  onMount(() => {
    // 两个刷新入口：Card 集合变化（agent 增删）与宿主失效（语言切换 / 中键重开）
    actions.onCardsChanged?.(() => void state.load());
    shell.onInvalidate(() => void state.load());
    void state.load();
    void wireShelfWindow(shell);
  });
</script>

<Window kind="shelf" {shell}>
  <ShelfPanel {state} {actions} />
</Window>
