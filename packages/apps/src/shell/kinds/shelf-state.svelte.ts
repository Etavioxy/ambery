// Shelf 面板的数据状态：面板只收 props，取数收在壳侧一处。
// 两处宿主共用这一份——shelf 窗口（ShelfWindow.svelte）与 pet 页内的 browser overlay
// （shell/kinds/pet.ts），避免两条宿主各写一套取数/刷新语义。
import type { RestoredCard } from "../../bridge";
import type { ShelfActions } from "../../components/shelf-panel/shelf-actions";

export interface ShelfState {
  /** null = 尚未取到（面板显示加载态） */
  readonly cards: RestoredCard[] | null;
  load(): Promise<void>;
}

export function createShelfState(actions: ShelfActions): ShelfState {
  let cards = $state<RestoredCard[] | null>(null);
  return {
    get cards() {
      return cards;
    },
    async load() {
      cards = await actions.list();
    },
  };
}
