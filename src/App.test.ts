import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import App from './App.svelte';
let component: ReturnType<typeof mount>;
beforeEach(() => {
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
  it('starts editable and toggles without dirtying the welcome document', () => {
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
    document.querySelector('.tiptap h1')!.textContent = 'My modern draft';
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
    expect(document.querySelector('footer')?.textContent).toContain(
      'Unsaved changes',
    );
    button('Source').click();
    flushSync();
    expect(document.querySelector('.cm-content')?.textContent).toContain(
      '# My modern draft',
    );
    button('Write').click();
    flushSync();
    expect(document.querySelector('.tiptap h1')?.textContent).toBe(
      'My modern draft',
    );
  });
});
