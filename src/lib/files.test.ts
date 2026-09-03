import { describe, expect, it } from "vitest";
import { formatBytes, safeBaseName } from "./files";

describe("formatBytes", () => {
  it("formats file sizes for people", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1_536)).toBe("1.5 KB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12 MB");
  });
});

describe("safeBaseName", () => {
  it("creates a portable download name", () => {
    expect(safeBaseName("Hồ sơ khách hàng.pdf")).toBe("Ho-so-khach-hang");
    expect(safeBaseName("Ảnh sản phẩm.final.JPG")).toBe(
      "Anh-san-pham-final",
    );
    expect(safeBaseName("__.pdf")).toBe("__");
  });
});
