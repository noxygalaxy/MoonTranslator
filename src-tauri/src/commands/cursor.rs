use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CursorPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Copy)]
pub struct ScreenBounds {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
    pub scale_factor: f64,
}

#[tauri::command]
pub fn get_cursor_position() -> Result<CursorPosition, String> {
    let (x, y) = get_cursor_pos();
    Ok(CursorPosition { x, y })
}

#[cfg(target_os = "windows")]
pub fn get_caret_pos() -> Option<(i32, i32)> {
    use std::mem::{size_of, zeroed};
    use windows::Win32::Foundation::POINT;
    use windows::Win32::Graphics::Gdi::ClientToScreen;
    use windows::Win32::UI::WindowsAndMessaging::{GetGUIThreadInfo, GUITHREADINFO};

    unsafe {
        let mut gti: GUITHREADINFO = zeroed();
        gti.cbSize = size_of::<GUITHREADINFO>() as u32;

        if GetGUIThreadInfo(0, &mut gti).is_ok() && !gti.hwndCaret.is_invalid() {
            let mut pt = POINT {
                x: gti.rcCaret.left,
                y: gti.rcCaret.bottom,
            };

            if ClientToScreen(gti.hwndCaret, &mut pt).as_bool() {
                if pt.x != 0 || pt.y != 0 {
                    return Some((pt.x, pt.y));
                }
            }
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
pub fn get_caret_pos() -> Option<(i32, i32)> {
    None
}

#[cfg(target_os = "windows")]
pub fn get_cursor_pos() -> (i32, i32) {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        let _ = GetCursorPos(&mut point);
    }
    (point.x, point.y)
}

#[cfg(not(target_os = "windows"))]
pub fn get_cursor_pos() -> (i32, i32) {
    (500, 500)
}

#[cfg(target_os = "windows")]
pub fn get_screen_bounds(x: i32, y: i32) -> ScreenBounds {
    use windows::Win32::Foundation::{POINT, RECT};
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};

    unsafe {
        let pt = POINT { x, y };
        let monitor = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        let mut mi: MONITORINFO = std::mem::zeroed();
        mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;

        let mut dpi_x = 96;
        let mut dpi_y = 96;
        let _ = GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y);
        let scale_factor = (dpi_x as f64 / 96.0).max(1.0);

        if GetMonitorInfoW(monitor, &mut mi).as_bool() {
            let rc: RECT = mi.rcWork;
            return ScreenBounds {
                left: rc.left,
                top: rc.top,
                right: rc.right,
                bottom: rc.bottom,
                scale_factor,
            };
        }
    }

    ScreenBounds {
        left: 0,
        top: 0,
        right: 1920,
        bottom: 1080,
        scale_factor: 1.0,
    }
}

#[cfg(not(target_os = "windows"))]
pub fn get_screen_bounds(_x: i32, _y: i32) -> ScreenBounds {
    ScreenBounds {
        left: 0,
        top: 0,
        right: 1920,
        bottom: 1080,
        scale_factor: 1.0,
    }
}
