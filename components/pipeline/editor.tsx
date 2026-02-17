"use client";

import { useState, useRef, useEffect } from "react";
import { T } from "@/lib/pipeline/theme";
import { SCRATCH_RESULTS } from "@/lib/pipeline/data";
import { PipelineIcons } from "@/components/pipeline/pipeline-icons";
import { Kbd } from "@/components/pipeline/kbd";
import type { Workstream, PipelineFile, QueryResult, AgentMessage } from "@/lib/pipeline/types";

interface EditorProps {
  ws: Workstream;
  onBack: () => void;
  backLabel?: string;
}

export function Editor({ ws, onBack, backLabel }: EditorProps) {
  const [activeFile, setActiveFile] = useState(
    ws?.files?.find((f) => f.active)?.name ?? ws?.files?.[0]?.name ?? null,
  );
  const [files, setFiles] = useState<PipelineFile[]>(ws?.files ?? []);
  const [scratchCounter, setScratchCounter] = useState(1);
  const [editorContent, setEditorContent] = useState<Record<string, string>>(
    {},
  );
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentTyping, setAgentTyping] = useState(false);
  const agentRef = useRef<HTMLDivElement>(null);

  const currentFile = files.find((f) => f.name === activeFile);
  const currentContent =
    activeFile !== null && editorContent[activeFile] !== undefined
      ? editorContent[activeFile]
      : (currentFile?.content ?? "");

  function handleContentChange(val: string) {
    if (activeFile) {
      setEditorContent((prev) => ({ ...prev, [activeFile]: val }));
    }
  }

  function newScratchQuery() {
    const name = `scratch_${scratchCounter}.sql`;
    setScratchCounter((p) => p + 1);
    const newFile: PipelineFile = {
      name,
      type: "sql",
      content: `-- Scratch query\n-- Run with ⌘↵\n\nSELECT *\nFROM stripe_payments.transactions\nLIMIT 10;`,
    };
    setFiles((p) => [...p, newFile]);
    setActiveFile(name);
    setQueryResult(null);
  }

  function runQuery() {
    setIsRunning(true);
    setQueryResult(null);
    setTimeout(() => {
      setIsRunning(false);
      setQueryResult(SCRATCH_RESULTS);
    }, 800);
  }

  function sendAgentMessage() {
    if (!agentInput.trim()) return;
    const userMsg = agentInput.trim();
    setAgentInput("");
    setAgentMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setAgentTyping(true);

    setTimeout(() => {
      let response = "";
      const lower = userMsg.toLowerCase();
      if (lower.includes("currency") || lower.includes("currencies")) {
        response =
          "Looking at the data, there are 12 distinct currencies with USD accounting for 73% of transactions. The `fx_rates.daily_close` table has good coverage — only 3 gaps in the last year (holidays). I'd recommend the `usd_amount` column approach so you preserve the original for audit purposes. Want me to add a `fx_rate_used` column too for traceability?";
      } else if (lower.includes("null") || lower.includes("missing")) {
        response =
          "The main null concerns are:\n\n• `customer_id`: 2.1% null (guest checkouts) — handled with `guest_` prefix\n• `metadata`: 34.2% null — using COALESCE for order_id extraction\n• `receipt_email`: 18.4% null — this column is excluded anyway (PII)\n\nThe metadata nulls are the riskiest. Want me to add a `has_attribution` boolean flag so downstream consumers know when order_id came from metadata vs was imputed?";
      } else if (lower.includes("refund") || lower.includes("revenue")) {
        response =
          "The 12 refunded orders are correctly excluded from `revenue_recognized = true`. The logic maps `financial_status` like this:\n\n• `paid`, `partially_refunded` → true\n• `refunded`, `voided`, `pending` → false\n\nPartial refunds keep `revenue_recognized = true` at the order level but the refunded line items get marked false individually. This matches ASC 606 treatment. Should I add a `refund_amount` column to capture the partial amounts?";
      } else {
        response =
          "I see what you're looking at. Based on the current transformation, the data looks clean — 142,837 source rows should yield approximately 138,204 after filtering non-succeeded transactions. The main edge cases I've handled are guest checkouts (847 rows), zero-amount free trials (3 rows), and multi-currency normalization. What specific aspect would you like me to dig into?";
      }
      setAgentTyping(false);
      setAgentMessages((prev) => [...prev, { role: "agent", text: response }]);
      setTimeout(() => {
        agentRef.current?.scrollTo({
          top: agentRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
    }, 1500);
  }

  const lines = currentContent.split("\n");
  const lineCount = lines.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px)",
        background: T.bg,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: `1px solid ${T.border}`,
          background: T.surface,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "none",
              color: T.textDim,
              cursor: "pointer",
              fontFamily: T.font,
              fontSize: 12,
              padding: "4px 0",
            }}
          >
            {PipelineIcons.back} {backLabel ?? "Back"}
          </button>
          <div style={{ width: 1, height: 16, background: T.border }} />
          <span style={{ fontSize: 13, fontWeight: 650, color: T.text }}>
            {ws?.title ?? "Editor"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={newScratchQuery}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.textMuted,
              cursor: "pointer",
              fontFamily: T.font,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {PipelineIcons.plus} Scratch Query
          </button>
          <button
            onClick={runQuery}
            disabled={isRunning}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: T.green,
              color: "#fff",
              cursor: "pointer",
              fontFamily: T.font,
              fontSize: 12,
              fontWeight: 600,
              opacity: isRunning ? 0.7 : 1,
            }}
          >
            <span
              style={
                isRunning
                  ? {
                      animation: "pipeline-spin 1s linear infinite",
                      display: "inline-flex",
                    }
                  : { display: "inline-flex" }
              }
            >
              {isRunning ? PipelineIcons.spinner : PipelineIcons.play}
            </span>
            {isRunning ? "Running..." : "Run"} <Kbd light>⌘↵</Kbd>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* File tree */}
        <div
          style={{
            width: 200,
            borderRight: `1px solid ${T.border}`,
            background: T.surface,
            overflowY: "auto",
            flexShrink: 0,
            padding: "8px 0",
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              fontSize: 10,
              fontWeight: 600,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Files
          </div>
          {files.map((f) => (
            <button
              key={f.name}
              onClick={() => {
                setActiveFile(f.name);
                setQueryResult(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "6px 12px",
                border: "none",
                cursor: "pointer",
                fontFamily: T.mono,
                fontSize: 12,
                background:
                  activeFile === f.name ? T.accentSoft : "transparent",
                color: activeFile === f.name ? T.accent : T.textMuted,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  display: "flex",
                  color:
                    f.type === "sql"
                      ? T.accent
                      : f.type === "python"
                        ? T.amber
                        : T.textDim,
                }}
              >
                {PipelineIcons.file}
              </span>
              {f.name}
            </button>
          ))}
          <div
            style={{ borderTop: `1px solid ${T.border}`, margin: "8px 0" }}
          />
          <button
            onClick={newScratchQuery}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              padding: "6px 12px",
              border: "none",
              cursor: "pointer",
              fontFamily: T.font,
              fontSize: 12,
              background: "transparent",
              color: T.textDim,
              textAlign: "left",
            }}
          >
            <span style={{ display: "flex", color: T.textDim }}>
              {PipelineIcons.plus}
            </span>
            New scratch query
          </button>
        </div>

        {/* Code + Results */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Code editor */}
          <div
            style={{
              flex: queryResult ? "0 0 50%" : 1,
              overflow: "hidden",
              display: "flex",
              borderBottom: queryResult ? `1px solid ${T.border}` : "none",
            }}
          >
            {/* Line numbers */}
            <div
              style={{
                width: 48,
                flexShrink: 0,
                background: T.surface,
                borderRight: `1px solid ${T.border}`,
                overflowY: "hidden",
                paddingTop: 14,
              }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: 21,
                    lineHeight: "21px",
                    textAlign: "right",
                    paddingRight: 12,
                    fontSize: 12,
                    fontFamily: T.mono,
                    color: T.textDim,
                    userSelect: "none",
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Code area */}
            <div
              style={{ flex: 1, overflow: "auto", position: "relative" }}
            >
              <textarea
                value={currentContent}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: lineCount * 21 + 28,
                  padding: "14px 16px",
                  fontFamily: T.mono,
                  fontSize: 12.5,
                  lineHeight: "21px",
                  color: T.text,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  whiteSpace: "pre",
                  overflowWrap: "normal",
                  tabSize: 4,
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    runQuery();
                  }
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const s = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const val =
                      currentContent.substring(0, s) +
                      "    " +
                      currentContent.substring(end);
                    handleContentChange(val);
                    setTimeout(() => {
                      e.currentTarget.selectionStart =
                        e.currentTarget.selectionEnd = s + 4;
                    }, 0);
                  }
                }}
              />
            </div>
          </div>

          {/* Query results */}
          {(queryResult || isRunning) && (
            <div
              style={{
                flex: "0 0 50%",
                overflow: "auto",
                background: T.surface,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 600, color: T.text }}
                  >
                    Results
                  </span>
                  {queryResult && (
                    <span style={{ fontSize: 11, color: T.textDim }}>
                      {queryResult.rowCount.toLocaleString()} total rows ·{" "}
                      {queryResult.elapsed}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setQueryResult(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: T.textDim,
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  {PipelineIcons.x}
                </button>
              </div>
              {isRunning ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                    color: T.textDim,
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      animation: "pipeline-spin 1s linear infinite",
                      display: "inline-flex",
                    }}
                  >
                    {PipelineIcons.spinner}
                  </span>{" "}
                  Running query...
                </div>
              ) : (
                queryResult && (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12,
                      }}
                    >
                      <thead>
                        <tr style={{ background: T.bg }}>
                          {queryResult.columns.map((c) => (
                            <th
                              key={c}
                              style={{
                                padding: "7px 12px",
                                textAlign: "left",
                                color: T.textDim,
                                fontWeight: 500,
                                fontSize: 10.5,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                whiteSpace: "nowrap",
                                borderBottom: `1px solid ${T.border}`,
                                fontFamily: T.mono,
                              }}
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, ri) => (
                          <tr
                            key={ri}
                            style={{
                              borderBottom: `1px solid ${T.border}08`,
                            }}
                          >
                            {row.map((v, vi) => (
                              <td
                                key={vi}
                                style={{
                                  padding: "6px 12px",
                                  fontFamily: T.mono,
                                  fontSize: 12,
                                  whiteSpace: "nowrap",
                                  color:
                                    typeof v === "number"
                                      ? T.accent
                                      : T.textMuted,
                                }}
                              >
                                {typeof v === "number"
                                  ? v.toLocaleString()
                                  : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div
                      style={{
                        padding: "8px 14px",
                        fontSize: 11,
                        color: T.textDim,
                        borderTop: `1px solid ${T.border}`,
                      }}
                    >
                      Showing {queryResult.rows.length} of{" "}
                      {queryResult.rowCount.toLocaleString()} rows
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Agent sidebar */}
        <div
          style={{
            width: 320,
            borderLeft: `1px solid ${T.border}`,
            background: T.surface,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "flex", color: T.accent }}>
              {PipelineIcons.bot}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
              Agent
            </span>
            <span
              style={{ fontSize: 11, color: T.green, marginLeft: "auto" }}
            >
              ● Online
            </span>
          </div>

          {/* Messages */}
          <div
            ref={agentRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(59,130,246,0.06)",
                border: `1px solid rgba(59,130,246,0.1)`,
                fontSize: 12,
                color: T.textMuted,
                lineHeight: 1.6,
              }}
            >
              I&apos;m working on{" "}
              <span style={{ color: T.accent, fontWeight: 600 }}>
                {ws?.title ?? "this transformation"}
              </span>
              . Ask me about the data, request changes to the code, or get
              help investigating issues.
            </div>

            {agentMessages.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  maxWidth: "95%",
                  ...(m.role === "user"
                    ? {
                        background: T.accent,
                        color: "#fff",
                        alignSelf: "flex-end",
                        borderBottomRightRadius: 3,
                      }
                    : {
                        background: T.bg,
                        border: `1px solid ${T.border}`,
                        color: T.text,
                        alignSelf: "flex-start",
                        borderBottomLeftRadius: 3,
                      }),
                }}
              >
                {m.text.split("\n").map((line, li) => (
                  <div key={li} style={{ marginTop: li > 0 ? 4 : 0 }}>
                    {line}
                  </div>
                ))}
              </div>
            ))}

            {agentTyping && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  alignSelf: "flex-start",
                  fontSize: 12,
                  color: T.textDim,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    animation: "pipeline-spin 1s linear infinite",
                    display: "inline-flex",
                  }}
                >
                  {PipelineIcons.spinner}
                </span>{" "}
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{ padding: 12, borderTop: `1px solid ${T.border}` }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAgentMessage();
                  }
                }}
                placeholder="Ask the agent..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.bg,
                  color: T.text,
                  fontFamily: T.font,
                  fontSize: 12.5,
                  outline: "none",
                }}
              />
              <button
                onClick={sendAgentMessage}
                disabled={!agentInput.trim()}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: agentInput.trim() ? T.accent : T.border,
                  color: "#fff",
                  cursor: agentInput.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {PipelineIcons.send}
              </button>
            </div>
            <div
              style={{
                fontSize: 10,
                color: T.textDim,
                marginTop: 6,
                display: "flex",
                gap: 12,
              }}
            >
              <span>
                <Kbd>↵</Kbd> Send
              </span>
              <span>
                <Kbd>⌘↵</Kbd> Run query
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
