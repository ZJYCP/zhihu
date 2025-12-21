import { type AppLoadContext } from "@remix-run/cloudflare";
import { type PlatformProxy } from "wrangler";
import { getDb, type Database } from "./db";

interface Env {
  DB: D1Database;
  ZHIHU_COOKIE: string;
  SILICONFLOW_API_KEY: string;
}

type Cloudflare = Omit<PlatformProxy<Env>, "dispose">;

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: Cloudflare;
    db: Database;
  }
}

type GetLoadContextArgs = {
  request: Request;
  context: {
    cloudflare: Cloudflare;
  };
};

export function getLoadContext({
  context,
}: GetLoadContextArgs): AppLoadContext {
  return {
    cloudflare: context.cloudflare,
    db: getDb(context.cloudflare.env.DB),
  };
}
