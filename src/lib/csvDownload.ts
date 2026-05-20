/** UTF-8 CSV with BOM — opens cleanly in Excel. */
export function downloadCsvUtf8(filename: string, content: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}
