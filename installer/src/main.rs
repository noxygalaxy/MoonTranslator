#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use eframe::egui;
use std::path::Path;
use std::sync::{Arc, Mutex};

fn main() -> Result<(), eframe::Error> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([450.0, 350.0])
            .with_decorations(false)
            .with_transparent(true)
            .with_always_on_top(),
        ..Default::default()
    };
    
    eframe::run_native(
        "MoonTranslator Installer",
        options,
        Box::new(|cc| {
            let mut style = (*cc.egui_ctx.style()).clone();
            
            style.visuals.window_fill = egui::Color32::TRANSPARENT; 
            style.visuals.panel_fill = egui::Color32::TRANSPARENT;
            
            style.visuals.widgets.noninteractive.bg_fill = egui::Color32::from_rgb(45, 43, 49); 
            style.visuals.widgets.noninteractive.fg_stroke.color = egui::Color32::from_rgb(202, 196, 208); 
            
            style.visuals.selection.bg_fill = egui::Color32::from_rgb(208, 188, 255); 
            style.visuals.selection.stroke.color = egui::Color32::from_rgb(56, 30, 114); 
            
            cc.egui_ctx.set_style(style);
            Box::new(InstallerApp::new())
        }),
    )
}

struct InstallerState {
    progress: f32, 
    status_text: String,
    finished: bool,
    error: Option<String>,
}

struct InstallerApp {
    state: Arc<Mutex<InstallerState>>,
}

impl InstallerApp {
    fn new() -> Self {
        let state = Arc::new(Mutex::new(InstallerState {
            progress: 0.0,
            status_text: "Initializing...".into(),
            finished: false,
            error: None,
        }));
        
        let state_clone = state.clone();

        std::thread::spawn(move || {
            if let Err(e) = run_install(state_clone.clone()) {
                let mut s = state_clone.lock().unwrap();
                s.error = Some(e.to_string());
                s.status_text = "Installation failed.".into();
            }
        });
        
        Self { state }
    }
}

fn run_install(state: Arc<Mutex<InstallerState>>) -> Result<(), Box<dyn std::error::Error>> {
    let update = |p: f32, text: &str| {
        let mut s = state.lock().unwrap();
        s.progress = p;
        s.status_text = text.to_string();
    };

    update(0.1, "Fetching latest release data...");

    let client = reqwest::blocking::Client::builder().user_agent("MoonTranslator-Installer").build()?;
    let latest_url = "https://api.github.com/repos/noxygalaxy/MoonTranslator/releases/latest";
    let resp = client.get(latest_url).send()?.error_for_status()?;
    let json: serde_json::Value = resp.json()?;
    
    let mut zip_url = None;
    if let Some(assets) = json["assets"].as_array() {
        for asset in assets {
            if let Some(name) = asset["name"].as_str() {
                if name.ends_with("-portable.zip") {
                    zip_url = asset["browser_download_url"].as_str().map(String::from);
                    break;
                }
            }
        }
    }
    
    let download_url = zip_url.ok_or("Could not find suitable zip package in latest release.")?;

    update(0.3, "Downloading package...");

    let mut response = client.get(&download_url).send()?.error_for_status()?;
    let total_size = response.content_length().unwrap_or(30_000_000); 
    
    let mut downloaded = 0;
    let mut buffer = [0; 8192];
    let mut zip_data = Vec::new();
    
    use std::io::Read;
    while let Ok(n) = response.read(&mut buffer) {
        if n == 0 { break; }
        zip_data.extend_from_slice(&buffer[..n]);
        downloaded += n as u64;
        
        let progress = 0.3 + (downloaded as f32 / total_size as f32) * 0.4;
        update(progress, &format!("Downloading package... {:.1} MB", downloaded as f32 / 1_048_576.0));
    }
    
    update(0.7, "Extracting files...");

    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| String::from(r"C:\"));
    let install_dir = Path::new(&local_app_data).join("Programs").join("MoonTranslator");
    
    let settings_path = install_dir.join("settings.json");
    let mut settings_backup = None;
    if settings_path.exists() {
        settings_backup = std::fs::read(&settings_path).ok();
    }
    
    if install_dir.exists() {
        let _ = std::fs::remove_dir_all(&install_dir);
    }
    std::fs::create_dir_all(&install_dir)?;
    
    if let Some(data) = settings_backup {
        let _ = std::fs::write(&settings_path, data);
    }
    
    let reader = std::io::Cursor::new(zip_data);
    let mut archive = zip::ZipArchive::new(reader)?;
    
    let total_files = archive.len();
    for i in 0..total_files {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => install_dir.join(path),
            None => continue,
        };

        if (*file.name()).ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(&p)?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
        
        if i % 10 == 0 {
            let progress = 0.7 + (i as f32 / total_files as f32) * 0.25;
            update(progress, "Extracting files...");
        }
    }

    update(1.0, "Installation complete!");
    
    let mut s = state.lock().unwrap();
    s.finished = true;
    s.progress = 1.0;

    Ok(())
}

impl eframe::App for InstallerApp {
    fn clear_color(&self, _visuals: &egui::Visuals) -> [f32; 4] {
        egui::Rgba::TRANSPARENT.to_array()
    }

    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let state = self.state.lock().unwrap();
        
        egui::CentralPanel::default()
            .frame(egui::Frame::none()
                .fill(egui::Color32::from_rgb(33, 31, 38)) 
                .rounding(0.0)
                .inner_margin(egui::Margin::same(0.0)))
            .show(ctx, |ui| {
                
                let top_bar_rect = egui::Rect::from_min_size(
                    ui.min_rect().min,
                    egui::vec2(ui.available_width(), 48.0),
                );
                
                let response = ui.interact(top_bar_rect, ui.id().with("top_bar"), egui::Sense::click_and_drag());
                if response.dragged() {
                    ctx.send_viewport_cmd(egui::ViewportCommand::StartDrag);
                }

                ui.allocate_ui_at_rect(top_bar_rect, |ui| {
                    ui.add_space(8.0); 
                    ui.horizontal(|ui| {
                        ui.add_space(24.0);
                        ui.label(egui::RichText::new("MoonTranslator Installer").color(egui::Color32::from_rgb(230, 225, 229)).size(14.0).strong());
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            ui.add_space(16.0);
                            let close_btn = ui.add_sized([32.0, 32.0], egui::Button::new(
                                egui::RichText::new("X").size(16.0) 
                            ).fill(egui::Color32::TRANSPARENT).frame(false));
                            
                            if close_btn.clicked() {
                                ctx.send_viewport_cmd(egui::ViewportCommand::Close);
                            }
                            if close_btn.hovered() {
                                ctx.set_cursor_icon(egui::CursorIcon::PointingHand);
                            }
                        });
                    });
                });

                ui.add_space(60.0);

                ui.vertical_centered(|ui| {
                    ui.label(
                        egui::RichText::new(if state.finished { "Done!" } else if state.error.is_some() { "Error" } else { "Installing..." })
                            .size(24.0)
                            .color(egui::Color32::from_rgb(230, 225, 229))
                    );
                    
                    ui.add_space(8.0);
                    
                    ui.label(
                        egui::RichText::new(&state.status_text)
                            .size(14.0)
                            .color(if state.error.is_some() { egui::Color32::from_rgb(255, 180, 171) } else { egui::Color32::from_rgb(147, 143, 153) })
                    );

                    ui.add_space(50.0);

                    let bar = egui::ProgressBar::new(state.progress)
                        .show_percentage()
                        .animate(true);
                    
                    ui.add_sized([300.0, 20.0], bar);
                    
                    if state.finished {
                        ui.add_space(30.0);
                        if ui.add_sized([120.0, 36.0], egui::Button::new("Finish")).clicked() {
                            ctx.send_viewport_cmd(egui::ViewportCommand::Close);
                        }
                    } else if let Some(err_msg) = &state.error {
                        ui.add_space(30.0);
                        if ui.add_sized([200.0, 36.0], egui::Button::new("Copy Log & Report Issue")).clicked() {
                            let log_text = format!("MoonTranslator Installation Error:\n\n{}", err_msg);
                            ui.ctx().output_mut(|o| o.copied_text = log_text);
                            ui.ctx().output_mut(|o| {
                                o.open_url = Some(egui::output::OpenUrl::new_tab("https://github.com/noxygalaxy/MoonTranslator/issues/new"));
                            });
                        }
                    }
                });
            });
            
        ctx.request_repaint();
    }
}