"use client";

import { useTranslatorStore } from "@/store/translatorStore";
import { Copy, Check, TriangleAlert } from "lucide-react";
import { useState } from "react";

export default function TranslatorOutput() {
  const { translatedText, isTranslating, error } = useTranslatorStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const { writeText } = await import(
          "@tauri-apps/plugin-clipboard-manager"
        );
        await writeText(translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error("Failed to copy:", e);
      }
    }
  };

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{ background: "transparent" }}
    >
      <div className="flex-1 px-6 py-5 min-h-30 relative">
        {isTranslating ? (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-4 w-3/5" />
          </div>
        ) : error ? (
          <div className="flex flex-col gap-3 p-4 text-sm animate-fade-in bg-error-container text-error rounded-(--md-shape-md) border border-error/20">
            <div className="flex items-start gap-3">
              <TriangleAlert size={16} />
              <span className="leading-snug wrap-break-word">{error}</span>
            </div>
            <div className="mt-1 pl-7">
              <a 
                href="https://github.com/noxygalaxy/moontranslator/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs underline hover:opacity-80 transition-opacity text-error"
              >
                Report this issue on GitHub
              </a>
            </div>
          </div>
        ) : translatedText ? (
          <div
            key={translatedText}
            className="whitespace-pre-wrap animate-fade-in"
            style={{
              fontSize: "16px",
              lineHeight: "1.7",
              letterSpacing: "0.01em",
              color: "var(--md-on-surface)",
            }}
          >
            {translatedText}
          </div>
        ) : (
          <div
            style={{
              color: "var(--md-on-surface-variant)",
              opacity: 0.5,
              fontSize: "16px",
            }}
          >
            Translation will appear here...
          </div>
        )}
      </div>

      {translatedText && !isTranslating && (
        <div
          className="flex items-center justify-end px-6 py-4 shrink-0 pb-20 md:pb-4"
        >
          <button
            onClick={handleCopy}
            className="md-chip state-layer"
            style={copied ? {
              background: "var(--md-primary-container)",
              color: "var(--md-on-primary-container)",
              borderColor: "transparent",
            } : {
              background: "var(--md-surface-container-high)",
              borderColor: "transparent",
            }}
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
