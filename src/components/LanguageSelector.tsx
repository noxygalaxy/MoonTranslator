"use client";

import { LANGUAGES } from "@/store/translatorStore";
import { ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  showAutoDetect?: boolean;
  label?: string;
  compact?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export default function LanguageSelector({
  value,
  onChange,
  showAutoDetect = false,
  label,
  compact = false,
  onOpenChange,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (onOpenChange) onOpenChange(isOpen);
  }, [isOpen, onOpenChange]);

  const filteredLanguages = showAutoDetect
    ? LANGUAGES
    : LANGUAGES.filter((l) => l.code !== "auto");

  const selectedPrefix =
    filteredLanguages.find((l) => l.code === value)?.name || value;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${compact ? "" : "flex flex-col gap-1.5"} flex-1`}
      style={{ zIndex: 25 }}
    >
      {label && !compact && (
        <label className="text-xs font-medium px-2 text-secondary tracking-widest">
          {label}
        </label>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: "relative", zIndex: 25 }}
        className={`w-full flex items-center justify-between font-medium outline-none state-layer bg-secondary-container text-on-secondary-container border-none rounded-full cursor-pointer transition-all ${compact ? "py-2.5 px-4 pl-5 text-[13px]" : "py-3.5 px-5 pl-6 text-[15px]"} ${isOpen ? "ring-2 ring-inset ring-primary" : "ring-0"}`}
        onMouseDown={(e) => {
          if (!isOpen) e.currentTarget.style.transform = "scale(0.98)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span className="truncate pr-4">{selectedPrefix}</span>
        <ChevronDown
          size={compact ? 16 : 20}
          className={`shrink-0 transition-transform duration-300 pointer-events-none text-on-secondary-container ${isOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>

      <div
        className={`absolute top-full left-0 w-full mt-2 overflow-hidden shadow-xl transition-all duration-200 ease-out origin-top border bg-surface-high rounded-(--md-shape-md) border-(--md-outline-variant) ${isOpen ? "max-h-75 opacity-100 pointer-events-auto" : "max-h-0 opacity-0 pointer-events-none"}`}
        style={{ zIndex: 25 }}
      >
        <div className="overflow-y-auto overflow-x-hidden max-h-75 flex flex-col py-2 px-1 custom-scrollbar">
          {filteredLanguages.map((lang) => {
            const isSelected = value === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  onChange(lang.code);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2.5 mb-0.5 rounded-full text-left w-full hover:bg-[rgba(255,255,255,0.08)] transition-colors ${compact ? "text-[13px]" : "text-[14px]"} ${isSelected ? "text-primary font-semibold" : "text-foreground font-normal"}`}
              >
                <span className="truncate">{lang.name}</span>
                {isSelected && (
                  <Check size={16} className="shrink-0 ml-2 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
