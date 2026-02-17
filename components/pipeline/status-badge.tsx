"use client";

import type { ReactNode } from "react";
import { T } from "@/lib/pipeline/theme";
import { PHASES } from "@/lib/pipeline/data";
import { PipelineIcons } from "@/components/pipeline/pipeline-icons";
import type { PhaseStatus } from "@/lib/pipeline/types";

export function StatusBadge({
  phaseIndex,
  phaseStatus,
}: {
  phaseIndex: number;
  phaseStatus: PhaseStatus;
}) {
  const p = PHASES[phaseIndex];
  let c: string;
  let bg: string;
  let icon: ReactNode;
  let label: string;

  if (phaseStatus === "complete" && phaseIndex === 5) {
    c = T.green;
    bg = T.greenSoft;
    icon = PipelineIcons.check;
    label = "Complete";
  } else if (phaseStatus === "revising") {
    c = T.purple;
    bg = T.purpleSoft;
    icon = PipelineIcons.edit;
    label = "Revising";
  } else if (phaseStatus === "working") {
    c = T.accent;
    bg = T.accentSoft;
    icon = PipelineIcons.spinner;
    label = `${p.short} in progress`;
  } else if (phaseStatus === "awaiting_input") {
    c = T.amber;
    bg = T.amberSoft;
    icon = PipelineIcons.alert;
    label = "Needs input";
  } else {
    c = T.textDim;
    bg = "transparent";
    icon = PipelineIcons.clock;
    label = p.short;
  }

  const isAnimated =
    phaseStatus === "working" || phaseStatus === "revising";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        fontWeight: 550,
        color: c,
        background: bg,
        padding: "3px 10px",
        borderRadius: 20,
      }}
    >
      <span
        style={
          isAnimated
            ? { animation: "pipeline-spin 1s linear infinite", display: "inline-flex" }
            : { display: "inline-flex" }
        }
      >
        {icon}
      </span>
      {label}
    </span>
  );
}
