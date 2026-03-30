"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { useTranslatorStore, API_PROVIDERS } from "@/store/translatorStore";
import type { ApiProvider } from "@/store/translatorStore";
import { validateApiKey } from "@/lib/translate";
import {
  X,
  Moon,
  Sun,
  Key,
  Monitor,
  RefreshCw,
  Trash2,
  Check,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SettingsPanel() {
  const {
    settingsOpen,
    setSettingsOpen,
    darkMode,
    setDarkMode,
    autostart,
    setAutostart,
    apiKeys,
    setApiKey,
    activeApi,
    setActiveApi,
    saveToStore,
  } = useSettingsStore();

  const { setActiveApi: setTranslatorApi } = useTranslatorStore();

  const [editingKeys, setEditingKeys] = useState<
    Record<ApiProvider, string>
  >({
    deepl: "",
    google: "",
    bing: "",
    lara: "",
    custom: "",
  });

  const [validating, setValidating] = useState<ApiProvider | null>(null);
  const [validationResult, setValidationResult] = useState<
    Record<string, boolean | null>
  >({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setEditingKeys({ ...apiKeys });
  }, [apiKeys, settingsOpen]);

  const handleSaveKey = useCallback(
    async (provider: ApiProvider) => {
      const key = editingKeys[provider];
      if (!key.trim()) return;

      setValidating(provider);
      setValidationResult((prev) => ({ ...prev, [provider]: null }));

      const isValid = await validateApiKey(provider, key);

      setValidationResult((prev) => ({ ...prev, [provider]: isValid }));
      setValidating(null);

      if (isValid) {
        setApiKey(provider, key);
        await saveToStore();
        setTimeout(
          () =>
            setValidationResult((prev) => ({ ...prev, [provider]: null })),
          3000
        );
      }
    },
    [editingKeys, setApiKey, saveToStore]
  );

  const handleSetActive = useCallback(
    async (api: ApiProvider) => {
      setActiveApi(api);
      setTranslatorApi(api);
      await saveToStore();
    },
    [setActiveApi, setTranslatorApi, saveToStore]
  );

  const handleDarkModeToggle = useCallback(async () => {
    setDarkMode(!darkMode);
    await saveToStore();
  }, [darkMode, setDarkMode, saveToStore]);

  const handleAutostartToggle = useCallback(async () => {
    const newValue = !autostart;
    setAutostart(newValue);

    try {
      if (newValue) {
        const { enable } = await import("@tauri-apps/plugin-autostart");
        await enable();
      } else {
        const { disable } = await import("@tauri-apps/plugin-autostart");
        await disable();
      }
    } catch (e) {
      console.log("Autostart not available:", e);
    }

    await saveToStore();
  }, [autostart, setAutostart, saveToStore]);

  const handleClearData = useCallback(async () => {
    try {
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("settings.json", { defaults: {} });
      await store.clear();
      await store.save();
      window.location.reload();
    } catch {
      console.log("Store not available");
    }
  }, []);

  return (
    <>
      <div
        className={`absolute inset-0 z-40 transition-opacity duration-300 bg-black/50 ${settingsOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSettingsOpen(false)}
      />

      <div
        className={`absolute right-0 top-0 bottom-0 w-100 max-w-[90vw] z-50 overflow-y-auto transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] bg-surface-low rounded-l-(--md-shape-lg) ${settingsOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"}`}
      >
        <div
          className="sticky top-0 z-10 px-6 py-5 flex items-center justify-between bg-surface-low border-b border-(--md-outline-variant)"
        >
          <h2
            className="text-xl font-normal text-foreground tracking-tight"
          >
            Settings
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="md-icon-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-8">
          <section>
            <h3
              className="text-sm font-medium mb-4 text-primary tracking-wide"
            >
              Translation API
            </h3>

            <div className="flex flex-col gap-2">
              {API_PROVIDERS.map((provider) => {
                const isActive = activeApi === provider.id;
                const hasKey = !!apiKeys[provider.id];
                return (
                  <div
                    key={provider.id}
                    className={`overflow-hidden rounded-(--md-shape-md) transition-all duration-300 border ${isActive ? "bg-surface-high border-primary ring-1 ring-primary" : "bg-surface border-(--md-outline-variant)"}`}
                  >
                    <button
                      onClick={() => handleSetActive(provider.id)}
                      className="flex items-center justify-between w-full px-3 py-2 bg-transparent border-none cursor-pointer text-foreground"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors duration-200 ${isActive ? "border-primary" : "border-outline"}`}
                        >
                          {isActive && (
                            <div
                              className="w-2.5 h-2.5 rounded-full animate-scale-in"
                              style={{ background: "var(--md-primary)" }}
                            />
                          )}
                        </div>
                        <span className="text-[13px] font-medium">{provider.name}</span>
                      </div>

                      {hasKey && (
                        <span
                          className="md-badge"
                          style={{
                            background: "var(--md-primary-container)",
                            color: "var(--md-on-primary-container)",
                          }}
                        >
                          <Check size={10} />
                          Key set
                        </span>
                      )}
                    </button>

                    <div
                      className="px-3 pb-2.5"
                      style={{
                        borderTop: "1px solid var(--md-outline-variant)",
                        paddingTop: "8px",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 flex items-center gap-2 overflow-hidden bg-surface-highest rounded-(--md-shape-sm) border border-(--md-outline-variant) px-2.5 h-9 transition-colors duration-200 focus-within:border-primary"
                        >
                          <Key size={12} className="text-secondary shrink-0" />
                          <input
                            type={showKeys[provider.id] ? "text" : "password"}
                            value={editingKeys[provider.id]}
                            onChange={(e) =>
                              setEditingKeys((prev) => ({
                                ...prev,
                                [provider.id]: e.target.value,
                              }))
                            }
                            placeholder={provider.id === "lara" ? "AccessKeyID,AccessKeySecret" : provider.id === "custom" ? "Custom translation API URL" : "API key"}
                            className="flex-1 text-xs focus:outline-none bg-transparent text-foreground border-none h-full"
                          />
                          <button
                            onClick={() =>
                              setShowKeys((prev) => ({
                                ...prev,
                                [provider.id]: !prev[provider.id],
                              }))
                            }
                            className="text-secondary bg-transparent border-none cursor-pointer p-1 shrink-0"
                          >
                            {showKeys[provider.id] ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                        </div>

                        <button
                          onClick={() => handleSaveKey(provider.id)}
                          disabled={
                            !(editingKeys[provider.id] || "").trim() ||
                            validating === provider.id
                          }
                          className="md-btn-tonal shrink-0 h-9 px-3.5 text-xs"
                        >
                          {validating === provider.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : validationResult[provider.id] === true ? (
                            <>
                              <Check size={14} />
                              Saved
                            </>
                          ) : validationResult[provider.id] === false ? (
                            "Invalid"
                          ) : (
                            "Save"
                          )}
                        </button>
                      </div>

                      {validationResult[provider.id] === false && (
                        <p className="text-xs mt-2 text-error">
                          Invalid API key. Please check and try again.
                        </p>
                      )}
                      {validationResult[provider.id] === true && (
                        <p className="text-xs mt-2 text-primary">
                          Key validated and saved successfully.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="md-divider" />

          <section>
            <h3 className="text-sm font-medium mb-4 text-primary tracking-wide">
              Preferences
            </h3>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleDarkModeToggle}
                className="md-card flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3 text-sm text-foreground">
                  {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                  {darkMode ? "Dark theme" : "Light theme"}
                </div>
                <div className={`md-switch ${darkMode ? "on" : ""}`}>
                  <div className="md-switch-thumb" />
                </div>
              </button>

              <button
                onClick={handleAutostartToggle}
                className="md-card flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Monitor size={18} />
                  Start with Windows
                </div>
                <div className={`md-switch ${autostart ? "on" : ""}`}>
                  <div className="md-switch-thumb" />
                </div>
              </button>
            </div>
          </section>

          <div className="md-divider" />

          <section>
            <h3 className="text-sm font-medium mb-4 text-primary tracking-wide">
              Actions
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  try {
                    const { getCurrentWindow } = await import(
                      "@tauri-apps/api/window"
                    );
                    const win = getCurrentWindow();
                    await win.emit("check-update", {});
                  } catch {
                    console.log("Not in Tauri");
                  }
                }}
                className="md-card flex items-center gap-3 text-sm cursor-pointer text-foreground"
              >
                <RefreshCw size={18} className="text-secondary" />
                Check for Updates
              </button>

              <button
                onClick={handleClearData}
                className="md-card flex items-center gap-3 text-sm cursor-pointer text-error"
              >
                <Trash2 size={18} />
                Clear all data
              </button>
            </div>
          </section>

          <div className="pt-4 text-center text-xs font-mono border-t border-(--md-outline-variant) text-secondary tracking-widest">
            MoonTranslator v0.1.0
          </div>
        </div>
      </div>
    </>
  );
}
