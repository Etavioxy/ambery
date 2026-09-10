// vite 配置：dev server 固定端口 3000（与 tauri.conf.json devUrl 127.0.0.1:3000 对齐，
// strictPort 防端口漂移导致 tauri dev 等待错位端口）。

import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    // tauri 重编译会锁定 src-tauri/target 下的 Rust 产物；vite 不盯它，
    // 否则 watcher 撞 EBUSY 崩溃（Windows 文件锁）。
    // 编辑器的原子写会在项目根落下 `.<name>.<pid>.<uuid>.tmpdir/` 暂存目录，
    // 扫到同样 EBUSY 崩；这些目录是编辑过程产物，不是源码。
    watch: {
      ignored: ["**/src-tauri/target/**", "**/.*.tmpdir/**"],
    },
  },
});
