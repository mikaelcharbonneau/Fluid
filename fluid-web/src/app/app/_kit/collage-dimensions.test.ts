import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COLLAGE_DIMENSIONS } from "./collage-dimensions";

// The dimensions in collage-dimensions.ts are what next/image uses to reserve
// each collage tile's box (#171). They are transcribed from the files, so they
// can silently go stale the moment someone swaps an image — and a wrong number
// there is worse than no number: the tile reserves the wrong space and the
// column shifts anyway. This re-reads the files and checks.
const COLLAGE_DIR = path.join(process.cwd(), "public/assets/assets/collage");

/** Intrinsic size from the file's own bytes. These are named .png but hold
 *  JPEG data, so sniff the signature rather than trusting the extension. */
function intrinsicSize(file: string): { width: number; height: number } | null {
  const buf = fs.readFileSync(file);

  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15 carry the dimensions.
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

describe("collage dimensions match the files on disk", () => {
  const files = fs.readdirSync(COLLAGE_DIR).filter((f) => f.endsWith(".png")).sort();

  it("has an entry for every collage file and no extras", () => {
    const indexesOnDisk = files.map((f) => Number(f.match(/brand-(\d+)\.png/)![1])).sort((a, b) => a - b);
    const indexesInTable = Object.keys(COLLAGE_DIMENSIONS).map(Number).sort((a, b) => a - b);
    expect(indexesInTable).toEqual(indexesOnDisk);
  });

  it.each(files)("%s matches its recorded width and height", (file) => {
    const index = Number(file.match(/brand-(\d+)\.png/)![1]);
    const actual = intrinsicSize(path.join(COLLAGE_DIR, file));
    expect(actual, `could not read dimensions from ${file}`).not.toBeNull();
    expect(COLLAGE_DIMENSIONS[index]).toEqual(actual);
  });
});
