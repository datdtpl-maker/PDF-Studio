import { FilePlus2, ShieldCheck } from "lucide-react";
import { DragEvent, useRef, useState } from "react";

interface DropZoneProps {
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export function DropZone({
  multiple = false,
  onFiles,
  compact = false,
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
        accept=".pdf,application/pdf"
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
          {compact ? "Thêm PDF khác" : "Thả file PDF vào đây"}
        </p>
        {!compact && <p className="drop-zone__hint">hoặc chọn file từ thiết bị</p>}
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
