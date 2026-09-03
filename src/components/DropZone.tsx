import { FilePlus2, ShieldCheck } from "lucide-react";
import { DragEvent, useRef, useState } from "react";

interface DropZoneProps {
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
  accept?: string;
  title?: string;
  hint?: string;
  compactTitle?: string;
}

export function DropZone({
  multiple = false,
  onFiles,
  compact = false,
  accept = ".pdf,application/pdf",
  title = "Thả file PDF vào đây",
  hint = "hoặc chọn file từ thiết bị",
  compactTitle = "Thêm PDF khác",
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      className={`drop-zone ${compact ? "drop-zone--compact" : ""} ${isDragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <div className="drop-zone__icon" aria-hidden="true">
        <FilePlus2 size={24} />
      </div>
      <div>
        <p className="drop-zone__title">
          {compact ? compactTitle : title}
        </p>
        {!compact && <p className="drop-zone__hint">{hint}</p>}
      </div>
      <button
        className="button button--secondary"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        Chọn file
      </button>
      {!compact && (
        <p className="privacy-note">
          <ShieldCheck size={16} aria-hidden="true" />
          Xử lý ngay trên thiết bị, không tải file lên mạng
        </p>
      )}
    </div>
  );
}
