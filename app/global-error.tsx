"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fafafa" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#292612" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginTop: "8px", fontSize: "14px" }}>
            We have been notified and are looking into it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "12px 24px",
              background: "#292612",
              color: "#d6eae1",
              border: "none",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
