<!-- 二级业务组件：Chat 消息流的一行。
     只按行模型渲染：文案与角色来自行数据，重试与展开思考由回调交回上层。 -->
<script lang="ts">
  import { t } from "../../i18n";
  import type { ChatRow } from "./chat-rows";

  let {
    row,
    onRetry = null,
    onOpenThinking = null,
  }: {
    row: ChatRow;
    onRetry?: ((text: string) => void) | null;
    onOpenThinking?: (() => void) | null;
  } = $props();
</script>

{#if row.kind === "message"}
  <div class="chat-msg chat-{row.role}">{row.text}</div>
{:else if row.kind === "error"}
  <div class="chat-msg chat-system chat-llm-error">{row.text}</div>
{:else if row.kind === "stream"}
  <div class="chat-msg chat-assistant">{row.text}</div>
{:else if row.kind === "thinking"}
  <div
    class="chat-msg chat-system chat-thinking"
    role="button"
    tabindex="0"
    title={t("chat.thinking-title")}
    onclick={onOpenThinking}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenThinking?.();
      }
    }}
  >
    …
  </div>
{:else if row.kind === "replying"}
  <div class="chat-msg chat-system chat-replying">…</div>
{:else if row.kind === "send-failed"}
  <div class="chat-msg chat-system chat-send-failed">
    {row.text}
    <button onclick={() => onRetry?.(row.text)}>{t("chat.retry")}</button>
  </div>
{/if}
