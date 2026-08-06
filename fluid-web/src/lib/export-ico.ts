// A real multi-resolution .ico.
//
// A favicon is the one place where "just rename a PNG" genuinely fails: an .ico
// is a container, and browsers pick the size they need out of it. The format is
// small enough to write directly — a six-byte header, a sixteen-byte directory
// entry per image, then the images end to end.
//
// Since Windows Vista an entry's payload may be a PNG rather than a BMP, which
// is what makes this tractable: the sizes are rasterised by the canvas we
// already use, and packed here unmodified.

export interface IcoImage {
  size: number; // square, 1..256
  png: Uint8Array;
}

const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;

export function buildIco(images: IcoImage[]): Uint8Array {
  const usable = images
    .filter((i) => i.png?.length && i.size >= 1 && i.size <= 256)
    .sort((a, b) => a.size - b.size);
  if (!usable.length) throw new Error("No images to pack into an icon.");

  const total =
    HEADER_BYTES +
    ENTRY_BYTES * usable.length +
    usable.reduce((n, i) => n + i.png.length, 0);
  const buf = new Uint8Array(total);
  const view = new DataView(buf.buffer);
  let pos = 0;

  // ICONDIR: reserved, type 1 (icon), image count. Little-endian throughout.
  view.setUint16(pos, 0, true); pos += 2;
  view.setUint16(pos, 1, true); pos += 2;
  view.setUint16(pos, usable.length, true); pos += 2;

  let dataAt = HEADER_BYTES + ENTRY_BYTES * usable.length;
  for (const img of usable) {
    // 256 is stored as 0 — the field is one byte, so 256 does not fit.
    buf[pos++] = img.size >= 256 ? 0 : img.size;
    buf[pos++] = img.size >= 256 ? 0 : img.size;
    buf[pos++] = 0; // palette size; 0 for truecolour
    buf[pos++] = 0; // reserved
    view.setUint16(pos, 1, true); pos += 2; // colour planes
    view.setUint16(pos, 32, true); pos += 2; // bits per pixel
    view.setUint32(pos, img.png.length, true); pos += 4;
    view.setUint32(pos, dataAt, true); pos += 4;
    dataAt += img.png.length;
  }

  for (const img of usable) {
    buf.set(img.png, pos);
    pos += img.png.length;
  }
  return buf;
}
