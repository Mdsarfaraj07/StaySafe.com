import * as XLSX from 'xlsx';

const stamp = () => new Date().toISOString().slice(0, 10);

// Neutralise spreadsheet formula injection (=, @, or +/- followed by a non-digit) in user supplied text.
const safe = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' && /^[=@]|^[+-](?![\d\s])/.test(v)) return `'${v}`;
  return v;
};
const cleanRows = (rows) => rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, safe(v)])));

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** rows: array of flat objects. Returns false when there is nothing to export. */
export function exportCsv(rows, baseName) {
  if (!rows.length) return false;
  const data = cleanRows(rows);
  const headers = Object.keys(data[0]);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...data.map(r => headers.map(h => esc(r[h])).join(','))].join('\r\n');
  // BOM so Excel opens UTF-8 (₹, names) correctly
  download(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), `${baseName}-${stamp()}.csv`);
  return true;
}

/** sheets: { 'Sheet name': rows[] }. Returns false when every sheet is empty. */
export function exportXlsx(sheets, baseName) {
  const entries = Object.entries(sheets).filter(([, rows]) => rows.length);
  if (!entries.length) return false;
  const wb = XLSX.utils.book_new();
  entries.forEach(([name, rows]) => {
    const data = cleanRows(rows);
    const ws = XLSX.utils.json_to_sheet(data);
    const headers = Object.keys(data[0]);
    ws['!cols'] = headers.map(h => ({
      wch: Math.min(40, Math.max(h.length, ...data.map(r => String(r[h] ?? '').length)) + 2)
    }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${baseName}-${stamp()}.xlsx`);
  return true;
}
