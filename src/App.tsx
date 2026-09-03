import {
  CheckCircle2,
  ChevronDown,
  Download,
  Files,
  Image,
  ImageDown,
  LoaderCircle,
  LockKeyhole,
  Merge,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { DropZone } from "./components/DropZone";
import { FileRow } from "./components/FileRow";
import { ImageCompressor } from "./components/ImageCompressor";
import { downloadBlob, formatBytes, isPdf } from "./lib/files";
import {
  convertPdfToImages,
  ImageFormat,
  inspectPdf,
  mergePdfs,
  PdfFileInfo,
} from "./lib/pdf";

type Mode = "merge" | "convert" | "compress";
type Status =
  | { type: "idle" }
  | { type: "working"; message: string; progress?: number }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Đã xảy ra lỗi.";
  if (/encrypted|password/i.test(raw)) {
    return "PDF được bảo vệ bằng mật khẩu. Hãy mở khóa file rồi thử lại.";
  }
  if (/Invalid PDF|Failed to parse/i.test(raw)) {
    return "File PDF không hợp lệ hoặc đã bị hỏng.";
  }
  return raw;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("merge");
  const [mergeFiles, setMergeFiles] = useState<PdfFileInfo[]>([]);
  const [convertFile, setConvertFile] = useState<PdfFileInfo | null>(null);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.92);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const draggedIndex = useRef<number | null>(null);

  const totalMergePages = useMemo(
    () => mergeFiles.reduce((sum, item) => sum + item.pageCount, 0),
    [mergeFiles],
  );

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setStatus({ type: "idle" });
  };

  const inspectFiles = async (files: File[]) => {
    if (files.length === 0 || files.some((file) => !isPdf(file))) {
      throw new Error("Chỉ chấp nhận file PDF.");
    }
    const pdfFiles = files.filter(isPdf);
    return Promise.all(
      pdfFiles.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        pageCount: await inspectPdf(file),
      })),
    );
  };

  const addMergeFiles = async (files: File[]) => {
    try {
      setStatus({ type: "working", message: "Đang đọc file PDF..." });
      const inspected = await inspectFiles(files);
      setMergeFiles((current) => [...current, ...inspected]);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: errorMessage(error) });
    }
  };

  const selectConvertFile = async (files: File[]) => {
    const first = files.find(isPdf);
    if (!first) {
      setStatus({ type: "error", message: "Vui lòng chọn một file PDF." });
      return;
    }
    try {
      setStatus({ type: "working", message: "Đang đọc file PDF..." });
      const pageCount = await inspectPdf(first);
      setConvertFile({
        id: `${first.name}-${first.size}-${first.lastModified}`,
        file: first,
        pageCount,
      });
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: errorMessage(error) });
    }
  };

  const moveFile = (from: number, to: number) => {
    if (to < 0 || to >= mergeFiles.length) return;
    setMergeFiles((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const runMerge = async () => {
    try {
      setStatus({ type: "working", message: "Đang gộp PDF..." });
      const result = await mergePdfs(mergeFiles.map((item) => item.file));
      downloadBlob(result, `pdf-da-gop-${Date.now()}.pdf`);
      setStatus({
        type: "success",
        message: `Đã gộp ${mergeFiles.length} file, tổng ${totalMergePages} trang.`,
      });
    } catch (error) {
      setStatus({ type: "error", message: errorMessage(error) });
    }
  };

  const runConvert = async () => {
    if (!convertFile) return;
    try {
      setStatus({
        type: "working",
        message: "Đang chuyển trang 1...",
        progress: 0,
      });
      const result = await convertPdfToImages(convertFile.file, {
        format,
        dpi,
        quality,
        onProgress: (page, total) =>
          setStatus({
            type: "working",
            message: `Đang chuyển trang ${page}/${total}...`,
            progress: Math.round((page / total) * 100),
          }),
      });
      downloadBlob(result.blob, result.filename);
      setStatus({
        type: "success",
        message: `Đã xuất ${convertFile.pageCount} ảnh vào file ZIP.`,
      });
    } catch (error) {
      setStatus({ type: "error", message: errorMessage(error) });
    }
  };

  const isWorking = status.type === "working";

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            <img src="./app-icon.png" alt="" />
          </div>
          <div>
            <p className="brand__name">PDF Studio</p>
            <p className="brand__tagline">Gọn file. Nhanh việc.</p>
          </div>
        </div>
        <div className="local-badge">
          <LockKeyhole size={16} aria-hidden="true" />
          Riêng tư trên thiết bị
        </div>
      </header>

      <section className="workspace" aria-labelledby="page-title">
        <div className="workspace__intro">
          <p className="eyebrow">CÔNG CỤ PDF</p>
          <h1 id="page-title">
            Xử lý PDF nhanh,
            <br />
            không làm giảm chất lượng.
          </h1>
          <p>
            File được xử lý ngay trong trình duyệt và không rời khỏi thiết bị
            của bạn.
          </p>
        </div>

        <div className="tool-card">
          <div className="tabs" role="tablist" aria-label="Chọn công cụ PDF">
            <button
              className={`tab ${mode === "merge" ? "is-active" : ""}`}
              role="tab"
              aria-selected={mode === "merge"}
              type="button"
              onClick={() => switchMode("merge")}
            >
              <Merge size={18} aria-hidden="true" />
              Gộp PDF
            </button>
            <button
              className={`tab ${mode === "convert" ? "is-active" : ""}`}
              role="tab"
              aria-selected={mode === "convert"}
              type="button"
              onClick={() => switchMode("convert")}
            >
              <Image size={18} aria-hidden="true" />
              PDF sang ảnh
            </button>
            <button
              className={`tab ${mode === "compress" ? "is-active" : ""}`}
              role="tab"
              aria-selected={mode === "compress"}
              type="button"
              onClick={() => switchMode("compress")}
            >
              <ImageDown size={18} aria-hidden="true" />
              Nén ảnh
            </button>
          </div>

          <div className="tool-card__body">
            {mode === "merge" ? (
              <section aria-label="Gộp PDF">
                <div className="section-heading">
                  <div>
                    <h2>Gộp nhiều file thành một</h2>
                    <p>Kéo để sắp xếp đúng thứ tự trang trước khi gộp.</p>
                  </div>
                  {mergeFiles.length > 0 && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        setMergeFiles([]);
                        setStatus({ type: "idle" });
                      }}
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      Làm lại
                    </button>
                  )}
                </div>

                {mergeFiles.length === 0 ? (
                  <DropZone multiple onFiles={addMergeFiles} />
                ) : (
                  <>
                    <div className="file-list">
                      {mergeFiles.map((item, index) => (
                        <FileRow
                          key={item.id}
                          item={item}
                          index={index}
                          total={mergeFiles.length}
                          onMove={moveFile}
                          onRemove={() =>
                            setMergeFiles((current) =>
                              current.filter((entry) => entry.id !== item.id),
                            )
                          }
                          onDragStart={(dragIndex) => {
                            draggedIndex.current = dragIndex;
                          }}
                          onDropAt={(dropIndex) => {
                            if (draggedIndex.current !== null) {
                              moveFile(draggedIndex.current, dropIndex);
                              draggedIndex.current = null;
                            }
                          }}
                        />
                      ))}
                    </div>
                    <DropZone compact multiple onFiles={addMergeFiles} />
                    <div className="summary-bar">
                      <div>
                        <span>{mergeFiles.length} file</span>
                        <span aria-hidden="true">•</span>
                        <span>{totalMergePages} trang</span>
                        <span aria-hidden="true">•</span>
                        <span>
                          {formatBytes(
                            mergeFiles.reduce(
                              (sum, item) => sum + item.file.size,
                              0,
                            ),
                          )}
                        </span>
                      </div>
                      <button
                        className="button button--primary"
                        type="button"
                        disabled={mergeFiles.length < 2 || isWorking}
                        onClick={runMerge}
                      >
                        {isWorking ? (
                          <LoaderCircle className="spin" size={19} />
                        ) : (
                          <Download size={19} />
                        )}
                        {isWorking ? "Đang xử lý" : "Gộp và tải xuống"}
                      </button>
                    </div>
                  </>
                )}
              </section>
            ) : mode === "convert" ? (
              <section aria-label="Chuyển PDF sang ảnh">
                <div className="section-heading">
                  <div>
                    <h2>Chuyển từng trang thành ảnh</h2>
                    <p>Toàn bộ ảnh được đóng gói trong một file ZIP.</p>
                  </div>
                  {convertFile && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        setConvertFile(null);
                        setStatus({ type: "idle" });
                      }}
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      Đổi file
                    </button>
                  )}
                </div>

                {!convertFile ? (
                  <DropZone onFiles={selectConvertFile} />
                ) : (
                  <>
                    <div className="selected-file">
                      <div className="file-icon" aria-hidden="true">
                        <Files size={24} />
                      </div>
                      <div>
                        <p className="file-row__name">{convertFile.file.name}</p>
                        <p className="file-row__meta">
                          {convertFile.pageCount} trang{" "}
                          <span aria-hidden="true">•</span>{" "}
                          {formatBytes(convertFile.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="settings-grid">
                      <label className="field">
                        <span>Định dạng ảnh</span>
                        <div className="select-wrap">
                          <select
                            value={format}
                            onChange={(event) =>
                              setFormat(event.target.value as ImageFormat)
                            }
                          >
                            <option value="png">PNG — nét, nền trong suốt</option>
                            <option value="jpeg">JPG — dung lượng nhỏ</option>
                            <option value="webp">WebP — tối ưu cho web</option>
                          </select>
                          <ChevronDown size={17} aria-hidden="true" />
                        </div>
                      </label>

                      <label className="field">
                        <span>Độ phân giải</span>
                        <div className="select-wrap">
                          <select
                            value={dpi}
                            onChange={(event) =>
                              setDpi(Number(event.target.value))
                            }
                          >
                            <option value={96}>96 DPI — xem màn hình</option>
                            <option value={150}>150 DPI — cân bằng</option>
                            <option value={300}>300 DPI — in ấn</option>
                          </select>
                          <ChevronDown size={17} aria-hidden="true" />
                        </div>
                      </label>
                    </div>

                    {format !== "png" && (
                      <label className="range-field">
                        <span>
                          Chất lượng ảnh
                          <strong>{Math.round(quality * 100)}%</strong>
                        </span>
                        <input
                          type="range"
                          min="0.6"
                          max="1"
                          step="0.02"
                          value={quality}
                          onChange={(event) =>
                            setQuality(Number(event.target.value))
                          }
                        />
                      </label>
                    )}

                    <div className="summary-bar">
                      <div>
                        <span>{convertFile.pageCount} ảnh</span>
                        <span aria-hidden="true">•</span>
                        <span>{format.toUpperCase()}</span>
                        <span aria-hidden="true">•</span>
                        <span>{dpi} DPI</span>
                      </div>
                      <button
                        className="button button--primary"
                        type="button"
                        disabled={isWorking}
                        onClick={runConvert}
                      >
                        {isWorking ? (
                          <LoaderCircle className="spin" size={19} />
                        ) : (
                          <Download size={19} />
                        )}
                        {isWorking ? "Đang xuất ảnh" : "Chuyển đổi và tải ZIP"}
                      </button>
                    </div>
                  </>
                )}
              </section>
            ) : (
              <ImageCompressor />
            )}

            {status.type !== "idle" && (
              <div className={`status status--${status.type}`} role="status">
                {status.type === "working" && (
                  <LoaderCircle className="spin" size={18} />
                )}
                {status.type === "success" && <CheckCircle2 size={18} />}
                {status.type === "error" && <XCircle size={18} />}
                <span>{status.message}</span>
                {status.type === "working" &&
                  status.progress !== undefined && (
                    <div
                      className="progress"
                      aria-label={`Tiến trình ${status.progress}%`}
                    >
                      <span style={{ width: `${status.progress}%` }} />
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="quality-note">
          <CheckCircle2 size={18} aria-hidden="true" />
          <p>
            <strong>Xử lý hoàn toàn cục bộ:</strong> PDF và hình ảnh không được
            tải lên máy chủ, mọi thao tác diễn ra ngay trên thiết bị.
          </p>
        </div>
      </section>

      <footer>
        PDF Studio chạy cục bộ. PDF có mật khẩu cần được mở khóa trước khi xử
        lý.
      </footer>
    </main>
  );
}
