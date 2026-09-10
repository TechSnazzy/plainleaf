import DOMPurify from 'dompurify';
import { marked } from 'marked';
export function renderMarkdown(source: string): string {
  const rendered = marked.parse(source, {
    async: false,
    gfm: true,
    breaks: false,
  });
  const clean = DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'em',
      'del',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'a',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'input',
    ],
    ALLOWED_ATTR: [
      'href',
      'title',
      'type',
      'checked',
      'disabled',
      'start',
      'align',
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?:\/\/|mailto:|#)/i,
  });
  const template = document.createElement('template');
  template.innerHTML = clean;
  for (const input of template.content.querySelectorAll('input')) {
    if (input.getAttribute('type') !== 'checkbox') input.remove();
    else input.setAttribute('disabled', '');
  }
  return template.innerHTML;
}
