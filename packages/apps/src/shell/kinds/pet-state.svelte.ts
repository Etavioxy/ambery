// Pet 窗口的显示状态（Svelte 响应式）：组件读，接线写。
// 尺寸推导不在这里——它归 pet-size 的纯函数与接线里的尺寸控制器。

import type { Motion } from "../../bridge";

/** 未读角标：形态与方位是语义，类名由组件拼 */
export interface PetBadgeState {
  style: "number" | "bubble";
  side: "left" | "right";
  text: string;
  /** 字号由 viewScale 现算（非主题 token） */
  fontSize: string;
  visible: boolean;
}

export interface PetFaceState {
  /** 颜文字文本 */
  text: string;
  /** 当前动效（data-motion） */
  motion: Motion;
  /** 缩放（--view-scale） */
  scale: number;
  badge: PetBadgeState;
}

export const petFace = $state<PetFaceState>({
  text: "",
  motion: "still",
  scale: 1,
  badge: {
    style: "number",
    side: "right",
    text: "",
    fontSize: "5px",
    visible: false,
  },
});
