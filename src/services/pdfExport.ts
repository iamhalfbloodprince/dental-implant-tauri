import { jsPDF } from "jspdf";

/** Offline PDF for letters/reports — client-side jsPDF (PRD Milestone PDF strategy). */
export function downloadTextPdf(fileNameBase: string, body: string) {
  const doc = new jsPDF();
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(body.replace(/\r\n/g, "\n"), 180);
  doc.text(lines, 14, 20);
  const safe = fileNameBase.replace(/[^\w\-]+/g, "_").slice(0, 80) || "export";
  doc.save(`${safe}.pdf`);
}

/** Raw base64 payload for `letters_attach_pdf` / `file_save_blob`. */
export function textBodyToPdfBase64(body: string): string {
  const doc = new jsPDF();
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(body.replace(/\r\n/g, "\n"), 180);
  doc.text(lines, 14, 20);
  const uri = doc.output("datauristring") as string;
  const idx = uri.indexOf("base64,");
  return idx >= 0 ? uri.slice(idx + "base64,".length) : uri;
}
