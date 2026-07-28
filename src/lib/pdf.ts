import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { safeBaseName } from "./files";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type ImageFormat = "png" | "jpeg" | "webp";

export interface PdfFileInfo {
  id: string;
  file: File;
  pageCount: number;
}

export interface ConvertOptions {
  format: ImageFormat;
  dpi: number;
  quality: number;
  onProgress?: (currentPage: number, totalPages: number) => void;
}

export async function inspectPdf(file: File): Promise<number> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data: bytes });
  try {
    const document = await task.promise;
    return document.numPages;
  } finally {
    await task.destroy();
  }
}

export async function mergePdfs(files: File[]): Promise<Blob> {
  if (files.length < 2) {
    throw new Error("Cần ít nhất 2 file PDF để gộp.");
  }

  const output = await PDFDocument.create();

  for (const file of files) {
    const sourceBytes = await file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes);
    const indices = source.getPageIndices();
    const pages = await output.copyPages(source, indices);
    pages.forEach((page) => output.addPage(page));
  }

  output.setProducer("PDF Studio");
  output.setCreationDate(new Date());
  const bytes = await output.save({ useObjectStreams: true });
  return new Blob([bytes], { type: "application/pdf" });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Không thể tạo file ảnh.")),
      mimeType,
      quality,
    );
  });
}

export async function convertPdfToImages(
  file: File,
  options: ConvertOptions,
): Promise<{ blob: Blob; filename: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data: bytes });
  const pdfDocument = await task.promise;
  const zip = new JSZip();
  const baseName = safeBaseName(file.name);
  const extension = options.format === "jpeg" ? "jpg" : options.format;
  const mimeType = `image/${options.format}`;
  const scale = options.dpi / 72;

  try {
    for (
      let pageNumber = 1;
      pageNumber <= pdfDocument.numPages;
      pageNumber += 1
    ) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const context = canvas.getContext("2d", { alpha: options.format === "png" });
      if (!context) throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");

      if (options.format !== "png") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: context, viewport }).promise;
      const image = await canvasToBlob(
        canvas,
        mimeType,
        options.format === "png" ? undefined : options.quality,
      );
      const pageName = `${baseName}-trang-${String(pageNumber).padStart(3, "0")}.${extension}`;
      zip.file(pageName, image);
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
      options.onProgress?.(pageNumber, pdfDocument.numPages);
    }

    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    return { blob, filename: `${baseName}-${extension}.zip` };
  } finally {
    await task.destroy();
  }
}
