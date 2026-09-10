// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { isDirty, validTheme, wordCount } from './document';
import { renderMarkdown } from './markdown';
describe('document invariants', () => {
  it('recognizes undo back to saved content', () => {
    expect(isDirty('original', 'original')).toBe(false);
    expect(isDirty('changed', 'original')).toBe(true);
  });
  it('ignores unknown settings', () => {
    expect(validTheme('arbitrary')).toBe('system');
  });
  it('counts empty and populated documents', () => {
    expect(wordCount('  ')).toBe(0);
    expect(wordCount('one\ntwo')).toBe(2);
  });
});
describe('untrusted Markdown', () => {
  it('renders GFM without modifying the original', () => {
    const s = '# Title\n\n**bold**\n\n- [x] Done';
    expect(renderMarkdown(s)).toContain('<h1>Title</h1>');
    expect(renderMarkdown(s)).toContain('<strong>bold</strong>');
    expect(s).toContain('**bold**');
  });
  it('strips script, events, remote images, SVG and frames', () => {
    const html = renderMarkdown(
      '<script>alert(1)</script><img src="https://example.com/track" onerror="alert(1)"><svg onload="alert(1)"></svg><iframe src="https://example.com"></iframe>',
    );
    expect(html).not.toMatch(/script|onerror|onload|iframe|<img|<svg/);
  });
  it('rejects dangerous and local links', () => {
    for (const url of [
      'javascript:alert(1)',
      'file:///etc/passwd',
      'data:text/html,x',
    ])
      expect(renderMarkdown(`<a href="${url}">link</a>`)).not.toContain(
        'href=',
      );
  });
  it('preserves https links and escapes fenced HTML', () => {
    expect(renderMarkdown('[link](https://example.com)')).toContain(
      'href="https://example.com"',
    );
    expect(renderMarkdown('```html\n<script>x</script>\n```')).toContain(
      '&lt;script&gt;',
    );
  });
});
