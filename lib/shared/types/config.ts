/** 运行时配置项类型（与 lib/config/runtime-config.ts 的 ConfigKind 一致） */
export type ConfigKind = "string" | "number" | "secret";

/** 序列化后的配置项 — GET /api/admin/config 返回的列表元素 */
export interface ConfigItem {
  key: string;
  value: string;
  maskedValue: string;
  label: string;
  description: string;
  defaultValue: string;
  sensitive: boolean;
  kind: ConfigKind;
}
