#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::Serialize;
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Emitter;
#[cfg(target_os = "macos")]
use tauri::Manager;

const MAX_BYTES: u64 = 10 * 1024 * 1024;
#[derive(Default)]
struct Document {
    path: Option<PathBuf>,
    saved: Option<String>,
}
#[derive(Serialize, Debug)]
struct Loaded {
    name: String,
    text: String,
}
/// A file handed to Plainleaf from outside the app (Finder double-click, "Open
/// With", or a drag onto the icon) that has passed the same validation as the
/// in-app Open command but has not yet been shown to the user.
struct PendingOpen {
    id: u64,
    path: PathBuf,
    text: String,
    name: String,
}
#[derive(Serialize)]
struct PendingInfo {
    id: u64,
    name: String,
}
/// Tracks an external open request across the round trip to the frontend:
/// `pending` holds a candidate nobody has looked at yet; `awaiting` holds the
/// one candidate currently shown in the unsaved-changes prompt. The active
/// `Document` is only ever replaced once that candidate is explicitly
/// accepted, so a cancelled or stale request can never change it.
#[derive(Default)]
struct OpenState {
    pending: Option<PendingOpen>,
    awaiting: Option<PendingOpen>,
    next_id: u64,
}
impl OpenState {
    /// Stage a freshly validated external file, replacing any earlier
    /// candidate nobody claimed yet. Only the most recent external open
    /// request is ever offered to the user.
    fn stage(&mut self, path: PathBuf, text: String, name: String) {
        self.next_id += 1;
        self.pending = Some(PendingOpen {
            id: self.next_id,
            path,
            text,
            name,
        });
    }
    /// Claim the staged candidate, if any, moving it to `awaiting`. Returns
    /// `None` if there is nothing new (including when it was already
    /// claimed), so calling this more than once for the same candidate is
    /// always safe.
    fn take(&mut self) -> Option<PendingInfo> {
        let candidate = self.pending.take()?;
        let info = PendingInfo {
            id: candidate.id,
            name: candidate.name.clone(),
        };
        self.awaiting = Some(candidate);
        Some(info)
    }
    /// Consume the awaiting candidate if `id` matches what is actually
    /// awaiting a decision. A mismatched or missing id (a stale response, or
    /// one already resolved) is rejected and leaves `awaiting` untouched.
    fn accept(&mut self, id: u64) -> Result<PendingOpen, String> {
        match self.awaiting.take() {
            Some(candidate) if candidate.id == id => Ok(candidate),
            Some(other) => {
                self.awaiting = Some(other);
                Err("That file is no longer waiting to open.".into())
            }
            None => Err("That file is no longer waiting to open.".into()),
        }
    }
    /// Clear the awaiting candidate on Cancel. A mismatched or already
    /// resolved id is a harmless no-op.
    fn reject(&mut self, id: u64) {
        if matches!(&self.awaiting, Some(candidate) if candidate.id == id) {
            self.awaiting = None;
        }
    }
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
/// Validate a file handed to us from outside the app using exactly the same
/// rules as the in-app Open command: canonicalize, check the extension, then
/// read it under the same size/UTF-8/regular-file checks.
fn validate_incoming(path: &Path) -> Result<(PathBuf, String, String), String> {
    let path = fs::canonicalize(path).map_err(|_| "The file is no longer available.".to_string())?;
    if !valid_extension(&path) {
        return Err("Please open a .md or .markdown file.".into());
    }
    let text = read_document(&path)?;
    let name = filename(&path);
    Ok((path, text, name))
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
/// Finish accepting a pending external open: consume the awaiting candidate
/// (rejecting a stale or mismatched id without side effects) and only then
/// replace the active document. Kept as a plain function, independent of
/// `tauri::State`, so it can be unit tested directly.
fn promote_pending(open: &mut OpenState, doc: &mut Document, id: u64) -> Result<Loaded, String> {
    let candidate = open.accept(id)?;
    *doc = Document {
        path: Some(candidate.path),
        saved: Some(candidate.text.clone()),
    };
    Ok(Loaded {
        name: candidate.name,
        text: candidate.text,
    })
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
/// Called once on frontend mount, after the `open-requested` listener is
/// registered, to pick up a file that arrived from the OS before the
/// listener existed (a cold launch race). Also called whenever
/// `open-requested` fires while the app is already running. Safe to call
/// repeatedly: it only ever returns a given candidate once.
#[tauri::command]
fn take_pending_open(open_state: tauri::State<Mutex<OpenState>>) -> Result<Option<PendingInfo>, String> {
    Ok(open_state.lock().map_err(|_| "Document is busy.")?.take())
}
/// Promote the awaiting candidate into the active document, after the
/// frontend's unsaved-changes prompt has been resolved in its favor.
#[tauri::command]
fn accept_pending_open(
    id: u64,
    open_state: tauri::State<Mutex<OpenState>>,
    state: tauri::State<Mutex<Document>>,
) -> Result<Loaded, String> {
    let mut open = open_state.lock().map_err(|_| "Document is busy.")?;
    let mut doc = state.lock().map_err(|_| "Document is busy.")?;
    promote_pending(&mut open, &mut doc, id)
}
/// Cancel an awaiting candidate without changing the active document.
#[tauri::command]
fn reject_pending_open(id: u64, open_state: tauri::State<Mutex<OpenState>>) -> Result<(), String> {
    open_state.lock().map_err(|_| "Document is busy.")?.reject(id);
    Ok(())
}
/// Handle a macOS "open documents" event (Finder double-click, Open With, or
/// a drag onto the Dock icon) for both cold launch and an already-running
/// app. Only the first url is handled; any others are ignored rather than
/// silently overwriting a succession of documents. The active document is
/// never touched here -- the candidate is only staged, and the frontend must
/// run its unsaved-changes prompt and explicitly accept it first.
#[cfg(target_os = "macos")]
fn handle_opened_urls(app: &tauri::AppHandle, urls: Vec<tauri::Url>) {
    let Some(url) = urls.into_iter().next() else {
        return;
    };
    let Ok(path) = url.to_file_path() else {
        return;
    };
    match validate_incoming(&path) {
        Ok((path, text, name)) => {
            if let Some(open_state) = app.try_state::<Mutex<OpenState>>() {
                if let Ok(mut open) = open_state.lock() {
                    open.stage(path, text, name);
                }
            }
            let _ = app.emit("open-requested", ());
        }
        Err(message) => {
            let _ = app.emit("open-request-failed", message);
        }
    }
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(Document::default()))
        .manage(Mutex::new(OpenState::default()))
        .invoke_handler(tauri::generate_handler![
            new_document,
            open_document,
            save_document,
            finish_quit,
            take_pending_open,
            accept_pending_open,
            reject_pending_open
        ])
        .build(tauri::generate_context!())
        .expect("Unable to start Plainleaf")
        .run(|app, event| match event {
            tauri::RunEvent::ExitRequested { api, code, .. } => {
                if code.is_none() {
                    api.prevent_exit();
                    let _ = app.emit("request-quit", ());
                }
            }
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Opened { urls } => handle_opened_urls(app, urls),
            _ => {}
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
    #[test]
    fn invalid_or_missing_incoming_files_are_rejected() {
        assert!(validate_incoming(Path::new("/does/not/exist-plainleaf-fixture.md")).is_err());
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("data.exe");
        fs::write(&path, "hello").unwrap();
        assert!(validate_incoming(&path).is_err());
    }
    #[test]
    fn pending_open_is_claimed_exactly_once() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        fs::write(&path, "hello").unwrap();
        let mut open = OpenState::default();
        assert!(open.take().is_none());
        let (canon, text, name) = validate_incoming(&path).unwrap();
        open.stage(canon, text, name);
        let info = open
            .take()
            .expect("a freshly staged candidate should be claimable");
        assert_eq!(info.name, "note.md");
        assert!(
            open.take().is_none(),
            "a second take must not resurface an already-claimed candidate"
        );
    }
    #[test]
    fn staging_a_new_candidate_replaces_an_unclaimed_one() {
        let dir = tempfile::tempdir().unwrap();
        let first = dir.path().join("first.md");
        let second = dir.path().join("second.md");
        fs::write(&first, "first").unwrap();
        fs::write(&second, "second").unwrap();
        let mut open = OpenState::default();
        let (p1, t1, n1) = validate_incoming(&first).unwrap();
        open.stage(p1, t1, n1);
        let (p2, t2, n2) = validate_incoming(&second).unwrap();
        open.stage(p2, t2, n2);
        let info = open.take().expect("the most recent candidate is offered");
        assert_eq!(info.name, "second.md");
    }
    #[test]
    fn accepting_pending_open_promotes_the_active_document() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        fs::write(&path, "hello there").unwrap();
        let mut open = OpenState::default();
        let mut doc = Document::default();
        let (canon, text, name) = validate_incoming(&path).unwrap();
        open.stage(canon.clone(), text.clone(), name);
        let info = open.take().unwrap();
        let loaded = promote_pending(&mut open, &mut doc, info.id).unwrap();
        assert_eq!(loaded.text, "hello there");
        assert_eq!(doc.path.as_deref(), Some(canon.as_path()));
        assert_eq!(doc.saved.as_deref(), Some(text.as_str()));
    }
    #[test]
    fn stale_accept_id_is_rejected_without_changing_the_document() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        fs::write(&path, "hello").unwrap();
        let mut open = OpenState::default();
        let mut doc = Document {
            path: Some(dir.path().join("current.md")),
            saved: Some("current text".into()),
        };
        let (canon, text, name) = validate_incoming(&path).unwrap();
        open.stage(canon, text, name);
        let info = open.take().unwrap();
        let error = promote_pending(&mut open, &mut doc, info.id + 1)
            .expect_err("a mismatched id should be rejected");
        assert!(error.contains("no longer waiting"));
        assert_eq!(doc.saved.as_deref(), Some("current text"));
    }
    #[test]
    fn rejecting_pending_open_clears_it_without_touching_the_document() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        fs::write(&path, "hello").unwrap();
        let mut open = OpenState::default();
        let (canon, text, name) = validate_incoming(&path).unwrap();
        open.stage(canon, text, name);
        let info = open.take().unwrap();
        open.reject(info.id);
        let mut doc = Document {
            path: None,
            saved: None,
        };
        let error = promote_pending(&mut open, &mut doc, info.id)
            .expect_err("a rejected candidate cannot later be accepted");
        assert!(error.contains("no longer waiting"));
        assert!(doc.path.is_none());
        assert!(doc.saved.is_none());
    }
}
