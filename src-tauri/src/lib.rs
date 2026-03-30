use std::sync::Mutex;
use std::time::Instant;
use tauri::Emitter;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};

mod commands;

struct CtrlCState {
    last_press: Option<Instant>,
}

const DOUBLE_PRESS_TIMEOUT_MS: u128 = 500;
const POPUP_WIDTH: f64 = 380.0;
const POPUP_HEIGHT: f64 = 280.0;
const CURSOR_OFFSET_X: i32 = 190;
const CURSOR_OFFSET_Y: i32 = 240;

fn show_and_focus_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window
            .show()
            .inspect_err(|e| log::warn!("Failed to show window {label}: {e}"));
        let _ = window
            .set_focus()
            .inspect_err(|e| log::warn!("Failed to focus window {label}: {e}"));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(CtrlCState { last_press: None }))
        .invoke_handler(tauri::generate_handler![
            commands::translate::translate_text,
            commands::translate::validate_api_key,
            commands::cursor::get_cursor_position,
            commands::proxy::proxy_request,
            commands::window::open_popup_window,
            commands::window::close_popup_window,
            commands::window::simulate_paste,
            commands::store::save_settings,
            commands::store::load_settings,
        ])
        .setup(|app| {
            let open_item = MenuItemBuilder::with_id("open", "Open MoonTranslator").build(app)?;
            let settings_item = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
            let update_item =
                MenuItemBuilder::with_id("check_update", "Check for Updates").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&open_item)
                .item(&settings_item)
                .separator()
                .item(&update_item)
                .separator()
                .item(&quit_item)
                .build()?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("MoonTranslator")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        show_and_focus_window(app, "main");
                    }
                    "settings" => {
                        show_and_focus_window(app, "main");
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window
                                .eval("window.location.hash = '#settings'")
                                .inspect_err(|e| log::warn!("Failed to eval: {e}"));
                        }
                    }
                    "check_update" => {
                        show_and_focus_window(app, "main");
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window
                                .emit("check-update", ())
                                .inspect_err(|e| log::warn!("Failed to emit event: {e}"));
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_and_focus_window(tray.app_handle(), "main");
                    }
                })
                .build(app)?;

            setup_global_shortcut(app.handle())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window
                        .hide()
                        .inspect_err(|e| log::warn!("Failed to hide main window: {e}"));
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_global_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.clone();

    std::thread::spawn(move || {
        use rdev::{listen, EventType, Key};
        let mut ctrl_down = false;

        if let Err(e) = listen(move |event| match event.event_type {
            EventType::KeyPress(Key::ControlLeft)
            | EventType::KeyPress(Key::ControlRight)
            | EventType::KeyPress(Key::MetaLeft)
            | EventType::KeyPress(Key::MetaRight) => {
                ctrl_down = true;
            }
            EventType::KeyRelease(Key::ControlLeft)
            | EventType::KeyRelease(Key::ControlRight)
            | EventType::KeyRelease(Key::MetaLeft)
            | EventType::KeyRelease(Key::MetaRight) => {
                ctrl_down = false;
            }
            EventType::KeyPress(Key::KeyC) => {
                if ctrl_down {
                    let now = std::time::Instant::now();
                    let mut trigger = false;

                    if let Some(state_mutex) = app_handle.try_state::<Mutex<CtrlCState>>() {
                        if let Ok(mut state) = state_mutex.lock() {
                            if let Some(last) = state.last_press {
                                if now.duration_since(last).as_millis() < DOUBLE_PRESS_TIMEOUT_MS {
                                    trigger = true;
                                    state.last_press = None;
                                } else {
                                    state.last_press = Some(now);
                                }
                            } else {
                                state.last_press = Some(now);
                            }
                        }
                    }

                    if trigger {
                        let ah = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(e) = open_popup(&ah).await {
                                log::error!("Failed to open popup: {e}");
                            }
                        });
                    }
                }
            }
            _ => {}
        }) {
            log::error!("Global shortcut listener crashed: {:?}", e);
        }
    });

    Ok(())
}

async fn open_popup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let (x, y) = commands::cursor::get_cursor_pos();

    if let Some(popup) = app.get_webview_window("popup") {
        let _ = popup
            .set_position(tauri::PhysicalPosition::new(
                x - CURSOR_OFFSET_X,
                y - CURSOR_OFFSET_Y,
            ))
            .inspect_err(|e| log::warn!("Failed to position popup: {e}"));
        let _ = popup
            .show()
            .inspect_err(|e| log::warn!("Failed to show popup: {e}"));
        let _ = popup
            .set_focus()
            .inspect_err(|e| log::warn!("Failed to focus popup: {e}"));
        let _ = popup
            .emit("popup-refresh", ())
            .inspect_err(|e| log::warn!("Failed to emit refresh: {e}"));
        return Ok(());
    }

    let popup = WebviewWindowBuilder::new(app, "popup", WebviewUrl::App("popup".into()))
        .title("")
        .inner_size(POPUP_WIDTH, POPUP_HEIGHT)
        .min_inner_size(320.0, 180.0)
        .position((x - CURSOR_OFFSET_X) as f64, (y - CURSOR_OFFSET_Y) as f64)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(true)
        .transparent(true)
        .shadow(false)
        .build()?;

    let _ = popup
        .set_focus()
        .inspect_err(|e| log::warn!("Failed to focus new popup: {e}"));

    Ok(())
}
