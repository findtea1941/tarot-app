"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "system-ui,sans-serif", padding: "2rem", background: "#fff" }}>
        <div style={{ maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.25rem", color: "#1e293b", marginBottom: "0.5rem" }}>出错了</h2>
          <p style={{ color: "#64748b", marginBottom: "1rem" }}>
            {error?.message || "页面加载时发生错误"}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              background: "#059669",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
