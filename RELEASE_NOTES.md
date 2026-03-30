First early release of MoonTranslator.

**What works:**

- Global popup translator (triggers instantly from anywhere on Windows)
- Direct text-replacement via system clipboard interception
- Support for DeepL, Google, Bing, Lara, and Custom API endpoints
- Auto-detect source language and smart target language switching
- Persistent settings and encrypted API key storage

**Setup:**
You will need to supply your own API keys for the major providers. Go to Settings (via system tray or the popup widget) to add them. They are validated locally before saving.

**Notes:**

- **APIs:** DeepL and the Custom API endpoint have been tested extensively. Full disclosure, I haven't been able to fully verify the Google and Bing integrations because I don't currently have the budget for their paid tiers to test them. If you have keys for those and they break, please open an issue!
- **Edge cases:** This is built on Tauri v2. Since the app does a lot of raw Windows system calls and clipboard hacking to make the "Replace" feature work, you might occasionally run into focus-stealing edge cases depending on the host application you are typing in.

Please report any weird behavior or crashes on the issue tracker!
