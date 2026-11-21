// The AI's answer as a little markdown: **bold**, `code`, lists (- * • and 1.), tables (| a | b |) and line
// breaks. Made of React elements (never HTML from the answer), so nothing in it can run.
import type { ReactNode } from "react";

function inline(t: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0, m: RegExpExecArray | null, n = 0;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push(t.slice(last, m.index));
    out.push(m[1] != null ? <b key={`${key}b${n++}`}>{m[1]}</b> : <code key={`${key}c${n++}`}>{m[2]}</code>);
    last = re.lastIndex;
  }
  if (last < t.length) out.push(t.slice(last));
  return out;
}
const withBreaks = (lines: string[], key: string) => lines.flatMap((l, i) => (i ? [<br key={`${key}br${i}`} />, ...inline(l, `${key}l${i}`)] : inline(l, `${key}l${i}`)));
const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    const key = `m${k++}`;
    // a table: a | row, then | --- | (the rows after it)
    if (/^\s*\|.*\|\s*$/.test(l) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? "")) {
      const head = cells(l); i += 2; const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      blocks.push(<div key={key} className="md-table"><table><thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `${key}h${j}`)}</th>)}</tr></thead>
        <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c, `${key}r${ri}c${j}`)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^\s*([-*•])\s+/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ""));
      blocks.push(<ul key={key}>{items.map((t, j) => <li key={j}>{inline(t, `${key}i${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      const items: string[] = [], start = parseInt(l, 10) || 1;
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(<ol key={key} start={start}>{items.map((t, j) => <li key={j}>{inline(t, `${key}i${j}`)}</li>)}</ol>);
      continue;
    }
    // a paragraph: this line (always, so a lone | line cannot stall the loop) and the plain lines after it
    const para: string[] = [lines[i++]];
    while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !/^\s*\|.*\|\s*$/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key}>{withBreaks(para, key)}</p>);
  }
  return <div className="md">{blocks}</div>;
}
