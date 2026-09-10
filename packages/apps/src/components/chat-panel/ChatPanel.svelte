<!-- 二级业务组件：Chat 面板 —— 标题栏 / banner / 消息流 / 新消息提示 / 排队状态 / 输入区。
     数据与动作都从 chat 来（chat-state），组件只管渲染与 DOM 几何：
     滚动意图态机（跟随最新 / 阅读历史）、锚点恢复、输入区自增长、焦点。
     「未读」是算出来的（派生），不是被 effect 写出来的：滚动/点提示时把已读位推到当前条数。
     类名保持既有语义钩子（case 测试与全局样式仍按它们定位）。 -->
<script lang="ts">
  import { t } from "../../i18n";
  import Panel from "../../widgets/panel/Panel.svelte";
  import ChatRow from "./ChatRow.svelte";
  import { buildChatRows, visibleMessages } from "./chat-rows";
  import type { ChatState } from "../../shell/kinds/chat-state.svelte";

  let {
    chat,
    onClose = null,
  }: { chat: ChatState; onClose?: (() => void) | null } = $props();

  /** 输入区自增长上限（px）：超过后输入区自身滚动，不挤没消息历史 */
  const INPUT_MAX_H = 110;
  /** 贴底判定余量（px） */
  const AT_BOTTOM = 8;

  let historyEl = $state<HTMLElement | null>(null);
  let inputEl = $state<HTMLTextAreaElement | null>(null);
  let inputText = $state("");
  let follow = $state(true);
  /** 已读水位：滚动到贴底 / 点「新消息」提示时推到当前条数 */
  let lastSeenCount = $state(0);
  let thinkingOpen = $state(false);
  let suppressScroll = false;

  const rows = $derived(
    buildChatRows(chat.messages, {
      optimisticUsers: chat.optimisticUsers,
      errorBubbles: chat.errorBubbles,
      streamingText: chat.streamingText,
      thinking: chat.thinking,
      replying: chat.replying,
      sendFailed: chat.sendFailed,
    }),
  );
  const messageCount = $derived(visibleMessages(chat.messages).length);
  /** 阅读历史时累积的新消息（一个在飞的流式回复要等它落进 Context 才计一条） */
  const pendingNew = $derived(Math.max(0, messageCount - lastSeenCount));

  /** i18n 文案：读 chat.rev 让配置（含 UI 语言）变化后重新取词 */
  function label(key: Parameters<typeof t>[0], params?: Record<string, string>): string {
    void chat.rev;
    return t(key, params);
  }

  function scrollToBottom() {
    if (!historyEl) return;
    suppressScroll = true;
    historyEl.scrollTop = historyEl.scrollHeight;
    // 滚动事件异步触发，下一拍再恢复意图判读
    setTimeout(() => {
      suppressScroll = false;
    }, 0);
  }

  function onScroll() {
    if (!historyEl) return;
    if (suppressScroll) {
      // 程序化贴底：视口已在最新处，视为已读
      lastSeenCount = messageCount;
      return;
    }
    const atBottom =
      historyEl.scrollHeight - historyEl.scrollTop - historyEl.clientHeight < AT_BOTTOM;
    if (atBottom) {
      follow = true;
      lastSeenCount = messageCount;
    } else {
      follow = false;
    }
  }

  /** 锚点 = 刷新前第一条可见消息（索引 + 其相对容器顶的偏移），不机械复用 scrollTop */
  function captureAnchor(): { index: number; offset: number } | null {
    if (!historyEl) return null;
    const top = historyEl.getBoundingClientRect().top;
    const children = [...historyEl.children];
    for (let i = 0; i < children.length; i++) {
      const r = children[i].getBoundingClientRect();
      if (r.bottom > top) return { index: i, offset: r.top - top };
    }
    return null;
  }

  function restoreAnchor(anchor: { index: number; offset: number }) {
    if (!historyEl) return;
    const child = historyEl.children[anchor.index] as HTMLElement | undefined;
    if (!child) return;
    suppressScroll = true;
    // child.offsetTop 相对 historyEl（position:relative 充当 offsetParent）
    historyEl.scrollTop = child.offsetTop - anchor.offset;
    setTimeout(() => {
      suppressScroll = false;
    }, 0);
  }

  // 跟随者：内容变化即贴底（只碰 DOM，不写状态；未读由 onScroll 的水位维护）
  $effect(() => {
    void messageCount;
    void chat.streamingText;
    if (follow && historyEl) scrollToBottom();
  });

  // 窗口/面板尺寸变化不改变阅读意图：跟随者仍贴底；阅读者以锚点恢复
  $effect(() => {
    if (!historyEl || typeof ResizeObserver === "undefined") return;
    const el = historyEl;
    const ro = new ResizeObserver(() => {
      if (follow) {
        scrollToBottom();
      } else {
        const anchor = captureAnchor();
        if (anchor) restoreAnchor(anchor);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  /** 自增长：默认一行，长到上限后自身滚动；空内容不可发送 */
  function autoGrow() {
    if (!inputEl) return;
    inputEl.style.height = "auto";
    const h = Math.min(inputEl.scrollHeight, INPUT_MAX_H);
    inputEl.style.height = `${h}px`;
    inputEl.style.overflowY = inputEl.scrollHeight > INPUT_MAX_H ? "auto" : "hidden";
  }

  function onInput(ev: Event) {
    inputText = (ev.currentTarget as HTMLTextAreaElement).value;
    autoGrow();
  }

  /** 发送 = 等待后续内容的意图：无论此前是否在阅读历史，都无条件回底并恢复跟随。
   *  文本优先取事件现场的值（程序化改值、IME 场景都不丢字），退化到绑定缓存 */
  async function send(text?: string) {
    const body = (text ?? inputEl?.value ?? inputText).trim();
    if (!body) return;
    // 未配置被拦截时不发送；文字留在输入区，用户可先配置
    const outcome = await chat.send(body);
    if (outcome === "blocked") return;
    if (outcome === "failed") {
      // 文字不丢：退回输入区（继续编辑或点重试）——同步写回 DOM，程序化改值也生效
      if (inputEl) inputEl.value = body;
      inputText = body;
      autoGrow();
      inputEl?.focus();
      return;
    }
    follow = true;
    lastSeenCount = messageCount;
    if (inputEl) inputEl.value = "";
    inputText = "";
    autoGrow();
    inputEl?.focus();
    scrollToBottom();
  }

  function onKeydown(ev: KeyboardEvent) {
    // Enter 发送；Shift+Enter 换行；输入法组合输入未确认时 Enter 只确认候选（不误发送）
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      void send((ev.currentTarget as HTMLTextAreaElement).value);
    }
  }

  function clickPill() {
    follow = true;
    lastSeenCount = messageCount;
    scrollToBottom();
  }

  function retry(text: string) {
    chat.clearSendFailed();
    if (inputEl) inputEl.value = text;
    inputText = text;
    autoGrow();
    void send(text);
  }

  /** 键盘可达：Enter / 空格等同点击（banner、新消息提示、思考气泡） */
  function keyActivate(ev: KeyboardEvent, act: () => void) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      act();
    }
  }
</script>

<Panel id="chat-panel" title={label("chat.title")} {onClose}>
  {#if chat.banner}
    <!-- 未配置 / 初始化失败横幅：点击进配置引导；× 关闭即忽略该条件本轮 -->
    <div
      class="chat-setup-banner"
      role="button"
      tabindex="0"
      onclick={() => chat.banner?.action === "setup" && chat.onOpenSetup?.()}
      onkeydown={(e) => keyActivate(e, () => chat.banner?.action === "setup" && chat.onOpenSetup?.())}
    >
      <span>{chat.banner.text}</span>
      <button class="chat-setup-banner-close" onclick={() => chat.clearBanner()}>×</button>
    </div>
  {/if}

  <div class="chat-history" bind:this={historyEl} onscroll={onScroll}>
    {#if chat.offline && rows.length === 0}
      <div class="chat-msg chat-system">{label("chat.offline")}</div>
    {:else}
      {#each rows as row (row.key)}
        <ChatRow {row} onRetry={retry} onOpenThinking={() => (thinkingOpen = true)} />
      {/each}
    {/if}
  </div>

  {#if !follow && pendingNew > 0}
    <div
      class="chat-pill"
      role="button"
      tabindex="0"
      onclick={clickPill}
      onkeydown={(e) => keyActivate(e, clickPill)}
    >{label("chat.new-messages", { n: String(pendingNew) })}</div>
  {/if}

  {#if chat.queued > 0}
    <div class="chat-queue-status">{label("chat.queued", { n: String(chat.queued) })}</div>
  {/if}

  <div class="chat-input-row">
    <textarea
      class="chat-input"
      rows="1"
      bind:this={inputEl}
      value={inputText}
      oninput={onInput}
      onkeydown={onKeydown}
    ></textarea>
    <button class="chat-send" disabled={!inputText.trim()} onclick={() => void send()}>
      {label("chat.send")}
    </button>
  </div>
</Panel>

{#if thinkingOpen}
  <!-- ThinkingModal：reasoning 全文（界面瞬态，不入 Context） -->
  <div
    class="think-overlay"
    role="presentation"
    onclick={() => (thinkingOpen = false)}
    onkeydown={(e) => keyActivate(e, () => (thinkingOpen = false))}
  >
    <div class="think-card">
      <pre>{chat.thinkingText}</pre>
    </div>
  </div>
{/if}
