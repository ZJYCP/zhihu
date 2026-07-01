import { createServerFn } from "@tanstack/react-start";
import { getPublicCookieStatus } from "@/lib/service-status";

export const getServiceStatusForAbout = createServerFn({ method: "GET" })
  .handler(async () => getPublicCookieStatus());
