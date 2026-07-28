import {
  ArrowDown,
  ArrowUp,
  FileText,
  GripVertical,
  Trash2,
} from "lucide-react";
import { DragEvent } from "react";
import { formatBytes } from "../lib/files";
import { PdfFileInfo } from "../lib/pdf";

interface FileRowProps {
  item: PdfFileInfo;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onDragStart: (index: number) => void;
  onDropAt: (index: number) => void;
}

export function FileRow({
  item,
  index,
  total,
  onMove,
  onRemove,
  onDragStart,
  onDropAt,
}: FileRowProps) {
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDropAt(index);
  };

  return (
    <div
      className="file-row"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <GripVertical
        className="drag-handle"
        size={20}
        aria-label="Kéo để đổi thứ tự"
      />
      <div className="file-icon" aria-hidden="true">
        <FileText size={22} />
      </div>
      <div className="file-row__content">
        <p className="file-row__name" title={item.file.name}>
          {item.file.name}
        </p>
        <p className="file-row__meta">
          {item.pageCount} trang <span aria-hidden="true">•</span>{" "}
          {formatBytes(item.file.size)}
        </p>
      </div>
      <div className="file-row__actions">
        <button
          className="icon-button"
          type="button"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          aria-label={`Đưa ${item.file.name} lên`}
        >
          <ArrowUp size={18} />
        </button>
        <button
          className="icon-button"
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          aria-label={`Đưa ${item.file.name} xuống`}
        >
          <ArrowDown size={18} />
        </button>
        <button
          className="icon-button icon-button--danger"
          type="button"
          onClick={onRemove}
          aria-label={`Xóa ${item.file.name}`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
