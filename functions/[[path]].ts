import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages"

// @ts-expect-error - virtual module provided by Remix
import * as build from "virtual:remix/server-build"
import { getLoadContext } from "../app/load-context"

export const onRequest = createPagesFunctionHandler({
  build,
  getLoadContext: context => getLoadContext(context.cloudflare),
})
