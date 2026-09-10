import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import App from './App.svelte';
vi.mock('@tauri-apps/api/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/core')>()),
  isTauri: vi.fn(() => false),
  invoke: vi.fn(async () => undefined),
}));
vi.mock('@tauri-apps/api/event', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/event')>()),
  listen: vi.fn(async () => () => {}),
}));
vi.mock('@tauri-apps/api/window', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/window')>()),
  getCurrentWindow: vi.fn(() => ({
    setTitle: vi.fn(async () => {}),
    onCloseRequested: vi.fn(async () => () => {}),
  })),
}));
let component: ReturnType<typeof mount>;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  // jsdom doesn't implement <dialog> behavior -- stub it so the existing
  // unsaved-changes modal (a native <dialog>) can mount in tests.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  component = mount(App, { target: document.body });
  flushSync();
});
afterEach(async () => {
  await unmount(component);
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
function button(label: string) {
  return Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )!;
}
describe('two writing modes', () => {
  it('defaults to 18px and supports writing sizes up to 64px without changing text', () => {
    const app = document.querySelector<HTMLElement>('.app')!;
    expect(app.style.getPropertyValue('--reading-size')).toBe('18px');
    document
      .querySelector<HTMLButtonElement>('[aria-label="Document options"]')!
      .click();
    flushSync();
    const increase = document.querySelector<HTMLButtonElement>(
      '[aria-label="Increase text size"]',
    )!;
    for (let i = 0; i < 50; i++) {
      increase.click();
      flushSync();
    }
    expect(app.style.getPropertyValue('--reading-size')).toBe('64px');
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: '+', ctrlKey: true }),
    );
    flushSync();
    expect(app.style.getPropertyValue('--reading-size')).toBe('64px');
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: '-', ctrlKey: true }),
    );
    flushSync();
    expect(app.style.getPropertyValue('--reading-size')).toBe('63px');
    expect(document.querySelector('footer')?.textContent).not.toContain(
      'Unsaved changes',
    );
  });
  it('remembers toolbar display without modifying the document', async () => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Settings"]')!
      .click();
    flushSync();
    const labels = document.querySelector<HTMLInputElement>(
      'input[value="labels"]',
    )!;
    labels.checked = true;
    labels.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
    expect(localStorage.getItem('plainleaf.toolbarDisplay')).toBe('labels');
    expect(document.querySelector('footer')?.textContent).not.toContain(
      'Unsaved changes',
    );
    await unmount(component);
    component = mount(App, { target: document.body });
    flushSync();
    expect(document.querySelector('header')?.getAttribute('data-display')).toBe(
      'labels',
    );
  });
  it('provides a compact header menu for narrow windows', () => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Header options"]')!
      .click();
    flushSync();
    const compact = document.querySelector(
      '[aria-label="Header options"] + aside',
    );
    expect(compact?.textContent).toContain('Appearance');
    expect(compact?.textContent).toContain('Writing size');
    expect(compact?.textContent).toContain('Write');
    expect(compact?.textContent).toContain('Save as…');
  });
  it('starts blank and editable and toggles without dirtying the document', () => {
    expect(document.querySelector('.tiptap')?.textContent).toBe('');
    expect(document.querySelector('.document-title')).toBeNull();
    expect(document.body.textContent).not.toContain(
      'A little room for your words',
    );
    expect(
      document.querySelector('.tiptap[contenteditable="true"]'),
    ).not.toBeNull();
    button('Source').click();
    flushSync();
    expect(
      document.querySelector('.edit-surface')?.classList.contains('hidden'),
    ).toBe(false);
    button('Write').click();
    flushSync();
    expect(document.querySelector('footer')?.textContent).not.toContain(
      'Unsaved changes',
    );
  });
  it('carries a formatted edit to Source and back', async () => {
    document.querySelector('.tiptap p')!.textContent = 'My modern draft';
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
    expect(document.querySelector('footer')?.textContent).toContain(
      'Unsaved changes',
    );
    button('Source').click();
    flushSync();
    expect(document.querySelector('.cm-content')?.textContent).toContain(
      'My modern draft',
    );
    button('Write').click();
    flushSync();
    expect(document.querySelector('.tiptap p')?.textContent).toBe(
      'My modern draft',
    );
  });
  it('creates a blank new document without welcome copy', async () => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Document options"]')!
      .click();
    flushSync();
    button('New document ⌘ / Ctrl N').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
    expect(document.querySelector('.tiptap')?.textContent).toBe('');
    expect(document.querySelector('.eyebrow')).toBeNull();
    expect(document.querySelector('.welcome-actions')).toBeNull();
  });
});

describe('native external file open', () => {
  type Handler = (event: { event: string; id: number; payload: unknown }) => void;
  const invokeMock = vi.mocked(invoke);
  const listenMock = vi.mocked(listen);
  let listeners: Record<string, Handler>;
  beforeEach(async () => {
    await unmount(component);
    document.body.innerHTML = '';
    listeners = {};
    listenMock.mockReset();
    listenMock.mockImplementation(async (event: string, handler: Handler) => {
      listeners[event] = handler;
      return () => {
        delete listeners[event];
      };
    });
    invokeMock.mockReset();
    invokeMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'take_pending_open') return null;
      return undefined;
    });
    vi.mocked(isTauri).mockReturnValue(true);
    component = mount(App, { target: document.body });
    flushSync();
    await Promise.resolve();
    await Promise.resolve();
    flushSync();
  });
  afterEach(() => {
    vi.mocked(isTauri).mockReturnValue(false);
  });
  async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
  }
  it('asks to save unsaved work before loading a file opened from outside, and Cancel preserves the draft', async () => {
    document.querySelector('.tiptap p')!.textContent = 'My unsaved draft';
    await settle();
    expect(document.querySelector('footer')?.textContent).toContain(
      'Unsaved changes',
    );
    invokeMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'take_pending_open') return { id: 1, name: 'AGENTS.md' };
      return undefined;
    });
    listeners['open-requested']({
      event: 'open-requested',
      id: 1,
      payload: undefined,
    });
    await settle();
    expect(document.querySelector('dialog')).not.toBeNull();
    button('Cancel').click();
    await settle();
    expect(document.querySelector('dialog')).toBeNull();
    expect(document.querySelector('.tiptap p')?.textContent).toBe(
      'My unsaved draft',
    );
    expect(invokeMock).toHaveBeenCalledWith('reject_pending_open', { id: 1 });
    expect(invokeMock).not.toHaveBeenCalledWith(
      'accept_pending_open',
      expect.anything(),
    );
  });
  it('loads the file opened from outside once Discard is chosen', async () => {
    document.querySelector('.tiptap p')!.textContent = 'My unsaved draft';
    await settle();
    invokeMock.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === 'take_pending_open') return { id: 7, name: 'AGENTS.md' };
      if (cmd === 'accept_pending_open') {
        expect(args).toEqual({ id: 7 });
        return { name: 'AGENTS.md', text: 'Loaded from outside' };
      }
      return undefined;
    });
    listeners['open-requested']({
      event: 'open-requested',
      id: 1,
      payload: undefined,
    });
    await settle();
    expect(document.querySelector('dialog')).not.toBeNull();
    button('Discard').click();
    await settle();
    expect(document.querySelector('dialog')).toBeNull();
    expect(document.querySelector('.tiptap')?.textContent).toBe(
      'Loaded from outside',
    );
    expect(document.querySelector('footer')?.textContent).not.toContain(
      'Unsaved changes',
    );
  });
  it('picks up a file that arrived before the listener existed, once the document is clean', async () => {
    invokeMock.mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === 'take_pending_open') return { id: 3, name: 'notes.md' };
      if (cmd === 'accept_pending_open') {
        expect(args).toEqual({ id: 3 });
        return { name: 'notes.md', text: 'Cold launch content' };
      }
      return undefined;
    });
    await unmount(component);
    document.body.innerHTML = '';
    component = mount(App, { target: document.body });
    flushSync();
    await settle();
    expect(document.querySelector('dialog')).toBeNull();
    expect(document.querySelector('.tiptap')?.textContent).toBe(
      'Cold launch content',
    );
  });
  it('reports a rejected external file without changing the current document', async () => {
    invokeMock.mockImplementation(async () => undefined);
    listeners['open-request-failed']({
      event: 'open-request-failed',
      id: 1,
      payload: 'Please open a .md or .markdown file.',
    });
    await settle();
    expect(document.querySelector('.error')?.textContent).toContain(
      'Please open a .md or .markdown file.',
    );
    expect(document.querySelector('.tiptap')?.textContent).toBe('');
  });
});
