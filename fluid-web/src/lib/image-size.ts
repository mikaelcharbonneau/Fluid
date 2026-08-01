// Intrinsic pixel dimensions from a PNG or JPEG buffer.
//
// The masonry gallery needs an aspect ratio to reserve each card's box before
// its image loads, or the columns jump as they arrive. Reading it from the
// bytes keeps that automatic for newly catalogued references, rather than
// something remembered manually per upload.
//
// Deliberately dependency-free: the two headers below are simple, and adding
// an image library to read twelve bytes would be a poor trade.

export interface ImageSize {
  width: number;
  height: number;
}

function pngSize(buf: Buffer): ImageSize | null {
  // 8-byte signature, then an IHDR chunk whose data begins at byte 16 with
  // width and height as big-endian uint32s.
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf: Buffer): ImageSize | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++; // resynchronise rather than give up: padding bytes are legal
      continue;
    }
    const marker = buf[offset + 1];
    // SOF0-SOF15 carry the frame header, excluding the four that aren't
    // start-of-frame markers (DHT c4, JPG c8, DAC cc).
    const isSOF =
      marker >= 0xc0 && marker <= 0xcf &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2; // standalone marker, no length field
      continue;
    }
    const length = buf.readUInt16BE(offset + 2);
    if (length < 2) return null; // malformed; refuse rather than loop forever
    offset += 2 + length;
  }
  return null;
}

export function imageSize(buf: Buffer): ImageSize | null {
  const size = pngSize(buf) ?? jpegSize(buf);
  return size && size.width > 0 && size.height > 0 ? size : null;
}

/** Width / height, rounded to the column's scale, or null if unreadable. */
export function aspectRatioFrom(buf: Buffer): number | null {
  const size = imageSize(buf);
  return size ? Math.round((size.width / size.height) * 10000) / 10000 : null;
}
