export type Mode = 'read' | 'edit';
export type Theme = 'system' | 'light' | 'dark';
export function isDirty(text: string, saved: string): boolean {
  return text !== saved;
}
export function wordCount(text: string): number {
  return text.trim().match(/\S+/gu)?.length ?? 0;
}
export function validTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}
export const welcome = `# A little room for your words.\n\nWelcome to **Plainleaf**. A quiet place to write Markdown, with nothing between you and the page.\n\n## Make yourself at home\n\nStart typing right here. **Write** lets you work with a beautifully formatted page. **Source** gives you the Markdown underneath. Both are yours to edit.\n\n- Ordinary Markdown files, saved where you choose\n- Modern type and a little breathing room\n- Light, dark, or whatever feels right\n\n> Good tools leave room for the work.\n\nUse headings, **bold**, *italics*, lists, and links. The ••• menu has the essentials; Cmd or Ctrl + S saves your work.\n\n---\n\nThis is a sample page. **New** gives you a fresh start; **Open** brings your own words in.\n`;
