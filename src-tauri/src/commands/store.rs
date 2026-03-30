use std::fs;
use std::path::PathBuf;

fn get_settings_path() -> PathBuf {
    std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap()
        .join("settings.json")
}

#[tauri::command]
pub fn save_settings(payload: String) -> Result<(), String> {
    fs::write(get_settings_path(), payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_settings() -> Result<String, String> {
    fs::read_to_string(get_settings_path()).map_err(|_e| "".to_string())
}
