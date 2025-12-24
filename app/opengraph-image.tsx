import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "拾盐记 - 知乎内容采集与管理系统";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #1a1a1a 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a1a1a 2%, transparent 0%)",
          backgroundSize: "100px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              fontSize: 80,
              fontWeight: "bold",
              color: "white",
              marginBottom: 20,
              letterSpacing: "-0.02em",
            }}
          >
            拾盐记
          </h1>
          <p
            style={{
              fontSize: 32,
              color: "#a1a1aa",
              marginTop: 0,
            }}
          >
            知乎内容采集与管理系统
          </p>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 40,
            }}
          >
            <span
              style={{
                padding: "8px 20px",
                backgroundColor: "#27272a",
                borderRadius: 20,
                color: "#a1a1aa",
                fontSize: 20,
              }}
            >
              付费专栏
            </span>
            <span
              style={{
                padding: "8px 20px",
                backgroundColor: "#27272a",
                borderRadius: 20,
                color: "#a1a1aa",
                fontSize: 20,
              }}
            >
              问答内容
            </span>
            <span
              style={{
                padding: "8px 20px",
                backgroundColor: "#27272a",
                borderRadius: 20,
                color: "#a1a1aa",
                fontSize: 20,
              }}
            >
              本地存储
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
