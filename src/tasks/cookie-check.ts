import { defineTask } from "nitro/task";
import { runCookieCheck } from "../lib/server/cookie-checker";

/**
 * 定时检查知乎 Cookie 可用性。
 *
 * 由 vite.config.ts 的 scheduledTasks 每 30 分钟调度一次，
 * runCookieCheck 内部会 fetch 知乎、写 CookieCheckLog 并清理 7 天前记录。
 */
export default defineTask({
  meta: {
    name: "cookie-check",
    description: "定时检查知乎 Cookie 可用性，写库并清理 7 天前记录",
  },
  async run() {
    const result = await runCookieCheck();
    return { result };
  },
});
