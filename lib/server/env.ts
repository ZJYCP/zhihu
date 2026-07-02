/**
 * 集中读取启动期环境变量，避免 process.env 零散分布。
 *
 * 这些值在进程启动时即固定，运行时不变；DB 运行时配置（cookie、api key 等）
 * 不在此处，见 lib/config/runtime-config.ts。
 */

/** APP_SECRET：admin token 签名密钥，缺失则 fail-fast */
export function getAppSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET 未配置");
  }
  return secret;
}

/** ADMIN_PASSWORD：管理后台登录密码，缺失则 fail-fast */
export function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD 未配置");
  }
  return password;
}

/** PORT：服务监听端口，默认 3000 */
export function getPort(): number {
  return Number(process.env.PORT || 3000);
}
