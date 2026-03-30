import { create } from "zustand";

interface PopupState {
  clipboardText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  isTranslating: boolean;
  error: string | null;
  showKeyInput: boolean;
  keyInputValue: string;
  keySaveStatus: "idle" | "saving" | "success" | "error";

  setClipboardText: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
  setIsTranslating: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowKeyInput: (show: boolean) => void;
  setKeyInputValue: (value: string) => void;
  setKeySaveStatus: (status: "idle" | "saving" | "success" | "error") => void;
  reset: () => void;
}

export const usePopupStore = create<PopupState>((set) => ({
  clipboardText: "",
  translatedText: "",
  sourceLang: "auto",
  targetLang: "en",
  isTranslating: false,
  error: null,
  showKeyInput: false,
  keyInputValue: "",
  keySaveStatus: "idle",

  setClipboardText: (text: string) => set({ clipboardText: text }),
  setTranslatedText: (text: string) => set({ translatedText: text }),
  setSourceLang: (lang: string) => set({ sourceLang: lang }),
  setTargetLang: (lang: string) => set({ targetLang: lang }),
  setIsTranslating: (loading: boolean) => set({ isTranslating: loading }),
  setError: (error: string | null) => set({ error }),
  setShowKeyInput: (show: boolean) => set({ showKeyInput: show }),
  setKeyInputValue: (value: string) => set({ keyInputValue: value }),
  setKeySaveStatus: (status) => set({ keySaveStatus: status }),
  reset: () =>
    set({
      clipboardText: "",
      translatedText: "",
      error: null,
      showKeyInput: false,
      keyInputValue: "",
      keySaveStatus: "idle",
    }),
}));
