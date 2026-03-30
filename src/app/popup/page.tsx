"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { usePopupStore } from "@/store/popupStore";
import { useSettingsStore } from "@/store/settingsStore";
import { API_PROVIDERS } from "@/store/translatorStore";
import type { ApiProvider } from "@/store/translatorStore";
import {
  translateText,
  validateApiKey,
  detectLanguageSimple,
  getSmartTargetLang,
} from "@/lib/translate";
import LanguageSelector from "@/components/LanguageSelector";
import {
  X,
  GripHorizontal,
  Copy,
  Check,
  Key,
  Loader2,
  ArrowRight,
  ChevronUp,
  TriangleAlert,
  ArrowRightLeft,
} from "lucide-react";
import Image from "next/image";

export default function PopupPage() {
  const {
    clipboardText,
    translatedText,
    sourceLang,
    targetLang,
    isTranslating,
    error,
    showKeyInput,
    keyInputValue,
    keySaveStatus,
    setClipboardText,
    setTranslatedText,
    setSourceLang,
    setTargetLang,
    setIsTranslating,
    setError,
    setShowKeyInput,
    setKeyInputValue,
    setKeySaveStatus,
  } = usePopupStore();

  const { activeApi, setActiveApi, loadFromStore, setApiKey, saveToStore } =
    useSettingsStore();

  const [copied, setCopied] = useState(false);
  const [selectedApi, setSelectedApi] = useState<ApiProvider>(activeApi);
  const [isTranslatorSelectOpen, setIsTranslatorSelectOpen] = useState(false);
  const initRef = useRef(false);
  const translatorSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (translatorSelectRef.current && !translatorSelectRef.current.contains(event.target as Node)) {
        setIsTranslatorSelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDropdownOpen = useCallback(async (isOpen: boolean) => {
    try {
      const { getCurrentWindow, LogicalSize } = await import("@tauri-apps/api/window");
      await getCurrentWindow().setSize(new LogicalSize(380, isOpen ? 560 : 280));
    } catch {
      
    }
  }, []);

  const readClipboard = useCallback(async () => {
    try {
      const { readText } = await import(
        "@tauri-apps/plugin-clipboard-manager"
      );
      const text = await readText();
      if (text) {
        setClipboardText(text);

        const detected = detectLanguageSimple(text);
        const smartTarget = getSmartTargetLang(detected);
        setTargetLang(smartTarget);

        try {
          const { load } = await import("@tauri-apps/plugin-store");
          const store = await load("settings.json", { defaults: {} });
          const savedSource = await store.get<string>("popupSourceLang");
          const savedTarget = await store.get<string>("popupTargetLang");
          if (savedSource) setSourceLang(savedSource);
          if (savedTarget) setTargetLang(savedTarget);
        } catch {}
      }
    } catch {
      setClipboardText("(Could not read clipboard)");
    }
  }, [setClipboardText, setSourceLang, setTargetLang]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      await loadFromStore();
      await readClipboard();
    };
    init();

    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlisten = await win.listen("popup-refresh", () => {
          readClipboard();
        });
      } catch {}
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, [loadFromStore, readClipboard]);

  useEffect(() => {
    setSelectedApi(activeApi);
  }, [activeApi]);

  const doTranslate = useCallback(async () => {
    const text = usePopupStore.getState().clipboardText;
    if (!text.trim() || text === "(Could not read clipboard)") return;

    const settingsState = useSettingsStore.getState();
    const api = selectedApi;
    const apiKey = settingsState.apiKeys[api];

    if (!apiKey) {
      setError(
        `No API key for ${API_PROVIDERS.find((p) => p.id === api)?.name}`
      );
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateText(
        text,
        usePopupStore.getState().sourceLang,
        usePopupStore.getState().targetLang,
        api,
        apiKey
      );
      setTranslatedText(result.translatedText);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e) || "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  }, [selectedApi, setTranslatedText, setIsTranslating, setError]);

  useEffect(() => {
    if (clipboardText && clipboardText !== "(Could not read clipboard)") {
      doTranslate();
    }
  }, [clipboardText, sourceLang, targetLang, selectedApi, doTranslate]);

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      const { writeText } = await import(
        "@tauri-apps/plugin-clipboard-manager"
      );
      await writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error("Failed to copy");
      }
    }
  };

  const handleReplace = async () => {
    if (!translatedText) return;
    try {
      await handleCopy();
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("close_popup_window");
      await invoke("simulate_paste");
    } catch {
      console.error("Failed to replace");
    }
  };

  const handleClose = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("close_popup_window");
    } catch {
      window.close();
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const saveLangPref = async (key: string, val: string) => {
    try {
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("settings.json", { defaults: {} });
      await store.set(key, val);
      await store.save();
    } catch {}
  };

  const handleSaveKey = async () => {
    if (!keyInputValue.trim()) return;

    setKeySaveStatus("saving");
    const isValid = await validateApiKey(selectedApi, keyInputValue);

    if (isValid) {
      setApiKey(selectedApi, keyInputValue);
      await saveToStore();
      setKeySaveStatus("success");
      setTimeout(() => {
        setShowKeyInput(false);
        setKeySaveStatus("idle");
        setKeyInputValue("");
        doTranslate();
      }, 2000);
    } else {
      setKeySaveStatus("error");
      setTimeout(() => setKeySaveStatus("idle"), 3000);
    }
  };

  return (
    <div
      className="flex flex-col select-none relative bg-surface text-foreground rounded-(--md-shape-lg) h-70"
    >
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 py-2 shrink-0 bg-surface-high border-b border-(--md-outline-variant) rounded-t-(--md-shape-lg)"
      >
        <div className="flex items-center gap-2" data-tauri-drag-region>
          <GripHorizontal size={14} className="text-secondary" />
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center p-0.5"
          >
            <Image src="/logo.webp" width={16} height={16} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span
            className="text-xs font-medium tracking-wide"
            data-tauri-drag-region
          >
            MoonTranslator
          </span>
        </div>
        <button
          onClick={handleClose}
          className="md-icon-btn w-7 h-7"
        >
          <X size={14} />
        </button>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b border-(--md-outline-variant)"
      >
        <div className="flex-1">
          <LanguageSelector
            value={sourceLang}
            onChange={(val) => {
              setSourceLang(val);
              saveLangPref("popupSourceLang", val);
            }}
            showAutoDetect
            compact
            onOpenChange={handleDropdownOpen}
          />
        </div>
        <ArrowRight size={14} className="text-primary shrink-0" />
        <div className="flex-1">
          <LanguageSelector
            value={targetLang}
            onChange={(val) => {
              setTargetLang(val);
              saveLangPref("popupTargetLang", val);
            }}
            compact
            onOpenChange={handleDropdownOpen}
          />
        </div>
      </div>

      <div
        className="px-4 py-2.5 max-h-16 overflow-y-auto shrink-0 bg-surface-low border-b border-(--md-outline-variant)"
      >
        <p
          className="leading-snug line-clamp-3 text-xs text-secondary"
        >
          {clipboardText || "No clipboard text"}
        </p>
      </div>

      <div className="flex-1 px-4 py-3 overflow-y-auto min-h-10">
        {isTranslating ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-3/4" />
          </div>
        ) : error ? (
          <div
            className="flex flex-col gap-2 p-3 text-xs bg-error-container text-error rounded-(--md-shape-sm) border border-error/20"
          >
            <div className="flex items-start gap-2">
              <TriangleAlert size={16} />
              <span className="leading-snug wrap-break-word">{error}</span>
            </div>
            <div className="pl-5">
              <a 
                href="https://github.com/noxygalaxy/moontranslator/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline opacity-90 hover:opacity-100 transition-opacity text-[11px] text-error"
              >
                Report this issue on GitHub
              </a>
            </div>
          </div>
        ) : (
          <p
            className="leading-snug text-[13px] text-foreground"
          >
            {translatedText}
          </p>
        )}
      </div>

      {showKeyInput && (
        <div
          className="px-4 py-2.5 shrink-0 bg-surface-high border-t border-(--md-outline-variant)"
        >
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={keyInputValue}
              onChange={(e) => setKeyInputValue(e.target.value)}
              placeholder={selectedApi === "lara" ? "ID,Secret" : "Enter API key..."}
              className="flex-1 text-xs focus:outline-none bg-surface-highest text-foreground border border-(--md-outline-variant) rounded-(--md-shape-sm) px-3 py-2"
              autoFocus
            />
            <button
              onClick={handleSaveKey}
              disabled={keySaveStatus === "saving"}
              className="md-btn-tonal h-8 px-3 text-[11px] rounded-(--md-shape-sm)"
            >
              {keySaveStatus === "saving" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : keySaveStatus === "success" ? (
                <span className="flex items-center gap-1"><Check size={12} /> Saved</span>
              ) : keySaveStatus === "error" ? (
                <span className="flex items-center gap-1"><X size={12} /> Invalid</span>
              ) : (
                "Save"
              )}
            </button>
            <button
              onClick={() => {
                setShowKeyInput(false);
                setKeyInputValue("");
                setKeySaveStatus("idle");
              }}
              className="text-xs text-secondary bg-transparent border-none cursor-pointer py-1 px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className="flex items-center justify-between px-4 py-2 shrink-0 bg-surface-high border-t border-(--md-outline-variant) rounded-b-(--md-shape-lg)"
      >
        <div className="flex items-center gap-2">
          <div ref={translatorSelectRef} className="relative z-50">
            <button
              onClick={() => setIsTranslatorSelectOpen(!isTranslatorSelectOpen)}
              className="flex items-center justify-between font-medium outline-none state-layer gap-2 cursor-pointer bg-surface-high text-secondary border border-(--md-outline-variant) rounded-(--md-shape-sm) py-1.5 pl-3 pr-2 text-xs transition-all"
            >
              <span>{API_PROVIDERS.find(p => p.id === selectedApi)?.name || "Select API"}</span>
              <ChevronUp
                size={14}
                className={`text-secondary transition-transform duration-200 ${isTranslatorSelectOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            <div
              className={`absolute bottom-full left-0 mb-1 w-36 overflow-hidden shadow-xl transition-all duration-200 ease-out origin-bottom border border-(--md-outline-variant) bg-surface-highest rounded-(--md-shape-md) ${isTranslatorSelectOpen ? "max-h-50 opacity-100 pointer-events-auto" : "max-h-0 opacity-0 pointer-events-none"}`}
            >
              <div className="flex flex-col py-1 px-1">
                {API_PROVIDERS.map((p) => {
                  const isSelected = selectedApi === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={async () => {
                        setSelectedApi(p.id);
                        setActiveApi(p.id);
                        await saveToStore();
                        setIsTranslatorSelectOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 mb-0.5 rounded-full text-left w-full hover:bg-[rgba(255,255,255,0.08)] transition-colors text-xs ${isSelected ? "text-primary font-semibold" : "text-foreground font-normal"}`}
                    >
                      {p.name}
                      {isSelected && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="md-icon-btn w-7 h-7"
          >
            <Key size={12} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReplace}
            disabled={!translatedText}
            className={`md-chip h-7 px-3 text-[11px] ${!translatedText ? "opacity-38" : ""}`}
          >
            <ArrowRightLeft size={12} />
            Replace
          </button>
          <button
            onClick={handleCopy}
            disabled={!translatedText}
            className={`md-chip h-7 px-3 text-[11px] ${!translatedText ? "opacity-38" : ""} ${copied ? "bg-primary-container text-on-primary-container border-transparent" : ""}`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}