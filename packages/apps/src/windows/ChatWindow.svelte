<!-- Chat 窗口内容：壳给状态与动作，面板组件渲染；宿主接线在 shell/kinds/chat.ts。 -->
<script lang="ts">
  import { onMount } from "svelte";
  import Window from "./Window.svelte";
  import ChatPanel from "../components/chat-panel/ChatPanel.svelte";
  import { createChatState } from "../shell/kinds/chat-state.svelte";
  import { wireChatWindow } from "../shell/kinds/chat";
  import type { WindowShell } from "../shell/context";

  let { shell }: { shell: WindowShell } = $props();
  // 壳由入口创建一次，状态随之绑定一次——按初始值捕获是意图
  // svelte-ignore state_referenced_locally
  const state = createChatState(shell.bridge, shell.store);

  onMount(() => {
    void wireChatWindow(shell, state);
  });
</script>

<Window kind="chat" {shell}>
  <ChatPanel chat={state} onClose={() => state.intentClose()} />
</Window>
