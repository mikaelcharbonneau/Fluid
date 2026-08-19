"use client";

// Intrinsic pixel dimensions of the 24 static collage images in
// public/assets/assets/collage/, read off the files themselves.
//
// #171 asks that images reserve their layout space. These carry 23 distinct
// aspect ratios, so one shared width/height would either letterbox them or
// shift the column as each loads — next/image needs the real numbers. Keyed
// by the trailing number in brand-NN.png.
//
// (Those files are named .png but hold JPEG data; next/image reads the real
// format from the bytes, so the extension mismatch is harmless — but it is
// why these dimensions are recorded rather than inferred from the name.)
//
// collage-dimensions.test.ts fails if this table and the files disagree.
export const COLLAGE_DIMENSIONS: Record<number, { width: number; height: number }> = {
  1: { width: 440, height: 286 },
  2: { width: 440, height: 322 },
  3: { width: 440, height: 234 },
  4: { width: 440, height: 271 },
  5: { width: 311, height: 440 },
  6: { width: 440, height: 330 },
  7: { width: 440, height: 251 },
  8: { width: 440, height: 249 },
  9: { width: 440, height: 291 },
  10: { width: 440, height: 274 },
  11: { width: 330, height: 440 },
  12: { width: 330, height: 440 },
  13: { width: 348, height: 440 },
  14: { width: 440, height: 440 },
  15: { width: 352, height: 440 },
  16: { width: 440, height: 339 },
  17: { width: 440, height: 292 },
  18: { width: 249, height: 440 },
  19: { width: 388, height: 440 },
  20: { width: 440, height: 182 },
  21: { width: 440, height: 327 },
  22: { width: 440, height: 272 },
  23: { width: 440, height: 244 },
  24: { width: 440, height: 253 },
};
