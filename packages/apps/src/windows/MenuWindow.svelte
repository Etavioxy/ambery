<!-- Menu 窗口内容：壳给状态，面板组件渲染，宿主接线在 shell/kinds/menu.ts。
     UI 语言切换（宿主 invalidate）用 {#key} 整块重建：面板文案散在多个子组件里，
     重建比逐处传 rev 简单且不会漏。 -->
<script lang="ts">
  import { onMount } from "svelte";
  import MenuPanel from "../components/menu-panel/MenuPanel.svelte";
  import { createMenuState } from "../shell/kinds/menu-state.svelte";
  import { hideMenuWindow, quitApp, togglePet, wireMenuWindow } from "../shell/kinds/menu";
  import { t } from "../i18n";
  import Panel from "../widgets/panel/Panel.svelte";
  import type { WindowShell } from "../shell/context";
  import Window from "./Window.svelte";

  let { shell }: { shell: WindowShell } = $props();
  // 壳由入口创建一次，状态随之绑定一次——按初始值捕获是意图
  // svelte-ignore state_referenced_locally
  const menu = createMenuState(shell.bridge);
  let rev = $state(0);

  onMount(() => {
    shell.onInvalidate(() => rev++);
    void wireMenuWindow(menu);
  });
</script>

{#snippet headRight()}
  <span id="panel-head-right">
    <span id="panel-status" class={menu.status.cls}>{menu.status.text}</span>
  </span>
{/snippet}

<Window kind="menu" {shell}>
  <Panel
    id="menu-panel"
    tone="popup"
    title={t("menu.title")}
    closeTitle={t("menu.close-title")}
    {headRight}
    onClose={() => void hideMenuWindow()}
  >
    {#key rev}
      <MenuPanel {menu} onTogglePet={togglePet} onQuit={quitApp} />
    {/key}
  </Panel>
</Window>
