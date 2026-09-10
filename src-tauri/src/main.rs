#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::Serialize;
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Emitter;

const MAX_BYTES: u64 = 10 * 1024 * 1024;
#[derive(Default)]
struct Document {
    path: Option<PathBuf>,
    saved: Option<String>,
}
#[derive(Serialize)]
struct Loaded {
    name: String,
    text: String,
}
fn filename(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned()
}
fn read_document(path: &Path) -> Result<String, String> {
    let file = fs::File::open(path).map_err(|_| {
        "The file could not be opened. Check that it exists and that you have permission."
    })?;
    if !file
        .metadata()
        .map_err(|_| "Could not inspect the file.")?
        .is_file()
    {
        return Err("Please select a regular Markdown file.".into());
    }
    let mut bytes = Vec::new();
    file.take(MAX_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "Could not read the file.")?;
    if bytes.len() as u64 > MAX_BYTES {
        return Err("This prototype supports files up to 10 MB.".into());
    }
    String::from_utf8(bytes).map_err(|_| {
        "This file is not valid UTF-8 text. Convert its encoding before opening it.".into()
    })
}
fn valid_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .is_some_and(|s| s.eq_ignore_ascii_case("md") || s.eq_ignore_ascii_case("markdown"))
}
fn atomic_write(path: &Path, text: &str) -> Result<(), String> {
    let parent = path.parent().ok_or("Invalid save location.")?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)
        .map_err(|_| "Cannot write in that folder. Choose another save location.")?;
    if let Ok(meta) = fs::metadata(path) {
        temporary
            .as_file()
            .set_permissions(meta.permissions())
            .map_err(|_| "Could not preserve file permissions.")?;
    }
    temporary
        .write_all(text.as_bytes())
        .map_err(|_| "Saving failed. Your original file was not replaced.")?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|_| "Could not finish writing. Your original file was not replaced.")?;
    temporary
        .persist(path)
        .map_err(|_| "Could not replace the file. Your edits remain in Plainleaf; try Save As.")?;
    Ok(())
}
fn ensure_original_unchanged(path: &Path, expected: Option<&str>) -> Result<(), String> {
    if path.is_symlink() {
        return Err(
            "The file changed into a symbolic link. Use Save As to preserve your edits.".into(),
        );
    }
    let current = read_document(path)
        .map_err(|_| "The original file is unavailable. Use Save As to preserve your edits.")?;
    if Some(current.as_str()) != expected {
        return Err("This file changed outside Plainleaf. Use Save As to keep your edits in a separate file, or reopen it to load the external changes.".into());
    }
    Ok(())
}
#[tauri::command]
fn new_document(state: tauri::State<Mutex<Document>>) -> Result<(), String> {
    *state.lock().map_err(|_| "Document is busy.")? = Document::default();
    Ok(())
}
#[tauri::command]
async fn open_document(state: tauri::State<'_, Mutex<Document>>) -> Result<Option<Loaded>, String> {
    let selected = rfd::AsyncFileDialog::new()
        .add_filter("Markdown", &["md", "markdown"])
        .pick_file()
        .await;
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = fs::canonicalize(selected.path())
        .map_err(|_| "The selected file is no longer available.")?;
    if !valid_extension(&path) {
        return Err("Please choose a .md or .markdown file.".into());
    }
    let text = read_document(&path)?;
    let name = filename(&path);
    *state.lock().map_err(|_| "Document is busy.")? = Document {
        path: Some(path),
        saved: Some(text.clone()),
    };
    Ok(Some(Loaded { name, text }))
}
#[tauri::command]
async fn save_document(
    text: String,
    save_as: bool,
    state: tauri::State<'_, Mutex<Document>>,
) -> Result<Option<String>, String> {
    if text.len() as u64 > MAX_BYTES {
        return Err("This prototype supports files up to 10 MB.".into());
    }
    let (old_path, old_text) = {
        let doc = state.lock().map_err(|_| "Document is busy.")?;
        (doc.path.clone(), doc.saved.clone())
    };
    let choosing = save_as || old_path.is_none();
    let path = if choosing {
        let selected = rfd::AsyncFileDialog::new()
            .add_filter("Markdown", &["md", "markdown"])
            .set_file_name(
                old_path
                    .as_ref()
                    .map(|p| filename(p))
                    .unwrap_or("Untitled.md".into()),
            )
            .save_file()
            .await;
        let Some(selected) = selected else {
            return Ok(None);
        };
        // Never change the selected filename after the native overwrite confirmation.
        let path = selected.path().to_path_buf();
        if !valid_extension(&path) {
            return Err("Save using the .md or .markdown extension.".into());
        }
        if path.is_symlink() {
            return Err(
                "Saving over a symbolic link is not supported. Choose another file.".into(),
            );
        }
        path
    } else {
        old_path.clone().unwrap()
    };
    if old_path.as_ref() == Some(&path) {
        ensure_original_unchanged(&path, old_text.as_deref())?;
    }
    atomic_write(&path, &text)?;
    let name = filename(&path);
    *state.lock().map_err(|_| "Document is busy.")? = Document {
        path: Some(path),
        saved: Some(text),
    };
    Ok(Some(name))
}
#[tauri::command]
fn finish_quit(app: tauri::AppHandle) {
    app.exit(0);
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(Document::default()))
        .invoke_handler(tauri::generate_handler![
            new_document,
            open_document,
            save_document,
            finish_quit
        ])
        .build(tauri::generate_context!())
        .expect("Unable to start Plainleaf")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                    let _ = app.emit("request-quit", ());
                }
            }
        });
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn round_trip_and_permissions() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("hello.md");
        atomic_write(&path, "# Hi\r\n\nCafé 🌿").unwrap();
        assert_eq!(read_document(&path).unwrap(), "# Hi\r\n\nCafé 🌿");
        atomic_write(&path, "replaced").unwrap();
        assert_eq!(read_document(&path).unwrap(), "replaced");
    }
    #[test]
    fn invalid_utf8_rejected() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("invalid.md");
        fs::write(&path, [0xff]).unwrap();
        assert!(read_document(&path).is_err());
    }
    #[test]
    fn extensions_are_checked() {
        assert!(valid_extension(Path::new("README.MD")));
        assert!(!valid_extension(Path::new("data.exe")));
    }
    #[test]
    fn failed_save_preserves_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("original.md");
        fs::write(&path, "original").unwrap();
        assert!(atomic_write(&dir.path().join("absent/file.md"), "changed").is_err());
        assert_eq!(read_document(&path).unwrap(), "original");
    }
    #[test]
    fn unchanged_original_can_be_saved() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("draft.md");
        fs::write(&path, "original").unwrap();
        assert!(ensure_original_unchanged(&path, Some("original")).is_ok());
    }
    #[test]
    fn external_change_is_rejected_without_overwriting() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("draft.md");
        fs::write(&path, "external version").unwrap();
        let error = ensure_original_unchanged(&path, Some("version Plainleaf opened"))
            .expect_err("external change should be rejected");
        assert!(error.contains("changed outside Plainleaf"));
        assert_eq!(read_document(&path).unwrap(), "external version");
    }
    #[test]
    fn missing_original_requires_save_as() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("missing.md");
        let error = ensure_original_unchanged(&path, Some("old"))
            .expect_err("missing original should be rejected");
        assert!(error.contains("original file is unavailable"));
    }
}
