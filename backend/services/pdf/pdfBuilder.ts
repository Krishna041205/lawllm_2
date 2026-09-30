/**
 * Lightweight, zero-dependency PDF document generator
 * Produces strictly compliant PDF-1.4 binary buffers with valid xref tables,
 * font descriptors, and page text streams for testing, OCR fixtures, and resilient fallbacks.
 */
export function createCompliantPdfBuffer(pages: Array<{ pageNumber: number; text: string }>): Buffer {
  const objects: string[] = [];

  // Obj 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // Obj 2: Pages container
  const kidsRefs = pages.map((_, i) => `${i * 3 + 3} 0 R`).join(" ");
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${pages.length} >>\nendobj`);

  // Build each page: Page Object, Content Stream, and Font
  pages.forEach((p, idx) => {
    const pageObjNum = idx * 3 + 3;
    const contentObjNum = idx * 3 + 4;
    const fontObjNum = idx * 3 + 5;

    // Sanitize text for PDF literal string
    const escaped = p.text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\r/g, "");

    const lines = escaped.split("\n");
    let streamBody = "BT\n/F1 12 Tf\n40 780 Td\n16 TL\n";
    for (const line of lines) {
      if (line.trim().length > 0) {
        streamBody += `(${line}) '\n`;
      } else {
        streamBody += "T*\n";
      }
    }
    streamBody += "ET";

    const streamLen = Buffer.byteLength(streamBody, "latin1");

    // Page object
    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj`
    );

    // Content stream object
    objects.push(
      `${contentObjNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamBody}\nendstream\nendobj`
    );

    // Font object (Standard Helvetica Type 1 font)
    objects.push(
      `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`
    );
  });

  // Calculate byte offsets for XRef Table
  let header = "%PDF-1.4\n%âãÏÓ\n";
  let body = "";
  const xrefOffsets: number[] = [0];

  let currentOffset = Buffer.byteLength(header, "latin1");

  for (let i = 0; i < objects.length; i++) {
    xrefOffsets.push(currentOffset);
    const objStr = objects[i] + "\n";
    body += objStr;
    currentOffset += Buffer.byteLength(objStr, "latin1");
  }

  const startxref = currentOffset;

  // Build XRef Table
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(xrefOffsets[i]).padStart(10, "0");
    xref += `${offsetStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  const fullPdfStr = header + body + xref + trailer;
  return Buffer.from(fullPdfStr, "latin1");
}
