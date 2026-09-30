/**
 * Triggers a client-side file download. Lives in the UI layer because it is the
 * only place that touches the DOM download APIs.
 */
export function downloadTextFile(
  contents: string,
  filename: string,
  mimeType: string,
): void {
  // A leading BOM makes Excel read UTF-8 correctly instead of mangling accents.
  const blob = new Blob([`\uFEFF${contents}`], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
