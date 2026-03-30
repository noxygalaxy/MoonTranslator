use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

use super::cursor::get_cursor_pos;

const POPUP_WIDTH: f64 = 380.0;
const POPUP_HEIGHT: f64 = 280.0;
const CURSOR_OFFSET_X: i32 = 190;
const CURSOR_OFFSET_Y: i32 = 240;

const PASTE_INIT_DELAY_MS: u64 = 300;
const PASTE_MODIFIER_DELAY_MS: u64 = 20;
const PASTE_KEY_HOLD_MS: u64 = 30;

#[tauri::command]
pub async fn open_popup_window(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let has_text = app
        .clipboard()
        .read_text()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    let (target_x, target_y) = if has_text {
        let (x, y) = get_cursor_pos();
        (x - CURSOR_OFFSET_X, y - CURSOR_OFFSET_Y)
    } else {
        if let Some(monitor) = app.primary_monitor().ok().flatten() {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let win_w = POPUP_WIDTH * scale;
            let win_h = POPUP_HEIGHT * scale;
            (
                (size.width as f64 - win_w - 24.0) as i32,
                (size.height as f64 - win_h - 64.0) as i32,
            )
        } else {
            let (x, y) = get_cursor_pos();
            (x - CURSOR_OFFSET_X, y - CURSOR_OFFSET_Y)
        }
    };

    if let Some(popup) = app.get_webview_window("popup") {
        let _ = popup
            .set_position(tauri::PhysicalPosition::new(target_x, target_y))
            .inspect_err(|e| log::warn!("Failed to set popup position: {}", e));
        let _ = popup
            .show()
            .inspect_err(|e| log::warn!("Failed to show popup: {}", e));
        let _ = popup
            .set_focus()
            .inspect_err(|e| log::warn!("Failed to set popup focus: {}", e));
        let _ = popup
            .emit("popup-refresh", ())
            .inspect_err(|e| log::warn!("Failed to emit popup-refresh: {}", e));
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "popup", WebviewUrl::App("popup".into()))
        .title("")
        .inner_size(380.0, 280.0)
        .min_inner_size(320.0, 180.0)
        .position(target_x as f64, target_y as f64)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(true)
        .transparent(true)
        .shadow(false)
        .build()
        .map_err(|e| format!("Failed to create popup window: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn close_popup_window(app: AppHandle) -> Result<(), String> {
    if let Some(popup) = app.get_webview_window("popup") {
        let _ = popup
            .hide()
            .inspect_err(|e| log::warn!("Failed to hide popup: {}", e));
    }
    Ok(())
}

#[tauri::command]
pub async fn simulate_paste() -> Result<(), String> {
    use rdev::{simulate, EventType, Key};
    use std::thread;
    use std::time::Duration;

    thread::sleep(Duration::from_millis(PASTE_INIT_DELAY_MS));

    #[cfg(target_os = "macos")]
    let modifier = Key::MetaLeft;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::ControlLeft;

    simulate(&EventType::KeyPress(modifier))
        .map_err(|e| format!("Failed to press modifier: {:?}", e))?;

    thread::sleep(Duration::from_millis(PASTE_MODIFIER_DELAY_MS));
    simulate(&EventType::KeyPress(Key::KeyV)).map_err(|e| format!("Failed to press V: {:?}", e))?;
    thread::sleep(Duration::from_millis(PASTE_KEY_HOLD_MS));
    simulate(&EventType::KeyRelease(Key::KeyV))
        .map_err(|e| format!("Failed to release V: {:?}", e))?;
    simulate(&EventType::KeyRelease(modifier))
        .map_err(|e| format!("Failed to release modifier: {:?}", e))?;

    Ok(())
}
