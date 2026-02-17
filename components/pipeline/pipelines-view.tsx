"use client";

import { T } from "@/lib/pipeline/theme";
import { PIPELINES } from "@/lib/pipeline/data";
import { PipelineIcons } from "@/components/pipeline/pipeline-icons";

interface PipelinesViewProps {
  onOpenEditor: (wsId: string) => void;
}

export function PipelinesView({ onOpenEditor }: PipelinesViewProps) {
  return (
    <div style={{ animation: "pipeline-fadeIn 0.25s ease" }}>
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 4px",
            letterSpacing: "-0.02em",
            color: T.text,
          }}
        >
          Pipelines
        </h1>
        <p style={{ fontSize: 13, color: T.textDim, margin: 0 }}>
          {PIPELINES.length} deployed transforms
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PIPELINES.map((pl) => (
          <div
            key={pl.id}
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: T.card,
              border: `1px solid ${T.cardBorder}`,
              cursor: pl.wsId ? "pointer" : "default",
            }}
            onClick={() => pl.wsId && onOpenEditor(pl.wsId)}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    display: "flex",
                    color:
                      pl.lastStatus === "success" ? T.green : T.red,
                  }}
                >
                  {pl.lastStatus === "success"
                    ? PipelineIcons.check
                    : PipelineIcons.alert}
                </span>
                <span
                  style={{ fontSize: 14, fontWeight: 650, color: T.text }}
                >
                  {pl.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 10,
                  background:
                    pl.lastStatus === "success" ? T.greenSoft : T.redSoft,
                  color:
                    pl.lastStatus === "success" ? T.green : T.red,
                  fontWeight: 600,
                }}
              >
                {pl.lastStatus}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                fontSize: 12,
                color: T.textDim,
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {PipelineIcons.clock} {pl.schedule}
              </span>
              <span>Last: {pl.lastRun}</span>
              <span>{pl.rows.toLocaleString()} rows</span>
              <span>Fresh: {pl.freshness}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
