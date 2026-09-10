import { afterEach, describe, expect, it } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import RichEditor, { type RichHandle } from './RichEditor.svelte';

let component: ReturnType<typeof mount> | undefined;
afterEach(async () => {
  if (component) await unmount(component);
  document.body.innerHTML = '';
});
function setup(source: string) {
  const changes: string[] = [];
  let handle: RichHandle | undefined;
  component = mount(RichEditor, {
    target: document.body,
    props: {
      value: source,
      onchange: (v: string) => changes.push(v),
      ready: (v: RichHandle) => {
        handle = v;
      },
    },
  });
  flushSync();
  return {
    changes,
    get handle() {
      return handle!;
    },
  };
}
describe('formatted view integration', () => {
  it('does not serialize or dirty source on mount and synchronization', () => {
    const view = setup('# Heading\r\n\r\nA **bold** sentence.\r\n');
    expect(document.querySelector('[contenteditable="true"]')).not.toBeNull();
    view.handle.sync('# Different heading\n\nA paragraph.\n');
    expect(view.changes).toEqual([]);
    expect(document.querySelector('h1')?.textContent).toBe('Different heading');
  });
  it('keeps unsupported source intact and recovers when given supported content', () => {
    const view = setup('![A local image](photo.png)');
    flushSync();
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      'Source',
    );
    expect(view.changes).toEqual([]);
    view.handle.sync('A normal paragraph.');
    flushSync();
    expect(document.querySelector('[role="status"]')).toBeNull();
    expect(document.querySelector('[contenteditable="true"]')).not.toBeNull();
  });
  it('turns typed formatted text into Markdown', async () => {
    const view = setup('# Heading');
    const heading = document.querySelector('.tiptap h1')!;
    heading.textContent = 'A new draft';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(view.changes.at(-1)?.trimEnd()).toBe('# A new draft');
  });
  it('offers three distinct heading levels', () => {
    const view = setup('Heading');
    view.handle.format('heading1');
    expect(document.querySelector('h1')?.textContent).toBe('Heading');
    view.handle.format('heading2');
    expect(document.querySelector('h2')?.textContent).toBe('Heading');
    view.handle.format('heading3');
    expect(document.querySelector('h3')?.textContent).toBe('Heading');
  });
});
