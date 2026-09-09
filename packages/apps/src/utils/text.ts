// 纯文本工具：渲染层共享的小函数。

/** 把文本转义为可安全插入 innerHTML 的 HTML */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
