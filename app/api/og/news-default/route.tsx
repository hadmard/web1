import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "整木网资讯分享封面";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(10,132,255,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(24,165,143,0.16), transparent 30%), linear-gradient(135deg, #f7f8fb 0%, #eef2f7 52%, #f8fafc 100%)",
          color: "#111827",
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 32,
            borderRadius: 34,
            border: "1px solid rgba(148, 163, 184, 0.22)",
            background: "rgba(255,255,255,0.82)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 78,
            top: 78,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: 700,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 108,
                height: 108,
                borderRadius: 28,
                background: "linear-gradient(180deg, #111827 0%, #1f2937 100%)",
                color: "#ffffff",
                fontSize: 46,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              整木
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "0.06em" }}>整木网</div>
              <div style={{ fontSize: 24, color: "#475569" }}>整体木作行业知识共享平台</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: "#0a84ff",
              }}
            />
            <div style={{ fontSize: 26, color: "#0f172a", fontWeight: 600 }}>整木资讯分享</div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginTop: 24,
              color: "#334155",
              fontSize: 28,
              lineHeight: 1.5,
            }}
          >
            <div>聚合行业动态、品牌观察与木作方法论。</div>
            <div>当新闻未设置封面图时，使用此站点默认分享封面。</div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 82,
            top: 96,
            width: 290,
            height: 438,
            borderRadius: 36,
            background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(241,245,249,0.98))",
            border: "1px solid rgba(148,163,184,0.2)",
            boxShadow: "0 26px 54px rgba(15,23,42,0.12)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "28px 24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 20, color: "#64748b", letterSpacing: "0.1em" }}>NEWS SHARE</div>
            <div style={{ width: 64, height: 4, borderRadius: 999, background: "#0a84ff" }} />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 158,
                height: 158,
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.24)",
                background:
                  "radial-gradient(circle at 35% 35%, rgba(10,132,255,0.18), transparent 46%), linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
              }}
            />
            <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>整木资讯</div>
            <div style={{ fontSize: 22, color: "#475569", textAlign: "center", lineHeight: 1.4 }}>
              分享来自整木网的行业内容与趋势观察
            </div>
          </div>

          <div style={{ fontSize: 20, color: "#64748b" }}>cnzhengmu.com</div>
        </div>
      </div>
    ),
    size,
  );
}
