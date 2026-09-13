/**
 * Export utilities for Finance reporting and print layouts
 */

export function exportToCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]): void {
  const escapeCell = (cell: string | number | undefined | null): string => {
    if (cell === undefined || cell === null) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  // Add BOM so Excel opens UTF-8 files correctly with ₹ and Indian characters
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printContent(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }
  window.print();
}
