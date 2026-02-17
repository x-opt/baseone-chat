"use client";

import { T } from "@/lib/pipeline/theme";
import { PipelineIcons } from "@/components/pipeline/pipeline-icons";
import { Kbd } from "@/components/pipeline/kbd";
import type { Workstream } from "@/lib/pipeline/types";

interface ActionButtonsProps {
  onApprove: (withNote: boolean) => void;
  onReject: () => void;
  label?: string;
}

export function ActionButtons({
  onApprove,
  onReject,
  label,
}: ActionButtonsProps) {
  return (
    <div
      style={{
        marginTop: 18,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => onApprove(false)}
        style={{
          padding: "8px 18px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: T.green,
          color: "#fff",
          fontWeight: 600,
          fontSize: 13,
          fontFamily: T.font,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {PipelineIcons.check} {label || "Approve"} <Kbd light>A</Kbd>
      </button>
      <button
        onClick={() => onApprove(true)}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          cursor: "pointer",
          background: "transparent",
          color: T.textMuted,
          fontWeight: 500,
          fontSize: 13,
          fontFamily: T.font,
        }}
      >
        With note <Kbd>⇧A</Kbd>
      </button>
      <button
        onClick={onReject}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: `1px solid rgba(239,68,68,0.3)`,
          cursor: "pointer",
          background: T.redSoft,
          color: T.red,
          fontWeight: 600,
          fontSize: 13,
          fontFamily: T.font,
        }}
      >
        Request Changes <Kbd>R</Kbd>
      </button>
    </div>
  );
}

interface OverviewContentProps {
  ws: Workstream;
  onApprove?: (withNote: boolean) => void;
  onReject?: () => void;
}

export function OverviewContent({
  ws,
  onApprove,
  onReject,
}: OverviewContentProps) {
  if (ws.profiling) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            Source Columns
          </span>
          <div
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 100,
                height: 4,
                borderRadius: 2,
                background: T.border,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${ws.profiling.progress}%`,
                  height: "100%",
                  background: T.accent,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: T.textMuted }}>
              {ws.profiling.progress}%
            </span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Column", "Type", "Category", "Nulls", "Sample"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "7px 10px",
                        textAlign: "left",
                        color: T.textDim,
                        fontWeight: 500,
                        fontSize: 10.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {ws.profiling.columns.map((c, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: `1px solid ${T.border}08` }}
                >
                  <td
                    style={{
                      padding: "6px 10px",
                      fontFamily: T.mono,
                      color: T.text,
                      fontWeight: 500,
                      fontSize: 12,
                    }}
                  >
                    {c.name}
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      fontFamily: T.mono,
                      color: T.textMuted,
                      fontSize: 11,
                    }}
                  >
                    {c.type}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 10,
                        background: c.category.startsWith("PII")
                          ? T.redSoft
                          : c.category === "Categorical"
                            ? T.accentSoft
                            : "rgba(148,163,184,0.1)",
                        color: c.category.startsWith("PII")
                          ? T.red
                          : c.category === "Categorical"
                            ? T.accent
                            : T.textMuted,
                      }}
                    >
                      {c.category}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      color: c.nullPct > 30 ? T.amber : T.textMuted,
                    }}
                  >
                    {c.nullPct}%
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      fontFamily: T.mono,
                      color: T.textDim,
                      fontSize: 11,
                    }}
                  >
                    {c.sample}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {ws.profiling.findings.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 8,
                background: f.severity === "high" ? T.redSoft : T.amberSoft,
              }}
            >
              <span
                style={{
                  color: f.severity === "high" ? T.red : T.amber,
                  marginTop: 1,
                }}
              >
                {PipelineIcons.alert}
              </span>
              <span
                style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}
              >
                {f.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (ws.schema) {
    return (
      <div>
        <div
          style={{
            fontSize: 12,
            color: T.textMuted,
            lineHeight: 1.5,
            marginBottom: 12,
            padding: "10px 14px",
            background: "rgba(59,130,246,0.05)",
            borderRadius: 8,
            border: `1px solid rgba(59,130,246,0.1)`,
          }}
        >
          {ws.schema.reasoning}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Column", "Type", "Null", "Description"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "7px 10px",
                      textAlign: "left",
                      color: T.textDim,
                      fontWeight: 500,
                      fontSize: 10.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.schema.proposed.map((c, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: `1px solid ${T.border}08` }}
                >
                  <td
                    style={{
                      padding: "6px 10px",
                      fontFamily: T.mono,
                      color: T.text,
                      fontWeight: 500,
                    }}
                  >
                    {c.name}
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      fontFamily: T.mono,
                      color: T.accent,
                      fontSize: 11,
                    }}
                  >
                    {c.type}
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      fontSize: 10.5,
                      color: c.nullable ? T.textDim : T.amber,
                    }}
                  >
                    {c.nullable ? "yes" : "NOT NULL"}
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      color: T.textMuted,
                      maxWidth: 280,
                    }}
                  >
                    {c.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {onApprove && onReject && (
          <ActionButtons
            onApprove={onApprove}
            onReject={onReject}
            label="Approve Schema"
          />
        )}
      </div>
    );
  }

  if (ws.validation) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 14,
          }}
        >
          {ws.validation.checks.map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 12px",
                borderRadius: 8,
                background:
                  c.status === "pass" ? T.greenSoft : T.amberSoft,
              }}
            >
              <span
                style={{
                  color: c.status === "pass" ? T.green : T.amber,
                  display: "flex",
                }}
              >
                {c.status === "pass"
                  ? PipelineIcons.check
                  : PipelineIcons.alert}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: T.text,
                  minWidth: 120,
                }}
              >
                {c.label}
              </span>
              <span style={{ fontSize: 12, color: T.textMuted }}>
                {c.detail}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            overflowX: "auto",
            borderRadius: 8,
            border: `1px solid ${T.border}`,
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
          >
            <thead>
              <tr style={{ background: T.surface }}>
                {Object.keys(ws.validation.sample[0]).map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      color: T.textDim,
                      fontWeight: 500,
                      fontSize: 10,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      borderBottom: `1px solid ${T.border}`,
                      fontFamily: T.mono,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.validation.sample.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v, j) => (
                    <td
                      key={j}
                      style={{
                        padding: "5px 8px",
                        fontFamily: T.mono,
                        fontSize: 11,
                        whiteSpace: "nowrap",
                        color:
                          typeof v === "boolean"
                            ? v
                              ? T.green
                              : T.amber
                            : typeof v === "number"
                              ? T.accent
                              : T.textMuted,
                      }}
                    >
                      {typeof v === "boolean"
                        ? v
                          ? "true"
                          : "false"
                        : String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {onApprove && onReject && (
          <ActionButtons
            onApprove={onApprove}
            onReject={onReject}
            label="Approve — Run Full Transform"
          />
        )}
      </div>
    );
  }

  if (ws.verification) {
    return (
      <div>
        {ws.verification.queries.map((q, i) => (
          <div
            key={i}
            style={{
              marginBottom: 8,
              padding: "10px 14px",
              borderRadius: 8,
              background: T.bg,
              border: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <span style={{ color: T.green, display: "flex" }}>
                {PipelineIcons.check}
              </span>
              <span
                style={{ fontSize: 13, fontWeight: 600, color: T.text }}
              >
                {q.title}
              </span>
            </div>
            <pre
              style={{
                fontFamily: T.mono,
                fontSize: 11,
                color: T.textDim,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {q.sql}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{ color: T.textDim, padding: 20, textAlign: "center" }}
    >
      Processing...
    </div>
  );
}
