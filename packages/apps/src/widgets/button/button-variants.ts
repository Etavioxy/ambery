// 一级 widget：Button 的变体表。
// 外观只在这里定义；工具类只读设计 token（--ov-* 经 @theme 映射），不写具体色值，
// 也不用任意值（token 守卫：任意值只允许 var(--ov-*)）。
import { tv, type VariantProps } from "tailwind-variants";

export const button = tv({
  base: "inline-flex items-center justify-center border-none bg-transparent cursor-pointer text-xs disabled:opacity-45 disabled:cursor-default",
  variants: {
    variant: {
      // 图标按钮（行内 👁 / ✕ 一类）：无底色，hover 出底色（半径 4px = rounded）
      quiet: "text-fg-strong py-0.5 px-1 rounded hover:bg-hover",
      // 图标按钮 · 危险语义（删除/关闭）
      danger: "text-dismiss py-0.5 px-1 rounded hover:bg-hover",
      // 面板关闭（标题栏 ×）：无底色，hover 转危险色
      close: "text-muted text-base hover:text-danger",
    },
  },
  defaultVariants: { variant: "quiet" },
});

export type ButtonVariant = VariantProps<typeof button>["variant"];
