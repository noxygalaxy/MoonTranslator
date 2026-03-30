use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CursorPosition {
    pub x: i32,
    pub y: i32,
}

#[tauri::command]
pub fn get_cursor_position() -> Result<CursorPosition, String> {
    let (x, y) = get_cursor_pos();
    Ok(CursorPosition { x, y })
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
