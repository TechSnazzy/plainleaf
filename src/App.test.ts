import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import App from './App.svelte';
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
