import { fenceMask } from './blocks';

export interface Table {
  headers: string[];
  rows: string[][];
}

const SEPARATOR = /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/;

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Parses GFM pipe tables, ignoring anything inside fenced code blocks. */
export function parseTables(content: string): Table[] {
  const lines = content.split('\n');
  const mask = fenceMask(lines);
  const tables: Table[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    if (mask[i] || !lines[i].includes('|')) {
      continue;
    }
    if (mask[i + 1] || !SEPARATOR.test(lines[i + 1])) {
      continue;
    }

    const headers = cells(lines[i]);
    const rows: string[][] = [];

    let j = i + 2;
    for (; j < lines.length && !mask[j]; j++) {
      if (!lines[j].includes('|') || lines[j].trim() === '') {
        break;
      }
      rows.push(cells(lines[j]));
    }

    tables.push({ headers, rows });
    i = j - 1;
  }

  return tables;
}
