// Component spec 的形态适配：v2 信封把类型专属字段收在 content 里。
// 渲染层当前按扁平字段读取；注册表落地前，这里在入口做一次归一，两种形态都吃。

import type { ComponentSpec } from "../bridge";

/** 把信封形态摊成渲染层使用的扁平形态；已是扁平的原样返回 */
export function flattenSpec(spec: ComponentSpec): ComponentSpec {
  const content = (spec as { content?: unknown }).content;
  if (!content || typeof content !== "object") return spec;
  return { ...spec, ...(content as Record<string, unknown>) } as ComponentSpec;
}
