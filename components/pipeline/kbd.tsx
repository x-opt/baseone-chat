import type { ReactNode } from "react";
import { T } from "@/lib/pipeline/theme";

export function Kbd({
  children,
  light,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 20,
        padding: "0 5px",
        borderRadius: 4,
        fontSize: 10.5,
        fontWeight: 600,
        fontFamily: T.mono,
        lineHeight: 1,
        background: light
          ? "rgba(255,255,255,0.15)"
          : "rgba(148,163,184,0.1)",
        border: `1px solid ${light ? "rgba(255,255,255,0.2)" : "rgba(148,163,184,0.2)"}`,
        color: light ? "#fff" : T.textDim,
      }}
    >
      {children}
    </kbd>
  );
}
