"use client";

import { T } from "@/lib/pipeline/theme";
import { PHASES } from "@/lib/pipeline/data";
import type { PhaseStatus } from "@/lib/pipeline/types";

export function PhaseBar({
  phaseIndex,
  phaseStatus,
}: {
  phaseIndex: number;
  phaseStatus: PhaseStatus;
}) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {PHASES.map((p, i) => {
        let bg = T.border;
        if (i < phaseIndex) {
          bg = T.green;
        } else if (i === phaseIndex && phaseStatus === "working") {
          bg = T.accent;
        } else if (i === phaseIndex && phaseStatus === "awaiting_input") {
          bg = T.amber;
        } else if (i === phaseIndex && phaseStatus === "revising") {
          bg = T.purple;
        } else if (i === phaseIndex && phaseStatus === "complete") {
          bg = T.green;
        }
        return (
          <div
            key={p.key}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: bg,
              transition: "background 0.3s",
            }}
          />
        );
      })}
    </div>
  );
}
