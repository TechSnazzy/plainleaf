// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { richExtensions, unsupportedMarkdown, canRoundTrip } from './rich';
describe('formatted Markdown editing', () => {
  it('round-trips normal prose, marks, headings, code and task lists', () => {
    for (const source of [
      '# Title\n\nA **bold** and *italic* sentence.',
      '- [x] Done\n- [ ] Later',
      '```js\nconst x = 1;\n```',
    ]) {
      const editor = new Editor({
        extensions: richExtensions(),
        content: source,
        contentType: 'markdown',
      });
      expect(canRoundTrip(source, editor)).toBe(true);
      editor.destroy();
    }
  });
  it('serializes a formatted text edit into Markdown', () => {
    const editor = new Editor({
      extensions: richExtensions(),
      content: '# Hello',
      contentType: 'markdown',
    });
    editor.commands.insertContentAt(6, ' world');
    expect(editor.getMarkdown()).toContain('# Hello world');
    editor.destroy();
  });
  it('protects unsupported content before parsing into the editable view', () => {
    for (const source of [
      '---\ntitle: secret\n---',
      '![pic](image.png)',
      '<script>bad()</script>',
      '[ref]: https://example.com',
    ])
      expect(unsupportedMarkdown(source)).toBe(true);
    expect(unsupportedMarkdown('```html\n<script>example</script>\n```')).toBe(
      false,
    );
  });
});
