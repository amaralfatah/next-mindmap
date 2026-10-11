/** File name safe on every OS, from a map title. */
export function fileNameFor(title: string, extension: string): string {
  const base =
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "mind-map";
  return base + extension;
}

/** Saves a blob or text through a temporary link. Browser only. */
export function download(data: Blob | string, fileName: string, type = "application/octet-stream"): void {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
