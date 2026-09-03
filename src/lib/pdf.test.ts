import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { inspectPdf, mergePdfs } from "./pdf";

const pdfJsMock = vi.hoisted(() => ({
  destroy: vi.fn(async () => undefined),
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({ numPages: 2 }),
    destroy: pdfJsMock.destroy,
  })),
  workerOptions: { workerSrc: "" },
}));

vi.mock("pdfjs-dist", () => ({
  getDocument: pdfJsMock.getDocument,
  GlobalWorkerOptions: pdfJsMock.workerOptions,
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "mock-pdf-worker.mjs",
}));

async function createPdfFile(name: string, pageCount: number): Promise<File> {
  const document = await PDFDocument.create();
  for (let page = 0; page < pageCount; page += 1) {
    document.addPage([320, 240]);
  }

  const bytes = Uint8Array.from(await document.save());
  return new File([bytes.buffer], name, { type: "application/pdf" });
}

describe("PDF workflows", () => {
  it("loads PDF.js on demand and inspects the page count", async () => {
    const file = await createPdfFile("second.pdf", 2);

    await expect(inspectPdf(file)).resolves.toBe(2);

    expect(pdfJsMock.workerOptions.workerSrc).toBe("mock-pdf-worker.mjs");
    expect(pdfJsMock.getDocument).toHaveBeenCalledOnce();
    expect(pdfJsMock.destroy).toHaveBeenCalledOnce();
  });

  it("loads pdf-lib on demand and merges without losing pages", async () => {
    const first = await createPdfFile("first.pdf", 1);
    const second = await createPdfFile("second.pdf", 2);

    const merged = await mergePdfs([first, second]);
    const output = await PDFDocument.load(await merged.arrayBuffer());

    expect(merged.type).toBe("application/pdf");
    expect(output.getPageCount()).toBe(3);
  });
});
