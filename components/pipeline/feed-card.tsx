"use client";

import { T } from "@/lib/pipeline/theme";
import { PipelineIcons } from "@/components/pipeline/pipeline-icons";
import { Kbd } from "@/components/pipeline/kbd";
import type { FeedItem } from "@/lib/pipeline/types";

interface FeedCardProps {
  item: FeedItem;
  focused: boolean;
  onApprove: (id: string) => void;
  onApproveNote: (id: string) => void;
  onReject: (id: string) => void;
  onNavigate: (wsId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  schema_approval: T.accent,
  validation_approval: T.amber,
  pii_detection: T.red,
  verification_complete: T.green,
  context_question: T.purple,
};

export function FeedCard({
  item,
  focused,
  onApprove,
  onApproveNote,
  onReject,
  onNavigate,
}: FeedCardProps) {
  if (item.resolved) {
    return (
      <div
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          background: T.surface,
          border: `1px solid ${T.border}`,
          opacity: 0.4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: T.green, display: "flex" }}>
            {PipelineIcons.check}
          </span>
          <span
            style={{
              fontSize: 13,
              color: T.textMuted,
              textDecoration: "line-through",
            }}
          >
            {item.title}
          </span>
          <span
            style={{
              fontSize: 11,
              color: T.textDim,
              marginLeft: "auto",
            }}
          >
            Resolved
          </span>
        </div>
      </div>
    );
  }

  const isAction =
    item.type === "schema_approval" || item.type === "validation_approval";
  const borderColor = TYPE_COLORS[item.type] || T.textDim;

  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 12,
        background: T.card,
        border: `1px solid ${focused ? T.focus : T.cardBorder}`,
        borderLeft: `3px solid ${borderColor}`,
        boxShadow: focused
          ? `0 0 0 1px ${T.focus}, 0 0 20px ${T.accentGlow}`
          : "none",
        transition: "all 0.15s",
        cursor: "pointer",
      }}
      onClick={() => onNavigate(item.workstreamId)}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            {item.critical && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: T.amberSoft,
                  color: T.amber,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Blocking
              </span>
            )}
            {item.autoProceeds && !item.critical && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(148,163,184,0.08)",
                  color: T.textDim,
                }}
              >
                Auto-proceeds
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 650,
              color: T.text,
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            color: T.textDim,
            whiteSpace: "nowrap",
            marginLeft: 12,
          }}
        >
          {item.timestamp}
        </span>
      </div>

      <div
        style={{
          fontSize: 11,
          color: T.accent,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {PipelineIcons.db} {item.wsTitle}
      </div>

      <p
        style={{
          fontSize: 13,
          color: T.textMuted,
          lineHeight: 1.5,
          margin: "0 0 10px",
        }}
      >
        {item.description}
      </p>

      {item.autoTimer && (
        <div
          style={{
            fontSize: 11,
            color: T.textDim,
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 10,
            fontStyle: "italic",
          }}
        >
          {PipelineIcons.clock} {item.autoTimer}
        </div>
      )}

      {item.options && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {item.options.map((opt, i) => (
            <button
              key={opt}
              onClick={(e) => {
                e.stopPropagation();
                onApprove(item.id);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: T.font,
                fontSize: 12,
                fontWeight: 550,
                background: "transparent",
                color: T.textMuted,
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {opt} {focused && <Kbd>{i === 0 ? "[" : "]"}</Kbd>}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(isAction ||
          item.type === "verification_complete" ||
          item.type === "pii_detection") && (
          <>
            <button
              onClick={() => onApprove(item.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: T.green,
                color: "#fff",
                fontWeight: 600,
                fontSize: 12,
                fontFamily: T.font,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {PipelineIcons.check}{" "}
              {isAction
                ? "Approve"
                : item.type === "verification_complete"
                  ? "Reviewed"
                  : "Ack"}{" "}
              {focused && <Kbd light>A</Kbd>}
            </button>
            <button
              onClick={() => onApproveNote(item.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.textMuted,
                fontWeight: 500,
                fontSize: 12,
                fontFamily: T.font,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              + Note {focused && <Kbd>⇧A</Kbd>}
            </button>
          </>
        )}
        {isAction && (
          <button
            onClick={() => onReject(item.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              background: T.redSoft,
              border: `1px solid rgba(239,68,68,0.3)`,
              color: T.red,
              fontWeight: 600,
              fontSize: 12,
              fontFamily: T.font,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {PipelineIcons.x} Changes {focused && <Kbd>R</Kbd>}
          </button>
        )}
      </div>
    </div>
  );
}
