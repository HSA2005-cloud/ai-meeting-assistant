import type { StructuredSummary } from '../types/contracts'

/** Strip an extension and make a title safe to use as a download filename. */
export function safeFilename(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, '')
  return base.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'summary'
}

/**
 * Render a summary as Markdown suitable for pasting into Slack/Notion/email.
 * Action items become GitHub-style checkboxes reflecting their done state.
 */
export function summaryToMarkdown(title: string, s: StructuredSummary, done: string[] = []): string {
  const out: string[] = [`# ${title}`, '']
  if (s.summary) out.push('## Summary', '', s.summary, '')
  if (s.key_points.length) {
    out.push('## Key points', '')
    s.key_points.forEach((i) => out.push(`- ${i}`))
    out.push('')
  }
  if (s.action_items.length) {
    out.push('## Action items', '')
    s.action_items.forEach((i) => out.push(`- [${done.includes(i) ? 'x' : ' '}] ${i}`))
    out.push('')
  }
  if (s.decisions.length) {
    out.push('## Decisions', '')
    s.decisions.forEach((i) => out.push(`- ${i}`))
    out.push('')
  }
  return out.join('\n').trim() + '\n'
}

/** Trigger a download of the summary as a .md file. */
export function downloadMarkdown(title: string, s: StructuredSummary, done: string[] = []): void {
  const blob = new Blob([summaryToMarkdown(title, s, done)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeFilename(title)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function esc(t: string): string {
  return t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
}

/**
 * Open a clean, app-chrome-free print view in a new window so the user can
 * "Save as PDF" from the browser's print dialog — no PDF library needed.
 */
export function printSummary(title: string, s: StructuredSummary, done: string[] = []): boolean {
  const list = (items: string[], checkbox = false) =>
    items.length
      ? `<ul>${items
          .map((it) => `<li>${checkbox ? (done.includes(it) ? '☑ ' : '☐ ') : ''}${esc(it)}</li>`)
          .join('')}</ul>`
      : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body{font-family:-apple-system,system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#1e293b;line-height:1.55}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#475569;margin:26px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:5px}
  p{color:#334155;margin:0}
  ul{padding-left:20px;margin:0}
  li{margin:5px 0}
</style></head><body>
  <h1>${esc(title)}</h1>
  ${s.summary ? `<h2>Summary</h2><p>${esc(s.summary)}</p>` : ''}
  ${s.key_points.length ? `<h2>Key points</h2>${list(s.key_points)}` : ''}
  ${s.action_items.length ? `<h2>Action items</h2>${list(s.action_items, true)}` : ''}
  ${s.decisions.length ? `<h2>Decisions</h2>${list(s.decisions)}` : ''}
</body></html>`

  const w = window.open('', '_blank')
  if (!w) return false // popup blocked
  w.document.write(html)
  w.document.close()
  w.focus()
  // Give the new document a tick to lay out before invoking print.
  setTimeout(() => w.print(), 250)
  return true
}
