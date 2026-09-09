import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  // 测试要编译 .svelte / .svelte.ts（壳的响应式状态模块）
  plugins: [svelte()],
  // jsdom 环境按浏览器条件解析 svelte（否则拿到 server 构建，mount/runes 不可用）；
  // ws 必须钉回 node 实现——它的 browser 条件指向拒绝加载的桩，而 case 的 shim 用它连 WS
  resolve: {
    conditions: ["browser"],
    alias: { ws: fileURLToPath(new URL("./node_modules/ws/wrapper.mjs", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // 前端进 case：case-runner 内嵌单例 core——
    // 测试文件共享同一份 config/storage，串行防跨文件污染（如 i18n 语言切换）
    fileParallelism: false,
    include: ["test/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
