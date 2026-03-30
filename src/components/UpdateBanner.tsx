"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdates();

    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlisten = await win.listen("check-update", () => {
          checkForUpdates();
        });
      } catch {}
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ status: number; body: string }>(
        "proxy_request",
        {
          args: {
            url: "https://api.github.com/repos/noxygalaxy/MoonTranslator/releases/latest",
            method: "GET",
            headers: { Accept: "application/vnd.github.v3+json" },
            body: null,
          },
        }
      );

      if (result.status === 200) {
        const release = JSON.parse(result.body);
        const latestVersion = release.tag_name?.replace("v", "") || "";
        const currentVersion = "0.1.0";

        if (latestVersion && latestVersion !== currentVersion) {
          setNewVersion(latestVersion);
          setUpdateAvailable(true);
        }
      }

      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("settings.json", { defaults: {} });
      await store.set("lastUpdateCheck", Date.now());
      await store.save();
    } catch {}
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      }
    } catch (e) {
      console.error("Update failed:", e);
      setUpdating(false);
    }
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      className="toast-enter flex items-center justify-between gap-3 px-5 py-3 shrink-0 bg-inverse-surface text-inverse-on-surface"
    >
      <div className="flex items-center gap-3 text-sm">
        <Download size={16} />
        <span>
          Update available:{" "}
          <span className="font-semibold">v{newVersion}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="text-sm font-medium px-4 py-1.5 rounded-full transition-opacity disabled:opacity-50 bg-(--md-inverse-primary) text-on-primary"
        >
          {updating ? "Updating..." : "Install"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="md-icon-btn w-8 h-8 text-inverse-on-surface"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
