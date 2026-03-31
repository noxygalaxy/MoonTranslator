**Additions:**

- **Free Translators:** Added support for Google and Bing translation without needing API keys.
- **Language Swap:** Added button to instantly reverse languages directly in the popup (double Ctrl+C) window.
- **Manual Editing:** Added the ability to manually edit output text before replacing/copying it in the popup window.
- **Window Controls:** Added a close button to the main window.
- **Build Optimized:** Significantly improved GitHub Actions build speeds by caching pnpm/cargo dependencies and reusing the custom installer binary if no changes were made to it.

**Fixes:**

- **Smart Positioning:** Fixed popup window getting cut off at screen edges (now stays fully visible).
- **Popup Resizing:** Fixed structural and resizing issues for the popup window when interacting with dropdowns.
- **API Key Prompts:** Fixed an issue where the popup window asked for an API key for a second time unnecessarily.
- **Scrolling Behavior:** Fixed scrolling issues in the output translation field.
- **Text State:** Fixed a bug where output text stubbornly remained visible after removing the source input text.
