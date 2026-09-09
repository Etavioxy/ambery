// Pet 窗口的显示状态（Svelte 响应式）：组件读，接线写。
// 尺寸推导不在这里——它归 pet-size 的纯函数与接线里的尺寸控制器。

import type { Motion } from "../../bridge";

export interface PetFaceState {
  /** 颜文字文本 */
  text: string;
  /** 当前动效（data-motion） */
  motion: Motion;
  /** 缩放（--view-scale） */
  scale: number;
  badgeText: string;
  badgeClass: string;
  badgeFontSize: string;
  badgeVisible: boolean;
}

export const petFace = $state<PetFaceState>({
  text: "",
  motion: "still",
  scale: 1,
  badgeText: "",
  badgeClass: "badge-number side-right",
  badgeFontSize: "5px",
  badgeVisible: false,
});
