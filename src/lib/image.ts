import JSZip from "jszip";
import { safeBaseName } from "./files";

export type CompressedImageFormat = "jpeg" | "webp" | "png";

export interface CompressImagesOptions {
  format: CompressedImageFormat;
  quality: number;
  maxDimension: number;
  onProgress?: (current: number, total: number) => void;
}

export interface CompressImagesResult {
  blob: Blob;
  filename: string;
  originalBytes: number;
  compressedBytes: number;
  fileCount: number;
}

export function isSupportedImage(file: File): boolean {
  return (
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name)
  );
}

export function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (maxDimension <= 0 || Math.max(width, height) <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function getSavingsPercent(
  originalBytes: number,
  compressedBytes: number,
): number {
  if (originalBytes <= 0) return 0;
  return Math.round((1 - compressedBytes / originalBytes) * 100);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Trình duyệt không thể tạo ảnh đầu ra.")),
      type,
      quality,
    );
  });
}

async function compressOneImage(
  file: File,
  options: CompressImagesOptions,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const dimensions = calculateDimensions(
    bitmap.width,
    bitmap.height,
    options.maxDimension,
  );
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d", { alpha: options.format !== "jpeg" });
  if (!context) {
    bitmap.close();
    throw new Error("Thiết bị không hỗ trợ xử lý ảnh Canvas 2D.");
  }

  if (options.format === "jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  try {
    return await canvasToBlob(
      canvas,
      `image/${options.format}`,
      options.format === "png" ? undefined : options.quality,
    );
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function compressImageFiles(
  files: File[],
  options: CompressImagesOptions,
): Promise<CompressImagesResult> {
  if (files.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một ảnh.");
  }

  const extension = options.format === "jpeg" ? "jpg" : options.format;
  const results: Array<{ blob: Blob; filename: string }> = [];
  const usedNames = new Set<string>();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const blob = await compressOneImage(file, options);
    const stem = `${safeBaseName(file.name)}-da-nen`;
    let filename = `${stem}.${extension}`;
    let suffix = 2;

    while (usedNames.has(filename.toLowerCase())) {
      filename = `${stem}-${suffix}.${extension}`;
      suffix += 1;
    }

    usedNames.add(filename.toLowerCase());
    results.push({ blob, filename });
    options.onProgress?.(index + 1, files.length);
  }

  const originalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const compressedBytes = results.reduce(
    (sum, result) => sum + result.blob.size,
    0,
  );

  if (results.length === 1) {
    return {
      blob: results[0].blob,
      filename: results[0].filename,
      originalBytes,
      compressedBytes,
      fileCount: 1,
    };
  }

  const zip = new JSZip();
  results.forEach((result) => zip.file(result.filename, result.blob));
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    blob,
    filename: `anh-da-nen-${Date.now()}.zip`,
    originalBytes,
    compressedBytes,
    fileCount: files.length,
  };
}
