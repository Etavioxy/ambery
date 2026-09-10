// Chat 消息流的行模型（纯函数，无 DOM、无状态）：
// 把「Context 消息」与「界面瞬态行」合成一份有序行表，组件只按行表渲染。
// 瞬态行 = 在飞的流式气泡 / 思考气泡 / 回应提示「…」/ 发送失败行 / 错误气泡——
// 它们不是 Context 内容，全量重渲不得冲掉（失败说明必须留到用户处理）。
// 每行带 key：keyed each 按身份取键（同 ts 的消息用位置区分，append 场景下身份稳定）。
import type { ContextMessage } from "../../bridge";

export type ChatRow =
  | { kind: "message"; key: string; role: "user" | "assistant"; text: string; ts: number }
  | { kind: "error"; key: string; text: string; ts: number }
  | { kind: "notice"; key: string; text: string }
  | { kind: "stream"; key: string; text: string }
  | { kind: "thinking"; key: string }
  | { kind: "replying"; key: string }
  | { kind: "send-failed"; key: string; text: string };

export interface ChatTransientRows {
  /** core 未就绪时的提示行（消息流为空时才出现）；null = 不显示 */
  notice: string | null;
  /** 乐观用户气泡：已发出但 Context 尚未回流（回流后由调用方移出，避免重复一行） */
  optimisticUsers: { text: string; ts: number }[];
  /** transient 错误气泡：带触发时刻，按 ts 并回消息流（时序正确） */
  errorBubbles: { ts: number; message: string }[];
  /** 在飞的 assistant 流式文本（空串 = 无） */
  streamingText: string;
  /** 思考阶段：reasoning 已到达、正文未开始 */
  thinking: boolean;
  /** 回应提示：assistant 尚未输出正文 */
  replying: boolean;
  /** 发送失败行：文字已退回输入区，这行留到用户处理 */
  sendFailed: string | null;
}

/** 可见消息 = 有正文的 user / assistant 行（其它 role 不进消息流） */
export function visibleMessages(messages: ContextMessage[]): ContextMessage[] {
  return messages.filter((m) => (m.role === "user" || m.role === "assistant") && m.content);
}

function tsOf(row: ChatRow): number {
  return row.kind === "message" || row.kind === "error" ? row.ts : Number.POSITIVE_INFINITY;
}

export function buildChatRows(
  messages: ContextMessage[],
  transient: ChatTransientRows,
): ChatRow[] {
  const rows: ChatRow[] = visibleMessages(messages).map((m, i) => ({
    kind: "message" as const,
    key: `message:${m.ts}:${i}`,
    role: m.role as "user" | "assistant",
    text: m.content,
    ts: m.ts,
  }));
  for (const e of transient.errorBubbles) {
    rows.push({ kind: "error", key: `error:${e.ts}`, text: e.message, ts: e.ts });
  }
  for (const u of transient.optimisticUsers) {
    rows.push({ kind: "message", key: `optimistic:${u.ts}`, role: "user", text: u.text, ts: u.ts });
  }
  // 消息与错误气泡按时序合并；瞬态行（ts = ∞）恒在末尾，互不越序
  rows.sort((a, b) => tsOf(a) - tsOf(b));
  if (transient.notice !== null && rows.length === 0) {
    rows.push({ kind: "notice", key: "notice", text: transient.notice });
  }
  if (transient.streamingText) {
    rows.push({ kind: "stream", key: "stream", text: transient.streamingText });
  }
  if (transient.thinking) rows.push({ kind: "thinking", key: "thinking" });
  if (transient.replying) rows.push({ kind: "replying", key: "replying" });
  if (transient.sendFailed !== null) {
    rows.push({ kind: "send-failed", key: "send-failed", text: transient.sendFailed });
  }
  return rows;
}
