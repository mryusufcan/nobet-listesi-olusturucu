import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function schedulePdfFile(year: number, month: number) {
  const element = document.querySelector("main > section.mt-6") as HTMLElement | null;
  if (!element) throw new Error("PDF için çizelge alanı bulunamadı.");
  const canvas = await html2canvas(element, { backgroundColor: "#ffffff", scale: 1.35, useCORS: true, logging: false });
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageHeight = (canvas.height * pageWidth) / canvas.width;
  const image = canvas.toDataURL("image/png", 0.92);
  let offset = 0;
  while (offset < imageHeight) {
    pdf.addImage(image, "PNG", 0, -offset, pageWidth, imageHeight, undefined, "FAST");
    offset += pageHeight;
    if (offset < imageHeight) pdf.addPage();
  }
  const filename = `nobet-listesi-${year}-${String(month).padStart(2, "0")}.pdf`;
  return new File([pdf.output("blob")], filename, { type: "application/pdf" });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
