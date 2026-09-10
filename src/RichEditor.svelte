<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import {
    richExtensions,
    unsupportedMarkdown,
    canRoundTrip,
  } from './lib/rich';
  import { renderMarkdown } from './lib/markdown';
  export type RichHandle = {
    sync: (source: string) => void;
    format: (kind: string) => void;
    focus: () => void;
  };
  let {
    value,
    onchange,
    ready,
  }: {
    value: string;
    onchange: (source: string) => void;
    ready: (handle: RichHandle) => void;
  } = $props();
  let host: HTMLDivElement;
  let protectedSource = $state<string | null>(null);
  onMount(() => {
    let lastSource = value;
    let syncing = false;
    let originalSource = value;
    let originalJson = '';
    const editor = new Editor({
      element: host,
      extensions: richExtensions(),
      content: '',
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-label': 'Formatted document',
          'aria-multiline': 'true',
          spellcheck: 'true',
        },
        handlePaste: (view, event) => {
          event.preventDefault();
          const text = event.clipboardData?.getData('text/plain') || '';
          view.dispatch(view.state.tr.insertText(text));
          return true;
        },
        handleDrop: (_view, event) => {
          event.preventDefault();
          return true;
        },
        handleKeyDown: (_view, event) => {
          if (
            (event.metaKey || event.ctrlKey) &&
            ['b', 'i', 'k', 'f', 'r', 's', 'o', 'n'].includes(
              event.key.toLowerCase(),
            )
          )
            return true;
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        if (syncing || protectedSource !== null) return;
        const json = JSON.stringify(editor.getJSON());
        lastSource =
          json === originalJson ? originalSource : editor.getMarkdown();
        onchange(lastSource);
      },
    });
    function sync(source: string) {
      if (editor.isDestroyed) return;
      if (source === lastSource && originalJson) return;
      syncing = true;
      lastSource = source;
      originalSource = source;
      if (unsupportedMarkdown(source)) {
        protectedSource = source;
        editor.setEditable(false);
        syncing = false;
        return;
      }
      editor.commands.setContent(source, {
        contentType: 'markdown',
        emitUpdate: false,
      });
      if (!canRoundTrip(source, editor)) {
        protectedSource = source;
        editor.setEditable(false);
      } else {
        protectedSource = null;
        editor.setEditable(true);
      }
      originalJson = JSON.stringify(editor.getJSON());
      syncing = false;
    }
    sync(value);
    ready({
      sync,
      focus: () => {
        if (!editor.isDestroyed && protectedSource === null)
          editor.commands.focus();
      },
      format: (kind) => {
        if (editor.isDestroyed || protectedSource !== null) return;
        const chain = editor.chain().focus();
        switch (kind) {
          case 'bold':
            chain.toggleBold().run();
            break;
          case 'italic':
            chain.toggleItalic().run();
            break;
          case 'code':
            chain.toggleCode().run();
            break;
          case 'heading1':
            chain.toggleHeading({ level: 1 }).run();
            break;
          case 'heading2':
            chain.toggleHeading({ level: 2 }).run();
            break;
          case 'heading3':
            chain.toggleHeading({ level: 3 }).run();
            break;
          case 'bullet':
            chain.toggleBulletList().run();
            break;
          case 'ordered':
            chain.toggleOrderedList().run();
            break;
          case 'task':
            chain.toggleTaskList().run();
            break;
          case 'quote':
            chain.toggleBlockquote().run();
            break;
          case 'fence':
            chain.toggleCodeBlock().run();
            break;
          case 'link':
            chain.setLink({ href: 'https://example.com' }).run();
            break;
        }
      },
    });
    return () => editor.destroy();
  });
</script>

{#if protectedSource !== null}
  <div class="compatibility-note" role="status">
    This document contains formatting that Write cannot safely preserve yet. You
    can read it here and edit every part in Source.
  </div>
  <article>{@html renderMarkdown(protectedSource)}</article>
{/if}
<article class:hidden={protectedSource !== null}>
  <div bind:this={host}></div>
</article>
