import { create } from "zustand";
import type { ApiProvider } from "./translatorStore";
import { invoke } from "@tauri-apps/api/core";

const STORE_DEFAULTS = {
  darkMode: true,
  autostart: false,
  apiKeys: { deepl: "", google: "", bing: "", lara: "", custom: "" },
  activeApi: "deepl",
  lastUpdateCheck: 0,
  popupSourceLang: "auto",
  popupTargetLang: "en",
};

interface SettingsState {
  darkMode: boolean;
  autostart: boolean;
  settingsOpen: boolean;
  apiKeys: Record<ApiProvider, string>;
  activeApi: ApiProvider;

  setDarkMode: (dark: boolean) => void;
  setAutostart: (auto: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setApiKey: (provider: ApiProvider, key: string) => void;
  setActiveApi: (api: ApiProvider) => void;
  loadFromStore: () => Promise<void>;
  saveToStore: () => Promise<void>;
}


export const useSettingsStore = create<SettingsState>((set, get) => ({
  darkMode: true,
  autostart: false,
  settingsOpen: false,
  apiKeys: {
    deepl: "",
    google: "",
    bing: "",
    lara: "",
    custom: "",
  },
  activeApi: "deepl",

  setDarkMode: (dark: boolean) => {
    set({ darkMode: dark });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
    }
  },

  setAutostart: (auto: boolean) => set({ autostart: auto }),
  setSettingsOpen: (open: boolean) => set({ settingsOpen: open }),

  setApiKey: (provider: ApiProvider, key: string) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, [provider]: key },
    })),

  setActiveApi: (api: ApiProvider) => set({ activeApi: api }),

  loadFromStore: async () => {
    try {
      const dataStr = await invoke<string>("load_settings");
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        const finalDarkMode = parsed.darkMode ?? true;
        set({
          darkMode: finalDarkMode,
          autostart: parsed.autostart ?? false,
          apiKeys: { ...STORE_DEFAULTS.apiKeys, ...(parsed.apiKeys || {}) },
          activeApi: parsed.activeApi ?? "deepl",
        });
        if (finalDarkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        
        set({ darkMode: true });
        document.documentElement.classList.add("dark");
      }
    } catch (e) {
      console.log("Running outside Tauri, using defaults", e);
      set({ darkMode: true });
      document.documentElement.classList.add("dark");
    }
  },

  saveToStore: async () => {
    try {
      const state = get();
      const payload = JSON.stringify({
        darkMode: state.darkMode,
        autostart: state.autostart,
        apiKeys: state.apiKeys,
        activeApi: state.activeApi,
      });
      await invoke("save_settings", { payload });
    } catch (e) {
      console.log("Failed to save native store:", e);
    }
  },
}));