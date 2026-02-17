"use client";

import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/pipeline/theme";
import { Kbd } from "@/components/pipeline/kbd";
import type { ModalState } from "@/lib/pipeline/types";

interface ModalProps extends ModalState {
  onCancel: () => void;
}

export function Modal({
  title,
  required,
  onSubmit,
  onCancel,
  submitLabel,
  submitColor,
}: ModalProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Enter" &&
        (!required || text.trim())
      ) {
        e.preventDefault();
        onSubmit(text);
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [text, onSubmit, onCancel, required]);

  const isDisabled = required && !text.trim();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        animation: "pipeline-fadeIn 0.15s ease",
      }}
    >
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 24,
          width: 480,
          maxWidth: "90vw",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 650,
            color: T.text,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{ fontSize: 12, color: T.textDim, marginBottom: 14 }}
        >
          {required
            ? "Describe what changes you need."
            : "Optional note for context."}
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            required
              ? "What should the agent change?"
              : "Leave a note (optional)..."
          }
          rows={4}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.bg,
            color: T.text,
            fontFamily: T.font,
            fontSize: 13,
            resize: "vertical",
            outline: "none",
            lineHeight: 1.6,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: T.textDim,
            }}
          >
            <Kbd>⌘↵</Kbd> Submit · <Kbd>Esc</Kbd> Cancel
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "transparent",
                color: T.textMuted,
                fontWeight: 500,
                fontSize: 13,
                fontFamily: T.font,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(text)}
              disabled={isDisabled}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "none",
                background: isDisabled
                  ? T.border
                  : submitColor || T.green,
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                fontFamily: T.font,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.5 : 1,
              }}
            >
              {submitLabel || "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
