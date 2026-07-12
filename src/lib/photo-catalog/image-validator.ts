import { createHash } from 'crypto';
import { readFileSync } from 'fs';

const IMAGE_SIGNATURES: Array<{ ext: string; check: (buf: Buffer) => boolean }> = [
  {
    ext: 'jpg',
    check: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    ext: 'png',
    check: (buf) =>
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
  },
  {
    ext: 'webp',
    check: (buf) =>
      buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP',
  },
];

export function hashFileContent(filePath: string): string {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

export function isValidImageFile(filePath: string): boolean {
  try {
    const buf = readFileSync(filePath);
    if (buf.length < 12) return false;

    const ext = filePath.toLowerCase().split('.').pop();
    if (ext === 'jpeg' || ext === 'jpg') {
      return IMAGE_SIGNATURES[0].check(buf);
    }
    if (ext === 'png') return IMAGE_SIGNATURES[1].check(buf);
    if (ext === 'webp') return IMAGE_SIGNATURES[2].check(buf);
    return false;
  } catch {
    return false;
  }
}
