<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorView, keymap } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
  } from '@codemirror/commands';
  import { markdown } from '@codemirror/lang-markdown';
  import {
    syntaxHighlighting,
    defaultHighlightStyle,
  } from '@codemirror/language';
  import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
  let {
    value,
    onchange,
    ready,
  }: {
    value: string;
    onchange: (text: string) => void;
    ready: (view: EditorView) => void;
  } = $props();
  let host: HTMLDivElement;
  onMount(() => {
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          EditorState.lineSeparator.of(value.includes('\r\n') ? '\r\n' : '\n'),
          history(),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          highlightSelectionMatches(),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            'aria-label': 'Markdown source',
            spellcheck: 'true',
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onchange(u.state.sliceDoc());
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              backgroundColor: 'transparent',
              color: 'var(--ink)',
            },
            '.cm-scroller': {
              fontFamily: 'var(--mono)',
              fontSize: '15px',
              lineHeight: '1.85',
              overflow: 'auto',
            },
            '.cm-content': {
              padding: '40px var(--page-gutter) 100px',
              caretColor: 'var(--accent)',
            },
            '.cm-focused': { outline: 'none' },
            '&.cm-focused': { outline: 'none' },
            '.cm-line': { padding: '0' },
            '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
              background: 'var(--selection)',
            },
            '.cm-panels': {
              background: 'var(--panel)',
              color: 'var(--ink)',
              border: '0',
            },
            '.cm-textfield': {
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
            },
            '.cm-button': {
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
            },
          }),
        ],
      }),
    });
    ready(view);
    return () => view.destroy();
  });
</script>

<div class="editor-host" bind:this={host}></div>
