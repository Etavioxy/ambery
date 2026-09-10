// Chat 的数据状态与动作（与 DOM 无关的一侧）：Context 消息、流式/思考增量、回应与排队计数、
// 错误气泡与 banner、未配置拦截，以及可见性语义（用户意图关闭 / 系统藏）。
// 两处宿主共用：chat 窗口与 pet 页浏览器 overlay。DOM 几何（滚动位置、锚点恢复、输入框自增长）
// 留在面板组件里；宿主的副作用（窗口 hide/release、打开引导 modal）由宿主注入钩子。
import type { Bridge, ContextMessage, ErrorEvent } from "../../bridge";
import type { Store } from "../../store";
import { reportEffect } from "../../effects";
import { t } from "../../i18n";
import { visibleMessages } from "../../components/chat-panel/chat-rows";

export interface ChatBanner {
  text: string;
  /** "setup" = 点击打开配置引导；null = 纯告知 */
  action: string | null;
  /** 动作记录用的状态标签（banner 来源） */
  reportState: string;
}

/** 发送结果：sent = 已进 Queue；failed = core 拒收（文字退回输入区）；blocked = 未配置被拦截 */
export type SendOutcome = "sent" | "failed" | "blocked";

export interface ChatState {
  readonly messages: ContextMessage[];
  /** core 未就绪（Context 从未取到）：消息流显示离线提示 */
  readonly offline: boolean;
  readonly optimisticUsers: { text: string; ts: number }[];
  readonly streamingText: string;
  readonly thinkingText: string;
  readonly thinking: boolean;
  readonly replying: boolean;
  readonly queued: number;
  readonly errorBubbles: { ts: number; message: string }[];
  readonly sendFailed: string | null;
  readonly banner: ChatBanner | null;
  readonly unconfigured: boolean;
  /** 文案版本：配置（含 UI 语言）变化即自增，组件读它让 i18n 文案重新取词 */
  readonly rev: number;
  /** 用户意图关闭（窗口私有；与系统藏分离，A 语义单源） */
  readonly userClosed: boolean;
  readonly visible: boolean;

  /** 打开配置引导 modal（宿主注入） */
  onOpenSetup: (() => void) | null;
  /** 用户意图关的宿主副作用（释放占区 + 藏窗口，宿主注入） */
  onIntentClose: (() => void) | null;

  send(text: string): Promise<SendOutcome>;
  clearSendFailed(): void;
  clearBanner(): void;
  showSetupBanner(): void;
  showSetupError(message: string): void;
  setUnconfigured(value: boolean): void;

  show(): void;
  intentClose(): void;
  intentOpen(): void;
  systemHide(): void;
  /** 系统恢复判定：用户没主动关才恢复（定位与显示由宿主负责） */
  systemRestore(): boolean;
}

export function createChatState(bridge: Bridge, store: Store): ChatState {
  let messages = $state<ContextMessage[]>(store.context ?? []);
  let offline = $state(store.context === null);
  let optimisticUsers = $state<{ text: string; ts: number }[]>([]);
  let streamingText = $state("");
  let thinkingText = $state("");
  let thinking = $state(false);
  let replying = $state(false);
  let awaitingReply = $state(0);
  let streaming = $state(false);
  let errorBubbles = $state<{ ts: number; message: string }[]>([]);
  let sendFailed = $state<string | null>(null);
  let banner = $state<ChatBanner | null>(null);
  let unconfigured = $state(false);
  let userClosed = $state(false);
  let visible = $state(false);
  let rev = $state(0);

  const api: ChatState = {
    get messages() {
      return messages;
    },
    get offline() {
      return offline;
    },
    get optimisticUsers() {
      return optimisticUsers;
    },
    get streamingText() {
      return streamingText;
    },
    get thinkingText() {
      return thinkingText;
    },
    get thinking() {
      return thinking;
    },
    get replying() {
      return replying;
    },
    // 「已排队等待处理」= 已发送尚未完成数 - 正在回应的那条（不把排队伪装成已被读取）
    get queued() {
      return Math.max(0, awaitingReply - (streaming || replying ? 1 : 0));
    },
    get errorBubbles() {
      return errorBubbles;
    },
    get sendFailed() {
      return sendFailed;
    },
    get banner() {
      return banner;
    },
    get unconfigured() {
      return unconfigured;
    },
    get rev() {
      return rev;
    },
    get userClosed() {
      return userClosed;
    },
    get visible() {
      return visible;
    },

    onOpenSetup: null,
    onIntentClose: null,

    async send(text) {
      const body = text.trim();
      if (!body) return "failed";
      // 未配置：发消息不静默——错误气泡（不进 Queue；banner 已带引导入口）
      if (unconfigured) {
        errorBubbles = [...errorBubbles, { ts: Date.now(), message: t("chat.unconfigured-error") }];
        return "blocked";
      }
      sendFailed = null;
      replying = true;
      awaitingReply += 1;
      optimisticUsers = [...optimisticUsers, { text: body, ts: Date.now() }];
      // 动作记录：前端渲染了用户气泡（记录不驱动渲染）
      reportEffect("user_bubble", { text: body });
      const ok = await bridge.appendUserMessage(body);
      if (!ok) {
        awaitingReply = Math.max(0, awaitingReply - 1);
        replying = false;
        optimisticUsers = optimisticUsers.slice(0, -1);
        sendFailed = body;
        return "failed";
      }
      return "sent";
    },

    clearSendFailed() {
      sendFailed = null;
    },
    clearBanner() {
      banner = null;
    },
    showSetupBanner() {
      showBanner(t("chat.setup-banner"), "setup", "chat.setup-banner");
    },
    showSetupError(message) {
      showBanner(message, "setup", "llm-error");
    },
    setUnconfigured(value) {
      unconfigured = value;
    },

    show() {
      visible = true;
    },
    intentClose() {
      userClosed = true;
      visible = false;
      api.onIntentClose?.();
    },
    intentOpen() {
      userClosed = false;
    },
    systemHide() {
      visible = false;
    },
    systemRestore() {
      return !userClosed;
    },
  };

  /** banner 出口：单元素——已有 banner 在屏时不叠加；关闭即忽略该条件本轮 */
  function showBanner(text: string, action: string | null, reportState: string) {
    if (banner) return;
    banner = { text, action, reportState };
    // 动作记录：前端显示了 banner（记录不驱动渲染）
    reportEffect("setup_banner", { state: reportState });
  }

  /** Context 回流：全量消息落地；乐观气泡按文本 FIFO 消耗（转正后不再重复渲染） */
  function reconcileOptimistic(next: ContextMessage[]) {
    if (optimisticUsers.length === 0) return;
    const users = visibleMessages(next).filter((m) => m.role === "user");
    const rest: { text: string; ts: number }[] = [];
    let cursor = 0;
    for (const o of optimisticUsers) {
      let matched = false;
      for (let i = cursor; i < users.length; i++) {
        if (users[i].content === o.text) {
          cursor = i + 1;
          matched = true;
          break;
        }
      }
      if (!matched) rest.push(o);
    }
    optimisticUsers = rest;
  }

  store.onContext((next) => {    messages = next;
    offline = false;
    reconcileOptimistic(next);
    // Context 一到，「回应提示」与思考行即功成身退（正文由消息流呈现）
    replying = false;
    thinking = false;
    thinkingText = "";
  });

  // UI 语言 / 其它配置变化 → 文案重新取词（历史内容不翻译）
  store.onConfig(() => {
    rev += 1;
  });

  bridge.onAssistantDelta?.((d) => {
    replying = false;
    streaming = true;
    if (d.reasoning_content) {
      thinkingText += d.reasoning_content;
      thinking = true;
    }
    if (d.content) {
      thinking = false;
      streamingText += d.content;
    }
  });

  bridge.onAssistantDone?.(() => {
    replying = false;
    thinking = false;
    thinkingText = "";
    streamingText = "";
    streaming = false;
    awaitingReply = Math.max(0, awaitingReply - 1);
  });

  bridge.onError?.((e: ErrorEvent) => {
    if (e.retention === "persistent") {
      showBanner(e.message, e.action ?? null, e.action ?? "notice");
      return;
    }
    errorBubbles = [...errorBubbles, { ts: Date.now(), message: e.message }];
    // 动作记录：前端渲染了错误气泡（记录不驱动渲染）
    reportEffect("error_bubble", { message: e.message });
  });

  return api;
}
