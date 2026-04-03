use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub download_url: String,
    pub changelog: String,
}

#[tauri::command]
pub async fn download_and_install_update(
    app: AppHandle,
    version: String,
    download_url: String,
) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let zip_path = temp_dir.join(format!("MoonTranslator-{}.zip", version));

    let response = reqwest::get(&download_url)
        .await
        .map_err(|e| format!("Failed to download update: {}", e))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read update data: {}", e))?;

    std::fs::write(&zip_path, bytes)
        .map_err(|e| format!("Failed to save update file: {}", e))?;

    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Failed to get current exe path: {}", e))?;
    let app_dir = current_exe
        .parent()
        .ok_or("Failed to get app directory")?
        .to_path_buf();

    let script_path = temp_dir.join("update_moontranslator.ps1");
    let script_content = format!(
        r#"
Clear-Host
$host.UI.RawUI.WindowTitle = "MoonTranslator Update"

$supportsRGB = $PSVersionTable.PSVersion.Major -ge 6

if ($supportsRGB) {{
    $InfoPrefix = "`e[38;2;200;162;200m"
    $SepPrefix = "`e[38;2;150;150;150m"
    $ErrorPrefix = "`e[38;2;255;120;120m"
    $ResetColor = "`e[0m"
}} else {{
    $InfoColor = [System.ConsoleColor]::Magenta
    $SepColor = [System.ConsoleColor]::DarkGray
    $ErrorColor = [System.ConsoleColor]::Red
}}

function Write-Log {{
    param([string]$Level, [string]$Message)
    if ($supportsRGB) {{
        if ($Level -eq "INFO") {{
            Write-Host "$($InfoPrefix)INFO$($ResetColor)$($SepPrefix) | $($ResetColor)$Message"
        }} else {{
            Write-Host "$($ErrorPrefix)ERROR$($ResetColor)$($SepPrefix) | $($ResetColor)$Message"
        }}
    }} else {{
        if ($Level -eq "INFO") {{
            Write-Host "INFO" -ForegroundColor $InfoColor -NoNewline
            Write-Host " | " -ForegroundColor $SepColor -NoNewline
            Write-Host $Message
        }} else {{
            Write-Host "ERROR" -ForegroundColor $ErrorColor -NoNewline
            Write-Host " | " -ForegroundColor $SepColor -NoNewline
            Write-Host $Message
        }}
    }}
}}

$zipPath = "{}"
$appDir = "{}"

try {{
    Write-Log "INFO" "Waiting for MoonTranslator to close..."
    Start-Sleep -Seconds 2
    
    Write-Log "INFO" "Extracting update package to temp directory..."
    
    $extractFolder = Join-Path $env:TEMP "MoonTranslator_Update_$(Get-Date -Format 'yyyyMMddHHmmss')"
    Expand-Archive -Path $zipPath -DestinationPath $extractFolder -Force
    
    Write-Log "INFO" "Extraction completed successfully"
    
    Write-Log "INFO" "Verifying extracted files..."
    
    $exePath = Join-Path $extractFolder "MoonTranslator.exe"
    $altExePath = Join-Path $extractFolder "moon-translator.exe"
    
    if (Test-Path $exePath) {{
        Write-Log "INFO" "Found MoonTranslator.exe in extracted files"
    }} elseif (Test-Path $altExePath) {{
        Write-Log "INFO" "Found moon-translator.exe, renaming to MoonTranslator.exe"
        Rename-Item -Path $altExePath -NewName "MoonTranslator.exe"
    }} else {{
        $extractedFiles = Get-ChildItem -Path $extractFolder -Recurse -File | Select-Object -First 10
        Write-Log "ERROR" "MoonTranslator.exe not found in extracted files"
        Write-Log "ERROR" "Files found: $($extractedFiles.Name -join ', ')"
        throw "MoonTranslator.exe not found in extracted files"
    }}
    
    Write-Log "INFO" "Installing new version to: $appDir"
    Copy-Item -Path "$extractFolder\*" -Destination $appDir -Recurse -Force
    Write-Log "INFO" "Installation completed successfully"
    
    Write-Log "INFO" "Cleaning up temporary files..."
    Remove-Item -Path $extractFolder -Recurse -Force
    
    Write-Log "INFO" "Removing downloaded zip file..."
    Remove-Item -Path $zipPath -Force
    
    Write-Log "INFO" "Restarting MoonTranslator..."
    Start-Sleep -Seconds 1
    Start-Process -FilePath (Join-Path $appDir "MoonTranslator.exe")
    
    Write-Log "INFO" "Update completed successfully!"
    Start-Sleep -Seconds 2
}} catch {{
    Write-Host ""
    Write-Log "ERROR" "Update failed: $_"
    Write-Host ""
    pause
}}
"#,
        zip_path.display().to_string().replace("\\", "\\\\"),
        app_dir.display().to_string().replace("\\", "\\\\")
    );

    std::fs::write(&script_path, script_content)
        .map_err(|e| format!("Failed to create update script: {}", e))?;

    std::process::Command::new("powershell")
        .arg("-NoLogo")
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-File")
        .arg(&script_path)
        .spawn()
        .map_err(|e| format!("Failed to start update process: {}", e))?;

    app.exit(0);

    Ok(())
}
