import path from "node:path";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
  },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      // srcDirectory 默认 "src"；routesDirectory 默认 "routes"（解析在 src 下）
      // routeTree.gen.ts 生成在 src/ 下
      router: {
        indexToken: "page",
      },
    }),
    viteReact(),
    nitro({
      noExternals: true,
      // Nitro tasks 为 experimental，开启后 scheduledTasks 才会在 dev 与
      // node-server 生产环境由内置 croner 引擎调度
      experimental: { tasks: true },
      // 显式注册 task handler（绝对路径）：TanStack Start 改了 srcDirectory，
      // Nitro 默认 tasks/ 文件扫描与相对 handler 路径都解析不到，故用绝对路径。
      tasks: {
        "cookie-check": {
          handler: path.resolve(import.meta.dirname, "src/tasks/cookie-check.ts"),
          description: "定时检查知乎 Cookie 可用性，写库并清理 7 天前记录",
        },
      },
      scheduledTasks: {
        "*/30 * * * *": "cookie-check",
      },
      rolldownConfig: {
        external: [
          /^sharp(\/.*)?$/,
          // @prisma/client 是 CJS，内部用 __dirname 定位 query-engine 二进制；
          // 打进 ESM bundle 后 __dirname 不存在会运行时报错，故保持 external 由 node_modules 解析。
          /^@prisma\/client(\/.*)?$/,
          /^\.prisma\/client(\/.*)?$/,
        ],
      },
      rollupConfig: {
        external: [
          /^sharp(\/.*)?$/,
          /^@prisma\/client(\/.*)?$/,
          /^\.prisma\/client(\/.*)?$/,
        ],
      },
    }),
  ],
});
