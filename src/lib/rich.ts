import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TableKit } from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { marked } from 'marked';
import { renderMarkdown } from './markdown';

export function richExtensions() {
  return [
    StarterKit.configure({
      underline: false,
      link: {
        openOnClick: false,
        autolink: false,
        protocols: ['http', 'https'],
        isAllowedUri: (url) => /^https?:\/\//i.test(url),
      },
    }),
    Markdown,
    TableKit,
    TaskList,
    TaskItem.configure({ nested: true }),
  ];
}
export function unsupportedMarkdown(source: string): boolean {
  if (/^---\r?\n/.test(source) || /^\s*\[[^\]]+\]:/m.test(source)) return true;
  let unsupported = false;
  marked.walkTokens(marked.lexer(source), (token) => {
    if (['html', 'image', 'def'].includes(token.type)) unsupported = true;
  });
  return unsupported;
}
function semanticSignature(source: string): string {
  const fragment = document.createElement('template');
  fragment.innerHTML = renderMarkdown(source);
  function visit(node: Node, pre = false): unknown {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      return pre ? text : text.replace(/\s+/g, ' ').trim();
    }
    if (node instanceof Element) {
      return [
        node.tagName,
        ['href', 'start', 'checked', 'align'].map((k) => node.getAttribute(k)),
        ...Array.from(node.childNodes)
          .map((n) => visit(n, pre || node.tagName === 'PRE'))
          .filter((x) => x !== ''),
      ];
    }
    return Array.from(node.childNodes)
      .map((n) => visit(n))
      .filter((x) => x !== '');
  }
  return JSON.stringify(visit(fragment.content));
}
export function canRoundTrip(source: string, editor: Editor): boolean {
  return semanticSignature(source) === semanticSignature(editor.getMarkdown());
}
