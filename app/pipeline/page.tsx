"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/pipeline/theme";
import { PHASES, INIT_WORKSTREAMS, INIT_FEED, PIPELINES } from "@/lib/pipeline/data";
import type { FeedItem, ModalState, Workstream } from "@/lib/pipeline/types";
import { PipelineIcons } from "@/components/pipeline/pipeline-icons";
import { Kbd } from "@/components/pipeline/kbd";
import { PhaseBar } from "@/components/pipeline/phase-bar";
import { StatusBadge } from "@/components/pipeline/status-badge";
import { Modal } from "@/components/pipeline/modal";
import { FeedCard } from "@/components/pipeline/feed-card";
import { Editor } from "@/components/pipeline/editor";
import { OverviewContent } from "@/components/pipeline/overview-content";
import { PipelinesView } from "@/components/pipeline/pipelines-view";

type View = "feed" | "workstreams" | "pipelines" | "detail" | "editor";

const CSS = `
@keyframes pipeline-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes pipeline-fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pipeline-slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
* { box-sizing: border-box; }
`;

export default function PipelinePage() {
  const [view, setView] = useState<View>("feed");
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [prevView, setPrevView] = useState<View>("feed");
  const [focusIdx, setFocusIdx] = useState(0);
  const [feed, setFeed] = useState<FeedItem[]>(INIT_FEED);
  const [workstreams, setWorkstreams] = useState<Workstream[]>(INIT_WORKSTREAMS);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const showToast = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const sortedFeed = [...feed].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    return 0;
  });
  const unresolvedFeed = sortedFeed.filter((f) => !f.resolved);
  const unresolvedCount = feed.filter((f) => !f.resolved).length;
  const criticalCount = feed.filter((f) => !f.resolved && f.critical).length;

  function doApprove(feedId: string) {
    setFeed((p) => p.map((f) => (f.id === feedId ? { ...f, resolved: true } : f)));
    const item = feed.find((f) => f.id === feedId);
    if (item?.type === "schema_approval") {
      setWorkstreams((p) =>
        p.map((w) =>
          w.id === item.workstreamId
            ? { ...w, phaseIndex: 2, phaseStatus: "working" }
            : w,
        ),
      );
      showToast("Schema approved — planning transformation");
    } else if (item?.type === "validation_approval") {
      setWorkstreams((p) =>
        p.map((w) =>
          w.id === item.workstreamId
            ? { ...w, phaseIndex: 4, phaseStatus: "working" }
            : w,
        ),
      );
      showToast("Approved — running full transform");
    } else if (item?.type === "verification_complete") {
      showToast("Verification reviewed");
    } else if (item?.type === "pii_detection") {
      showToast("Acknowledged — PII excluded");
    } else {
      showToast("Proceeding with your preference");
    }
  }

  function doReject(feedId: string) {
    const item = feed.find((f) => f.id === feedId);
    setModal({
      title: "Request Changes",
      required: true,
      submitLabel: "Send Feedback",
      submitColor: T.red,
      onSubmit: () => {
        setFeed((p) =>
          p.map((f) => (f.id === feedId ? { ...f, resolved: true } : f)),
        );
        if (item) {
          setWorkstreams((p) =>
            p.map((w) =>
              w.id === item.workstreamId
                ? { ...w, phaseStatus: "revising" }
                : w,
            ),
          );
        }
        showToast("Changes requested — agent revising");
        setModal(null);
      },
    });
  }

  function doApproveNote(feedId: string) {
    setModal({
      title: "Approve with note",
      required: false,
      submitLabel: "Approve",
      submitColor: T.green,
      onSubmit: () => {
        doApprove(feedId);
        setModal(null);
      },
    });
  }

  function navTo(wsId: string, from?: View) {
    setPrevView(from ?? view);
    setSelectedWs(wsId);
    setView("detail");
    setFocusIdx(0);
  }

  function openEditor(wsId: string) {
    setPrevView(view);
    setSelectedWs(wsId);
    setView("editor");
  }

  function goBack() {
    setView(prevView);
    setSelectedWs(null);
    setFocusIdx(0);
  }

  function detailApprove(withNote: boolean) {
    const ws = workstreams.find((w) => w.id === selectedWs);
    if (!ws) return;
    if (withNote) {
      setModal({
        title: "Approve with note",
        required: false,
        submitLabel: "Approve",
        submitColor: T.green,
        onSubmit: () => {
          doDetailAction(ws);
          setModal(null);
        },
      });
    } else {
      doDetailAction(ws);
    }
  }

  function detailReject() {
    const ws = workstreams.find((w) => w.id === selectedWs);
    if (!ws) return;
    setModal({
      title: "Request Changes",
      required: true,
      submitLabel: "Send Feedback",
      submitColor: T.red,
      onSubmit: () => {
        setWorkstreams((p) =>
          p.map((w) =>
            w.id === ws.id ? { ...w, phaseStatus: "revising" } : w,
          ),
        );
        setFeed((p) =>
          p.map((f) =>
            f.workstreamId === ws.id && !f.resolved
              ? { ...f, resolved: true }
              : f,
          ),
        );
        showToast("Changes requested — agent revising");
        setModal(null);
      },
    });
  }

  function doDetailAction(ws: Workstream) {
    if (ws.schema) {
      setWorkstreams((p) =>
        p.map((w) =>
          w.id === ws.id ? { ...w, phaseIndex: 2, phaseStatus: "working" } : w,
        ),
      );
      setFeed((p) =>
        p.map((f) =>
          f.workstreamId === ws.id && f.type === "schema_approval"
            ? { ...f, resolved: true }
            : f,
        ),
      );
      showToast("Schema approved");
    } else if (ws.validation) {
      setWorkstreams((p) =>
        p.map((w) =>
          w.id === ws.id ? { ...w, phaseIndex: 4, phaseStatus: "working" } : w,
        ),
      );
      setFeed((p) =>
        p.map((f) =>
          f.workstreamId === ws.id && f.type === "validation_approval"
            ? { ...f, resolved: true }
            : f,
        ),
      );
      showToast("Approved — running full transform");
    }
  }

  const currentWs = workstreams.find((w) => w.id === selectedWs);

  // Keyboard navigation
  useEffect(() => {
    if (modal || view === "editor") return;
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const k = e.key;

      if (k === "1") { e.preventDefault(); setView("feed"); setSelectedWs(null); setFocusIdx(0); return; }
      if (k === "2") { e.preventDefault(); setView("workstreams"); setSelectedWs(null); setFocusIdx(0); return; }
      if (k === "3") { e.preventDefault(); setView("pipelines"); setSelectedWs(null); setFocusIdx(0); return; }
      if (k === "Escape") { e.preventDefault(); if (view === "detail") goBack(); return; }

      if (view === "feed") {
        const mx = unresolvedFeed.length - 1;
        if (k === "j" || k === "ArrowDown") { e.preventDefault(); setFocusIdx((p) => Math.min(p + 1, mx)); }
        if (k === "k" || k === "ArrowUp") { e.preventDefault(); setFocusIdx((p) => Math.max(p - 1, 0)); }
        if (k === "Enter" && unresolvedFeed[focusIdx]) { e.preventDefault(); navTo(unresolvedFeed[focusIdx].workstreamId, "feed"); }
        if (k === "a" && !e.shiftKey && unresolvedFeed[focusIdx]) { e.preventDefault(); doApprove(unresolvedFeed[focusIdx].id); }
        if (k === "A" && e.shiftKey && unresolvedFeed[focusIdx]) { e.preventDefault(); doApproveNote(unresolvedFeed[focusIdx].id); }
        if (k === "r" && unresolvedFeed[focusIdx]) {
          const it = unresolvedFeed[focusIdx];
          if (it.type === "schema_approval" || it.type === "validation_approval") { e.preventDefault(); doReject(it.id); }
        }
      }

      if (view === "workstreams") {
        if (k === "j" || k === "ArrowDown") { e.preventDefault(); setFocusIdx((p) => Math.min(p + 1, workstreams.length - 1)); }
        if (k === "k" || k === "ArrowUp") { e.preventDefault(); setFocusIdx((p) => Math.max(p - 1, 0)); }
        if (k === "Enter") { e.preventDefault(); if (workstreams[focusIdx]) navTo(workstreams[focusIdx].id, "workstreams"); }
      }

      if (view === "detail") {
        const ws = workstreams.find((w) => w.id === selectedWs);
        if (k === "e") { e.preventDefault(); if (selectedWs) openEditor(selectedWs); }
        if (k === "a" && !e.shiftKey && ws && (ws.schema || ws.validation)) { e.preventDefault(); detailApprove(false); }
        if (k === "A" && e.shiftKey && ws && (ws.schema || ws.validation)) { e.preventDefault(); detailApprove(true); }
        if (k === "r" && ws && (ws.schema || ws.validation)) { e.preventDefault(); detailReject(); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  useEffect(() => {
    if (view === "feed") setFocusIdx((p) => Math.min(p, Math.max(unresolvedFeed.length - 1, 0)));
    if (view === "workstreams") setFocusIdx((p) => Math.min(p, Math.max(workstreams.length - 1, 0)));
  }, [view, unresolvedFeed.length, workstreams.length]);

  const hints: Record<string, [string, string][]> = {
    feed: [["J/K", "Navigate"], ["A", "Approve"], ["⇧A", "+ Note"], ["R", "Reject"], ["↵", "Open"], ["1", "Feed"], ["2", "Streams"], ["3", "Pipes"]],
    workstreams: [["J/K", "Navigate"], ["↵", "Open"], ["1", "Feed"], ["2", "Streams"], ["3", "Pipes"]],
    pipelines: [["1", "Feed"], ["2", "Streams"], ["3", "Pipes"]],
    detail: [["O", "Overview"], ["E", "Open Editor"], ["A", "Approve"], ["R", "Reject"], ["Esc", "Back"]],
  };

  // Full-screen editor
  if (view === "editor" && currentWs) {
    return (
      <div style={{ fontFamily: T.font, color: T.text }}>
        <style>{CSS}</style>
        <Editor
          ws={currentWs}
          onBack={goBack}
          backLabel={
            prevView === "feed"
              ? "Back to Feed"
              : prevView === "detail"
                ? "Back to Workstream"
                : "Back to Workstreams"
          }
        />
        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "10px 20px",
              borderRadius: 10,
              background: T.surface,
              border: `1px solid ${T.border}`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              fontSize: 13,
              fontWeight: 550,
              color: T.green,
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "pipeline-slideIn 0.3s ease",
              zIndex: 200,
              whiteSpace: "nowrap",
            }}
          >
            {PipelineIcons.check} {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: T.font,
        color: T.text,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{CSS}</style>

      {/* Header */}
      <header
        style={{
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${T.border}`,
          background: T.surface,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: `linear-gradient(135deg, ${T.accent}, #6366F1)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {PipelineIcons.shield}
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              baseone
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 8,
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
              fontSize: 11.5,
              color: T.green,
              fontWeight: 500,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Data never leaves your environment
          </div>
        </div>

        {/* Nav tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: T.bg,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {[
            {
              k: "feed" as View,
              label: "Feed",
              icon: PipelineIcons.feed,
              badge: unresolvedCount > 0 ? unresolvedCount : null,
              badgeColor: criticalCount > 0 ? T.amber : T.accent,
              hot: "1",
            },
            {
              k: "workstreams" as View,
              label: "Workstreams",
              icon: PipelineIcons.grid,
              badge: workstreams.length,
              badgeColor: null,
              hot: "2",
            },
            {
              k: "pipelines" as View,
              label: "Pipelines",
              icon: PipelineIcons.pipeline,
              badge: PIPELINES.length,
              badgeColor: null,
              hot: "3",
            },
          ].map((tab) => {
            const isActive =
              view === tab.k ||
              (view === "detail" && tab.k === "workstreams");
            return (
              <button
                key={tab.k}
                onClick={() => {
                  setView(tab.k);
                  setSelectedWs(null);
                  setFocusIdx(0);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font,
                  fontSize: 13,
                  fontWeight: 550,
                  background: isActive ? T.surface : "transparent",
                  color: isActive ? T.text : T.textDim,
                }}
              >
                {tab.icon} {tab.label}
                {tab.badge !== null && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background:
                        tab.badgeColor ?? "rgba(148,163,184,0.1)",
                      color: tab.badgeColor
                        ? tab.badgeColor === T.amber
                          ? "#000"
                          : "#fff"
                        : T.textDim,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
                <Kbd>{tab.hot}</Kbd>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: "24px 24px 72px",
          maxWidth: 960,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Feed view */}
        {view === "feed" && (
          <div style={{ animation: "pipeline-fadeIn 0.25s ease" }}>
            <div style={{ marginBottom: 18 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  margin: "0 0 4px",
                  letterSpacing: "-0.02em",
                }}
              >
                Feed
              </h1>
              <p style={{ fontSize: 13, color: T.textDim, margin: 0 }}>
                {criticalCount > 0
                  ? `${criticalCount} blocking item${criticalCount > 1 ? "s" : ""}`
                  : unresolvedCount > 0
                    ? `${unresolvedCount} items`
                    : "All caught up"}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortedFeed.map((item) => {
                const ui = unresolvedFeed.findIndex((f) => f.id === item.id);
                return (
                  <FeedCard
                    key={item.id}
                    item={item}
                    focused={!item.resolved && ui === focusIdx}
                    onApprove={doApprove}
                    onApproveNote={doApproveNote}
                    onReject={doReject}
                    onNavigate={(id) => navTo(id, "feed")}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Workstreams view */}
        {view === "workstreams" && (
          <div style={{ animation: "pipeline-fadeIn 0.25s ease" }}>
            <div style={{ marginBottom: 18 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  margin: "0 0 4px",
                  letterSpacing: "-0.02em",
                }}
              >
                Workstreams
              </h1>
              <p style={{ fontSize: 13, color: T.textDim, margin: 0 }}>
                {workstreams.length} active projects
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {workstreams.map((ws, i) => (
                <button
                  key={ws.id}
                  onClick={() => navTo(ws.id, "workstreams")}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "16px 18px",
                    borderRadius: 12,
                    background: T.card,
                    cursor: "pointer",
                    fontFamily: T.font,
                    transition: "all 0.15s",
                    border: `1px solid ${i === focusIdx ? T.focus : T.cardBorder}`,
                    boxShadow:
                      i === focusIdx
                        ? `0 0 0 1px ${T.focus}, 0 0 20px ${T.accentGlow}`
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 650,
                          color: T.text,
                          marginBottom: 4,
                        }}
                      >
                        {ws.title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: T.textDim,
                        }}
                      >
                        <span style={{ fontFamily: T.mono }}>
                          {ws.source}
                        </span>
                        <span>→</span>
                        <span
                          style={{
                            fontFamily: T.mono,
                            color: T.accent,
                          }}
                        >
                          {ws.target}
                        </span>
                        <span style={{ margin: "0 4px" }}>·</span>
                        <span>{ws.created}</span>
                      </div>
                    </div>
                    <StatusBadge
                      phaseIndex={ws.phaseIndex}
                      phaseStatus={ws.phaseStatus}
                    />
                  </div>
                  <PhaseBar
                    phaseIndex={ws.phaseIndex}
                    phaseStatus={ws.phaseStatus}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pipelines view */}
        {view === "pipelines" && (
          <PipelinesView onOpenEditor={openEditor} />
        )}

        {/* Detail view */}
        {view === "detail" && currentWs && (
          <div style={{ animation: "pipeline-fadeIn 0.25s ease" }}>
            <button
              onClick={goBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                color: T.textDim,
                cursor: "pointer",
                fontFamily: T.font,
                fontSize: 13,
                padding: 0,
                marginBottom: 18,
              }}
            >
              {PipelineIcons.back}{" "}
              {prevView === "feed" ? "Back to Feed" : "All Workstreams"}{" "}
              <Kbd>Esc</Kbd>
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {currentWs.title}
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: T.textMuted,
                    margin: "6px 0 0",
                    maxWidth: 600,
                  }}
                >
                  {currentWs.description}
                </p>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <StatusBadge
                  phaseIndex={currentWs.phaseIndex}
                  phaseStatus={currentWs.phaseStatus}
                />
                <button
                  onClick={() => selectedWs && openEditor(selectedWs)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: "transparent",
                    color: T.text,
                    cursor: "pointer",
                    fontFamily: T.font,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {PipelineIcons.code} Open Editor <Kbd>E</Kbd>
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: T.textDim,
                marginBottom: 14,
              }}
            >
              {PipelineIcons.db}{" "}
              <span style={{ fontFamily: T.mono }}>{currentWs.source}</span>{" "}
              →{" "}
              <span style={{ fontFamily: T.mono, color: T.accent }}>
                {currentWs.target}
              </span>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                {PHASES.map((p, i) => (
                  <span
                    key={p.key}
                    style={{
                      fontSize: 10,
                      color:
                        i <= currentWs.phaseIndex ? T.text : T.textDim,
                      fontWeight: i === currentWs.phaseIndex ? 700 : 400,
                    }}
                  >
                    {p.short}
                  </span>
                ))}
              </div>
              <PhaseBar
                phaseIndex={currentWs.phaseIndex}
                phaseStatus={currentWs.phaseStatus}
              />
            </div>

            <div
              style={{
                background: T.surface,
                borderRadius: 12,
                border: `1px solid ${T.cardBorder}`,
                padding: 20,
              }}
            >
              <OverviewContent
                ws={currentWs}
                onApprove={
                  currentWs.schema || currentWs.validation
                    ? detailApprove
                    : undefined
                }
                onReject={
                  currentWs.schema || currentWs.validation
                    ? detailReject
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </main>

      {/* Hint bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "7px 24px",
          background: T.surface,
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          zIndex: 90,
          flexWrap: "wrap",
        }}
      >
        {(hints[view] ?? []).map(([keys, label], i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: T.textDim,
            }}
          >
            <Kbd>{keys}</Kbd>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal.title}
          required={modal.required}
          submitLabel={modal.submitLabel}
          submitColor={modal.submitColor}
          onSubmit={modal.onSubmit}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 52,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 20px",
            borderRadius: 10,
            background: T.surface,
            border: `1px solid ${T.border}`,
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
            fontSize: 13,
            fontWeight: 550,
            color: T.green,
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "pipeline-slideIn 0.3s ease",
            zIndex: 200,
            whiteSpace: "nowrap",
          }}
        >
          {PipelineIcons.check} {toast}
        </div>
      )}
    </div>
  );
}
