<!-- 二级业务组件：Chat 消息流的一行。
     只按行模型渲染：文案与角色来自行数据，重试与展开思考由回调交回上层。
     气泡样式（气泡 / 系统行 / 思考 / 回应提示）是消息流的家，收在本组件的 scoped 样式里。 -->
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
{:else if row.kind === "notice"}
  <div class="chat-msg chat-system">{row.text}</div>
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

<style>
  .chat-msg {
    padding: 6px 10px;
    border-radius: var(--ov-card-radius);
    max-width: 85%;
    white-space: pre-wrap;
  }
  .chat-user {
    align-self: flex-end;
    background: var(--ov-bubble-user);
  }
  .chat-assistant {
    align-self: flex-start;
    background: var(--ov-bubble-assistant);
  }
  .chat-system {
    align-self: center;
    background: var(--ov-bubble-system);
    color: var(--ov-muted);
    font-size: 12px;
  }
  /* ThinkingBubble：虚线透明气泡「…」，点击展开 ThinkingModal */
  .chat-thinking {
    opacity: 0.6;
    border: 1px dashed var(--ov-thinking-border);
    border-radius: var(--ov-input-radius);
    cursor: default;
  }
  /* 回应提示「…」轻量动画：透明度呼吸，不改布局、不抢焦点 */
  .chat-replying {
    animation: chat-replying-pulse 1.2s ease-in-out infinite;
  }
  @keyframes chat-replying-pulse {
    0%,
    100% {
      opacity: 0.45;
    }
    50% {
      opacity: 1;
    }
  }
  .chat-send-failed button {
    margin-left: 6px;
    background: var(--ov-accent-bg);
    border: 1px solid var(--ov-accent-border);
    border-radius: var(--ov-control-radius);
    color: var(--ov-accent);
    cursor: pointer;
    font-size: 11px;
    padding: 1px 8px;
  }
  /* LLM 连接错误：消息流气泡（区分原因） */
  .chat-llm-error {
    color: var(--ov-error);
  }
</style>
