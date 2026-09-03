import {
  CheckCircle2,
  ChevronDown,
  FileImage,
  ImageDown,
  LoaderCircle,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadBlob, formatBytes } from "../lib/files";
import {
  compressImageFiles,
  CompressedImageFormat,
  getSavingsPercent,
  isSupportedImage,
} from "../lib/image";
import { DropZone } from "./DropZone";

type CompressorStatus =
  | { type: "idle" }
  | { type: "working"; message: string; progress: number }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const MAX_FILES = 100;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function ImageCompressor() {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<CompressedImageFormat>("webp");
  const [quality, setQuality] = useState(0.8);
  const [maxDimension, setMaxDimension] = useState(1920);
  const [status, setStatus] = useState<CompressorStatus>({ type: "idle" });

  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0 || incoming.some((file) => !isSupportedImage(file))) {
      setStatus({
        type: "error",
        message: "Chỉ hỗ trợ ảnh JPG, PNG và WebP.",
      });
      return;
    }

    if (incoming.some((file) => file.size > MAX_FILE_BYTES)) {
      setStatus({
        type: "error",
        message: "Mỗi ảnh cần nhỏ hơn hoặc bằng 50 MB.",
      });
      return;
    }

    if (files.length + incoming.length > MAX_FILES) {
      setStatus({
        type: "error",
        message: `Mỗi lần xử lý tối đa ${MAX_FILES} ảnh.`,
      });
      return;
    }

    setFiles((current) => [...current, ...incoming]);
    setStatus({ type: "idle" });
  };

  const reset = () => {
    setFiles([]);
    setStatus({ type: "idle" });
  };

  const runCompression = async () => {
    try {
      setStatus({
        type: "working",
        message: `Đang nén ảnh 1/${files.length}...`,
        progress: 0,
      });
      const result = await compressImageFiles(files, {
        format,
        quality,
        maxDimension,
        onProgress: (current, total) =>
          setStatus({
            type: "working",
            message: `Đang nén ảnh ${current}/${total}...`,
            progress: Math.round((current / total) * 100),
          }),
      });
      downloadBlob(result.blob, result.filename);
      const savings = getSavingsPercent(
        result.originalBytes,
        result.compressedBytes,
      );
      const comparison =
        savings >= 0
          ? `giảm ${savings}% (${formatBytes(result.originalBytes)} → ${formatBytes(result.compressedBytes)})`
          : `tăng ${Math.abs(savings)}% do định dạng đã chọn`;
      setStatus({
        type: "success",
        message: `Đã nén ${result.fileCount} ảnh, ${comparison}.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Không thể nén ảnh.",
      });
    }
  };

  const isWorking = status.type === "working";

  return (
    <section aria-label="Nén ảnh">
      <div className="section-heading">
        <div>
          <h2>Giảm dung lượng hình ảnh</h2>
          <p>Nén hàng loạt, đổi kích thước và định dạng ngay trên thiết bị.</p>
        </div>
        {files.length > 0 && (
          <button className="text-button" type="button" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" />
            Làm lại
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <DropZone
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          title="Thả ảnh JPG, PNG hoặc WebP vào đây"
          hint="có thể chọn tối đa 100 ảnh, mỗi ảnh tối đa 50 MB"
          onFiles={addFiles}
        />
      ) : (
        <>
          <div className="image-file-list">
            {files.map((file, index) => (
              <div
                className="image-file-row"
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              >
                <div className="image-file-icon" aria-hidden="true">
                  <FileImage size={21} />
                </div>
                <div className="file-row__content">
                  <p className="file-row__name" title={file.name}>
                    {file.name}
                  </p>
                  <p className="file-row__meta">{formatBytes(file.size)}</p>
                </div>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, fileIndex) => fileIndex !== index),
                    )
                  }
                  aria-label={`Xóa ${file.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <DropZone
            compact
            multiple
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            compactTitle="Thêm ảnh khác"
            onFiles={addFiles}
          />

          <div className="settings-grid settings-grid--three">
            <label className="field">
              <span>Định dạng đầu ra</span>
              <div className="select-wrap">
                <select
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as CompressedImageFormat)
                  }
                >
                  <option value="webp">WebP — nhẹ nhất</option>
                  <option value="jpeg">JPG — tương thích cao</option>
                  <option value="png">PNG — giữ nền trong suốt</option>
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
            </label>

            <label className="field">
              <span>Kích thước tối đa</span>
              <div className="select-wrap">
                <select
                  value={maxDimension}
                  onChange={(event) =>
                    setMaxDimension(Number(event.target.value))
                  }
                >
                  <option value={0}>Giữ nguyên kích thước</option>
                  <option value={2560}>2560 px — màn hình lớn</option>
                  <option value={1920}>1920 px — khuyến nghị</option>
                  <option value={1280}>1280 px — web/social</option>
                  <option value={800}>800 px — ảnh nhỏ</option>
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
            </label>

            <label className="field field--quality">
              <span>
                Chất lượng
                <strong>{format === "png" ? "Tự động" : `${Math.round(quality * 100)}%`}</strong>
              </span>
              <input
                type="range"
                min="0.4"
                max="0.95"
                step="0.05"
                value={quality}
                disabled={format === "png"}
                onChange={(event) => setQuality(Number(event.target.value))}
              />
            </label>
          </div>

          {format === "jpeg" && (
            <p className="setting-note">
              Ảnh có nền trong suốt sẽ được chuyển sang nền trắng khi xuất JPG.
            </p>
          )}

          <div className="summary-bar">
            <div>
              <span>{files.length} ảnh</span>
              <span aria-hidden="true">•</span>
              <span>{formatBytes(totalBytes)}</span>
              <span aria-hidden="true">•</span>
              <span>{format.toUpperCase()}</span>
            </div>
            <button
              className="button button--primary"
              type="button"
              disabled={isWorking || files.length === 0}
              onClick={runCompression}
            >
              {isWorking ? (
                <LoaderCircle className="spin" size={19} />
              ) : (
                <ImageDown size={19} />
              )}
              {isWorking ? "Đang nén ảnh" : "Nén và tải xuống"}
            </button>
          </div>
        </>
      )}

      {status.type !== "idle" && (
        <div className={`status status--${status.type}`} role="status">
          {status.type === "working" && (
            <LoaderCircle className="spin" size={18} />
          )}
          {status.type === "success" && <CheckCircle2 size={18} />}
          {status.type === "error" && <XCircle size={18} />}
          <span>{status.message}</span>
          {status.type === "working" && (
            <div
              className="progress"
              aria-label={`Tiến trình ${status.progress}%`}
            >
              <span style={{ width: `${status.progress}%` }} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
