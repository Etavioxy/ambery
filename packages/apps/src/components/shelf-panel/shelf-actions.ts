// Cards Shelf 面板对宿主的动作面：面板只调用这些回调，不碰 IPC、不碰 store。
// 两处宿主各实现一份——shelf 窗口（shell/kinds/shelf.ts）与 pet 页内的 browser overlay。
import type { RestoredCard } from "../../bridge";

export interface ShelfActions {
  /** 拉取存活卡片（component + user_closed） */
  list(): Promise<RestoredCard[]>;
  /** 显示选择切换（落 _meta.user_closed + 藏/开窗或 DOM 显隐；userClosed=true=隐藏） */
  setUserClosed(c: RestoredCard, userClosed: boolean): Promise<void>;
  /** dismiss（结束 Surface：closed_by_user 事件 + 出注册 + 销毁窗/DOM） */
  dismiss(c: RestoredCard, title: string): Promise<void>;
  /** Card 集合外部变化通知（agent render/close）→ 面板重取 */
  onCardsChanged?(cb: () => void): void;
}
