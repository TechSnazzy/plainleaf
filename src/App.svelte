<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke, isTauri } from '@tauri-apps/api/core';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { listen } from '@tauri-apps/api/event';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import type { EditorView } from '@codemirror/view';
  import { openSearchPanel } from '@codemirror/search';
  import Editor from './Editor.svelte';
  import Icon from './Icon.svelte';
  import RichEditor, { type RichHandle } from './RichEditor.svelte';
  import {
    isDirty,
    wordCount,
    validTheme,
    type Mode,
    type Theme,
  } from './lib/document';
  type Loaded = { text: string; name: string };
  type PendingInfo = { id: number; name: string };
  let text = $state(''),
    saved = $state(''),
    name = $state('Untitled');
  let mode = $state<Mode>('read'),
    theme = $state<Theme>('system'),
    systemDark = $state(false);
  let sample = $state(false),
    revision = $state(0),
    busy = $state(false);
  let error = $state(''),
    prompt = $state(false),
    zoom = $state(18),
    query = $state(''),
    showFind = $state(false);
  type ToolbarDisplay = 'icons' | 'both' | 'labels';
  let toolbarDisplay = $state<ToolbarDisplay>('icons');
  let settings = $state(false);
  let headerMenu = $state(false);
  const formats = [
    ['bold', 'Bold'],
    ['italic', 'Italic'],
    ['heading1', 'Heading 1'],
    ['heading2', 'Heading 2'],
    ['heading3', 'Heading 3'],
    ['link', 'Link'],
    ['bullet', 'Bullet list'],
    ['ordered', 'Numbered list'],
    ['task', 'Task list'],
    ['quote', 'Quote'],
    ['code', 'Inline code'],
    ['fence', 'Code block'],
  ];
  function setToolbarDisplay(value: ToolbarDisplay) {
    toolbarDisplay = value;
    try {
      localStorage.setItem('plainleaf.toolbarDisplay', value);
    } catch {}
  }
  function dismissPopovers(e: PointerEvent) {
    if (!(e.target instanceof Element) || e.target.closest('[data-popover]'))
      return;
    settings = headerMenu = false;
  }
  let editor: EditorView | undefined;
  let rich: RichHandle | undefined;
  let syncingSource = false;
  let answer: ((v: 'save' | 'discard' | 'cancel') => void) | undefined;
  let fileInput: HTMLInputElement;
  function mountDialog(node: HTMLDialogElement) {
    node.showModal();
    node.querySelector<HTMLButtonElement>('button')?.focus();
  }
  let reader: HTMLElement;
  const native = isTauri();
  const dirty = $derived(isDirty(text, saved));
  const dark = $derived(theme === 'dark' || (theme === 'system' && systemDark));
  $effect(() => {
    if (native)
      void getCurrentWindow()
        .setTitle(`${dirty ? '• ' : ''}${name} — Plainleaf`)
        .catch(() => {});
  });
  function setTheme(t: Theme) {
    theme = t;
    try {
      localStorage.setItem('plainleaf.theme', t);
    } catch {}
  }
  function reset(doc: Loaded, asSample = false) {
    text = saved = doc.text;
    name = doc.name;
    sample = asSample;
    mode = 'read';
    revision++;
    editor = undefined;
    rich = undefined;
    error = '';
    query = '';
  }
  async function save(as = false): Promise<boolean> {
    const snapshot = text;
    try {
      if (native) {
        const result = await invoke<string | null>('save_document', {
          text: snapshot,
          saveAs: as || sample,
        });
        if (!result) return false;
        name = result;
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(
          new Blob([snapshot], { type: 'text/markdown;charset=utf-8' }),
        );
        a.download = sample || name === 'Untitled' ? 'Untitled.md' : name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      saved = snapshot;
      sample = false;
      return true;
    } catch (e) {
      error = String(e);
      return false;
    }
  }
  async function permit(): Promise<boolean> {
    if (!dirty) return true;
    const choice = await new Promise<'save' | 'discard' | 'cancel'>(
      (resolve) => {
        answer = resolve;
        prompt = true;
      },
    );
    prompt = false;
    return choice === 'discard' || (choice === 'save' && (await save()));
  }
  async function action(task: () => Promise<void>) {
    if (busy || prompt) return;
    busy = true;
    try {
      await task();
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }
  async function newDocument() {
    await action(async () => {
      if (!(await permit())) return;
      if (native) await invoke('new_document');
      reset({ text: '', name: 'Untitled' });
      sample = false;
      requestAnimationFrame(() => rich?.focus());
    });
  }
  async function openDocument() {
    await action(async () => {
      if (!(await permit())) return;
      if (native) {
        const doc = await invoke<Loaded | null>('open_document');
        if (doc) reset(doc);
      } else fileInput.click();
    });
  }
  async function browserFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      error = 'This prototype supports documents up to 10 MB.';
      return;
    }
    reset({ text: await file.text(), name: file.name });
    fileInput.value = '';
  }
  let handlingExternalOpen = false;
  async function handleExternalOpen(info: PendingInfo) {
    await action(async () => {
      if (!(await permit())) {
        try {
          await invoke('reject_pending_open', { id: info.id });
        } catch {}
        return;
      }
      const doc = await invoke<Loaded>('accept_pending_open', { id: info.id });
      reset(doc);
    });
  }
  async function checkPendingOpen() {
    if (handlingExternalOpen) return;
    handlingExternalOpen = true;
    try {
      const info = await invoke<PendingInfo | null>('take_pending_open');
      if (info) await handleExternalOpen(info);
    } catch (e) {
      error = String(e);
    } finally {
      handlingExternalOpen = false;
    }
  }
  function toggle() {
    mode = mode === 'read' ? 'edit' : 'read';
    if (mode === 'edit') {
      if (editor && editor.state.sliceDoc() !== text) {
        syncingSource = true;
        editor.dispatch({
          changes: { from: 0, to: editor.state.doc.length, insert: text },
        });
        syncingSource = false;
      }
      requestAnimationFrame(() => {
        editor?.requestMeasure();
        editor?.focus();
      });
    } else {
      rich?.sync(text);
      requestAnimationFrame(() => rich?.focus());
    }
  }
  function format(kind: string) {
    if (mode === 'read') {
      rich?.format(kind);
      return;
    }
    if (!editor) return;
    const sel = editor.state.selection.main;
    const selected = editor.state.sliceDoc(sel.from, sel.to);
    const wrappers: Record<string, [string, string]> = {
      bold: ['**', '**'],
      italic: ['*', '*'],
      code: ['`', '`'],
      link: ['[', '](https://example.com)'],
      fence: ['```\n', '\n```'],
    };
    let from = sel.from,
      to = sel.to,
      insert: string;
    if (wrappers[kind]) {
      const [a, b] = wrappers[kind];
      insert = a + selected + b;
      editor.dispatch({
        changes: { from, to, insert },
        selection: {
          anchor: from + a.length,
          head: from + a.length + selected.length,
        },
      });
    } else {
      const start = editor.state.doc.lineAt(from).from,
        end = editor.state.doc.lineAt(to).to;
      const prefix: Record<string, string> = {
        heading1: '# ',
        heading2: '## ',
        heading3: '### ',
        bullet: '- ',
        ordered: '1. ',
        task: '- [ ] ',
        quote: '> ',
      };
      insert = editor.state
        .sliceDoc(start, end)
        .split('\n')
        .map((l) =>
          kind.startsWith('heading')
            ? prefix[kind] + l.replace(/^#{1,6}\s+/, '')
            : prefix[kind] + l,
        )
        .join('\n');
      editor.dispatch({ changes: { from: start, to: end, insert } });
    }
    editor.focus();
  }
  function keyboard(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showFind = false;
      settings = false;
      headerMenu = false;
    }
    if (!(e.metaKey || e.ctrlKey) || prompt || busy) return;
    switch (e.key.toLowerCase()) {
      case 's':
        e.preventDefault();
        void action(async () => {
          await save(e.shiftKey);
        });
        break;
      case 'o':
        e.preventDefault();
        void openDocument();
        break;
      case 'n':
        e.preventDefault();
        void newDocument();
        break;
      case 'r':
        e.preventDefault();
        toggle();
        break;
      case 'b':
        e.preventDefault();
        format('bold');
        break;
      case 'i':
        e.preventDefault();
        format('italic');
        break;
      case 'k':
        e.preventDefault();
        format('link');
        break;
      case 'f':
        e.preventDefault();
        if (mode === 'edit' && editor) openSearchPanel(editor);
        else showFind = !showFind;
        break;
      case '=':
      case '+':
        e.preventDefault();
        zoom = Math.min(64, zoom + 1);
        break;
      case '-':
        e.preventDefault();
        zoom = Math.max(14, zoom - 1);
        break;
    }
  }
  function readerClick(e: MouseEvent) {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;
    e.preventDefault();
    if (target.closest('[contenteditable="true"]') && !(e.metaKey || e.ctrlKey))
      return;
    const href = target.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) {
      if (native)
        void openUrl(href).catch(() => {
          error = 'Could not open this link.';
        });
      else window.open(href, '_blank', 'noopener,noreferrer');
    }
  }
  function findReader() {
    if (query)
      (window as unknown as { find: (q: string) => boolean }).find?.(query);
  }
  onMount(() => {
    try {
      theme = validTheme(localStorage.getItem('plainleaf.theme'));
      const display = localStorage.getItem('plainleaf.toolbarDisplay');
      if (display === 'icons' || display === 'both' || display === 'labels')
        toolbarDisplay = display;
    } catch {}
    const media = matchMedia('(prefers-color-scheme: dark)');
    systemDark = media.matches;
    const change = () => (systemDark = media.matches);
    media.addEventListener('change', change);
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    let unlisten: (() => void) | undefined;
    let unlistenQuit: (() => void) | undefined;
    let unlistenOpen: (() => void) | undefined;
    let unlistenOpenFailed: (() => void) | undefined;
    if (native)
      void listen('request-quit', () =>
        action(async () => {
          if (await permit()) await invoke('finish_quit');
        }),
      ).then((fn) => (unlistenQuit = fn));
    if (native)
      void getCurrentWindow()
        .onCloseRequested(async (e) => {
          e.preventDefault();
          await action(async () => {
            if (await permit()) await invoke('finish_quit');
          });
        })
        .then((fn) => (unlisten = fn));
    if (native) {
      // Register the listener before asking for any pending candidate, so a
      // file the OS handed us before this listener existed (a cold-launch
      // race) is still picked up by the immediate checkPendingOpen() call
      // below rather than lost.
      void listen('open-requested', () => {
        void checkPendingOpen();
      }).then((fn) => (unlistenOpen = fn));
      void listen<string>('open-request-failed', (e) => {
        error = e.payload;
      }).then((fn) => (unlistenOpenFailed = fn));
      void checkPendingOpen();
    }
    return () => {
      editor = undefined;
      rich = undefined;
      media.removeEventListener('change', change);
      window.removeEventListener('beforeunload', unload);
      unlisten?.();
      unlistenQuit?.();
      unlistenOpen?.();
      unlistenOpenFailed?.();
    };
  });
</script>

<svelte:window onkeydown={keyboard} onpointerdown={dismissPopovers} />
<div class:dark class="app" style:--reading-size={`${zoom}px`}>
  <header class="app-header" data-display={toolbarDisplay}>
    <div class="document-tools tool-group" role="group" aria-label="Document">
      <button
        class="tool-button"
        aria-label="New document"
        title="New document (⌘ / Ctrl N)"
        disabled={busy}
        onclick={newDocument}
        ><Icon name="new" /><span class="tool-label">New</span></button
      >
      <button
        class="tool-button"
        aria-label="Open a document"
        title="Open… (⌘ / Ctrl O)"
        disabled={busy}
        onclick={openDocument}
        ><Icon name="open" /><span class="tool-label">Open</span></button
      >
      <button
        class="tool-button"
        aria-label="Save"
        title="Save (⌘ / Ctrl S)"
        disabled={busy}
        onclick={() => action(async () => void (await save()))}
        ><Icon name="save" /><span class="tool-label">Save</span></button
      >
      <button
        class="tool-button"
        aria-label="Save as a copy"
        title="Save as…"
        disabled={busy}
        onclick={() => action(async () => void (await save(true)))}
        ><Icon name="save-as" /><span class="tool-label">Save as</span></button
      >
    </div>
    <div class="tool-divider" aria-hidden="true"></div>
    <div class="format-tools tool-group" role="group" aria-label="Formatting">
      {#each formats as [kind, label]}
        <button
          class="tool-button"
          aria-label={label}
          title={label}
          disabled={busy}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => format(kind)}
        >
          <Icon name={kind} /><span class="tool-label">{label}</span>
        </button>
      {/each}
    </div>
    <div class="header-actions">
      <div class="tool-group" role="group" aria-label="Appearance">
        {#each ['light', 'dark', 'system'] as t}
          <button
            class="tool-button"
            class:selected={theme === t}
            aria-label={t === 'system'
              ? 'System appearance'
              : t === 'light'
                ? 'Light appearance'
                : 'Dark appearance'}
            title={t === 'system'
              ? 'Follow system appearance'
              : t === 'light'
                ? 'Light appearance'
                : 'Dark appearance'}
            aria-pressed={theme === t}
            onclick={() => setTheme(t as Theme)}
          >
            <Icon name={t} /><span class="tool-label">{t}</span>
          </button>
        {/each}
      </div>
      <div class="tool-group text-size" role="group" aria-label="Writing size">
        <button
          class="tool-button"
          aria-label="Decrease text size"
          title="Smaller text (⌘ / Ctrl −)"
          disabled={zoom <= 14}
          onclick={() => (zoom = Math.max(14, zoom - 1))}
          ><Icon name="decrease" /><span class="tool-label">Smaller</span
          ></button
        >
        <output aria-label="Writing size">{zoom}</output>
        <button
          class="tool-button"
          aria-label="Increase text size"
          title="Larger text (⌘ / Ctrl +)"
          disabled={zoom >= 64}
          onclick={() => (zoom = Math.min(64, zoom + 1))}
          ><Icon name="increase" /><span class="tool-label">Larger</span
          ></button
        >
      </div>
      <div class="mode-switch" aria-label="Document mode">
        <button
          class:active={mode === 'read'}
          aria-pressed={mode === 'read'}
          disabled={busy}
          onclick={() => {
            if (mode !== 'read') toggle();
          }}>Write</button
        >
        <button
          class:active={mode === 'edit'}
          aria-pressed={mode === 'edit'}
          disabled={busy}
          onclick={() => {
            if (mode !== 'edit') toggle();
          }}>Source</button
        >
      </div>
      <div class="popover-anchor" data-popover>
        <button
          class="tool-button"
          aria-label="Settings"
          title="Settings"
          aria-expanded={settings}
          onclick={() => (settings = !settings)}
          ><Icon name="settings" /><span class="tool-label">Settings</span
          ></button
        >
        {#if settings}
          <aside class="popover settings-popover" aria-label="Settings">
            <fieldset>
              <legend>Toolbar display</legend>
              {#each [['icons', 'Icons only'], ['both', 'Icons + labels'], ['labels', 'Labels only']] as [value, label]}
                <label class="display-choice"
                  ><input
                    type="radio"
                    name="toolbar-display"
                    {value}
                    checked={toolbarDisplay === value}
                    onchange={() => setToolbarDisplay(value as ToolbarDisplay)}
                  />{label}</label
                >
              {/each}
            </fieldset>
            <p>Hover over an icon to see its name.</p>
            <button onclick={() => (settings = false)}>Done</button>
          </aside>
        {/if}
      </div>
    </div>
    <div class="popover-anchor header-overflow" data-popover>
      <button
        class="tool-button"
        aria-label="Header options"
        title="Header options"
        aria-expanded={headerMenu}
        onclick={() => {
          headerMenu = !headerMenu;
          settings = false;
        }}><Icon name="header-menu" /></button
      >
      {#if headerMenu}
        <aside class="popover header-menu" aria-label="Header options">
          <div class="compact-section">
            <span>Appearance</span>
            <div class="compact-controls" role="group" aria-label="Appearance">
              {#each ['light', 'dark', 'system'] as t}
                <button
                  class="tool-button"
                  class:selected={theme === t}
                  aria-label={`Use ${t} appearance`}
                  aria-pressed={theme === t}
                  onclick={() => setTheme(t as Theme)}><Icon name={t} /></button
                >
              {/each}
            </div>
          </div>
          <div class="compact-section">
            <span>Writing size</span>
            <div class="compact-controls text-size">
              <button
                class="tool-button"
                aria-label="Decrease text size"
                disabled={zoom <= 14}
                onclick={() => (zoom = Math.max(14, zoom - 1))}
                ><Icon name="decrease" /></button
              ><output aria-label="Compact writing size">{zoom}</output><button
                class="tool-button"
                aria-label="Increase text size"
                disabled={zoom >= 64}
                onclick={() => (zoom = Math.min(64, zoom + 1))}
                ><Icon name="increase" /></button
              >
            </div>
          </div>
          <div class="compact-section">
            <span>Mode</span>
            <div class="mode-switch" aria-label="Compact document mode">
              <button
                class:active={mode === 'read'}
                aria-pressed={mode === 'read'}
                onclick={() => mode !== 'read' && toggle()}>Write</button
              ><button
                class:active={mode === 'edit'}
                aria-pressed={mode === 'edit'}
                onclick={() => mode !== 'edit' && toggle()}>Source</button
              >
            </div>
          </div>
          <fieldset class="compact-display">
            <legend>Toolbar</legend>
            {#each [['icons', 'Icons'], ['both', 'Both'], ['labels', 'Labels']] as [value, label]}
              <label
                ><input
                  type="radio"
                  name="compact-toolbar-display"
                  {value}
                  checked={toolbarDisplay === value}
                  onchange={() => setToolbarDisplay(value as ToolbarDisplay)}
                />{label}</label
              >
            {/each}
          </fieldset>
        </aside>
      {/if}
    </div>
  </header>
  {#if error}<div class="error" role="alert">
      <span>{error}</span><button
        aria-label="Dismiss error"
        onclick={() => (error = '')}>×</button
      >
    </div>{/if}
  {#if showFind && mode === 'read'}<form
      class="find"
      onsubmit={(e) => {
        e.preventDefault();
        findReader();
      }}
    >
      <input
        aria-label="Find in document"
        bind:value={query}
        placeholder="Find in this page…"
      /><button type="submit">Find next</button><button
        type="button"
        onclick={() => (showFind = false)}>Close</button
      >
    </form>{/if}
  <main inert={busy}>
    <div class="read-surface" class:hidden={mode !== 'read'} bind:this={reader}>
      {#if sample}<div class="eyebrow">A QUIETER PLACE TO BEGIN</div>{/if}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <section onclick={readerClick} onauxclick={readerClick}>
        {#key revision}<RichEditor
            value={text}
            onchange={(v) => (text = v)}
            ready={(v) => (rich = v)}
          />{/key}
      </section>
      {#if sample}<div class="welcome-actions">
          <button class="primary" onclick={newDocument}
            >Start writing <span>↗</span></button
          ><button onclick={openDocument}>Open a document</button>
        </div>{/if}
    </div>
    <div class="edit-surface" class:hidden={mode !== 'edit'}>
      {#key revision}<Editor
          value={text}
          onchange={(v) => {
            if (!syncingSource) text = v;
          }}
          ready={(v) => (editor = v)}
        />{/key}
    </div>
  </main>
  <footer>
    <span class="status-dot" class:unsaved={dirty}></span><span
      >{dirty
        ? 'Unsaved changes'
        : sample
          ? 'MAKE ROOM FOR WORDS'
          : 'All changes saved'}</span
    ><span class="footer-right"
      >{wordCount(text)} words <span class="divider">/</span> Markdown</span
    >
  </footer>
  <input
    class="hidden"
    type="file"
    accept=".md,.markdown"
    bind:this={fileInput}
    onchange={browserFile}
  />
  {#if prompt}<div class="modal-backdrop">
      <dialog
        use:mountDialog
        aria-labelledby="save-title"
        class="modal"
        oncancel={(e) => {
          e.preventDefault();
          answer?.('cancel');
        }}
      >
        <div class="menu-label">BEFORE YOU GO</div>
        <h2 id="save-title">Keep your changes?</h2>
        <p>Your edits to “{name}” haven’t been saved.</p>
        <div class="modal-actions">
          <button onclick={() => answer?.('cancel')}>Cancel</button><button
            onclick={() => answer?.('discard')}>Discard</button
          ><button class="primary" onclick={() => answer?.('save')}
            >Save changes</button
          >
        </div>
      </dialog>
    </div>{/if}
</div>
