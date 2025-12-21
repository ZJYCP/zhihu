import {
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
  vitePlugin as remix,
} from "@remix-run/dev"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { getLoadContext } from "./app/load-context"

declare module "@remix-run/cloudflare" {
  interface Future {
    v3_singleFetch: true
  }
}

export default defineConfig({
  plugins: [
    remixCloudflareDevProxy({ getLoadContext }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
  ssr: {
    resolve: {
      conditions: ["workerd", "worker", "browser"],
    },
    external: ["sharp"],
  },
})
