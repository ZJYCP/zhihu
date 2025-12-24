import { MetadataRoute } from "next";

const BASE_URL = "https://zhihu.artimind.top"; // 替换为你的实际域名

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
