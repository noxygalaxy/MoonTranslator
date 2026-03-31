"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownPortalProps {
  children: ReactNode;
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  minWidth?: number;
}

export default function DropdownPortal({
  children,
  anchorRef,
  isOpen,
  minWidth = 144,
}: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, left: 0, width: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      bottom: window.innerHeight - rect.top,
      left: rect.left,
      width: rect.width,
    });
  }, [isOpen, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: pos.bottom + 4,
        left: pos.left,
        width: Math.max(pos.width, minWidth),
        zIndex: 9999,
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      {children}
    </div>,
    document.body
  );
}