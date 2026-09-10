<script lang="ts">
  let { name }: { name: string } = $props();
  const paths: Record<string, string> = {
    bold: 'M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 0 1 0 8H7z',
    italic: 'M10 4h9M5 20h9M15 4 9 20',
    heading: 'M5 5v14M15 5v14M5 12h10M19 15v5m-1-4 1-1',
    link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
    bullet: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
    ordered:
      'M10 6h10M10 12h10M10 18h10M3 4h2v5M3 9h4M3 14c0-3 4-3 4 0 0 1-4 4-4 5h4',
    task: 'm3 6 2 2 4-4M12 6h9M3 14h5v5H3zM12 16h9',
    quote: 'M4 5h6v7H4zM10 12c0 4-2 6-5 7M14 5h6v7h-6zM20 12c0 4-2 6-5 7',
    code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16',
    fence: 'M3 4h18v16H3zM3 8h18m-12 4-2 2 2 2m6-4 2 2-2 2',
    light:
      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
    dark: 'M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z',
    system: 'M3 4h18v13H3zM8 21h8M12 17v4',
    decrease: 'M5 12h14',
    increase: 'M5 12h14M12 5v14',
    settings: 'M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
  };
</script>

<svg
  class="tool-icon"
  width="18"
  height="18"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={name === 'more' || name === 'bullet' ? 2.2 : 1.65}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"><path d={paths[name] || paths.settings} /></svg
>
