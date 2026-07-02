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
