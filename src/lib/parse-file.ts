/* eslint-disable @typescript-eslint/no-require-imports */
import mammoth from "mammoth";

export async function parseFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    // pdf-parse v1 uses CommonJS
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
