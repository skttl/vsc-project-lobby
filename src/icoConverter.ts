import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const BMP_DIB_HEADER = 0x28;

/**
 * Given a path to a `.ico` file, attempts to extract the largest embedded PNG
 * frame and write it to `storageDir` as a `.png` file.
 *
 * Supports both PNG-encoded ICO frames and legacy BMP/DIB-encoded frames.
 *
 * Returns the path to the extracted PNG, or `undefined` if extraction fails.
 */
export async function extractPngFromIco(
    icoPath: string,
    storageDir: string
): Promise<string | undefined> {
    let buf: Buffer;
    try {
        buf = await fs.readFile(icoPath);
    } catch {
        return undefined;
    }

    if (buf.length < 6) {
        return undefined;
    }

    const imageCount = buf.readUInt16LE(4);
    if (imageCount === 0) {
        return undefined;
    }

    let bestOffset = 0;
    let bestSize = 0;

    for (let i = 0; i < imageCount; i++) {
        const entryOffset = 6 + i * 16;
        if (entryOffset + 16 > buf.length) {
            break;
        }
        const size = buf.readUInt32LE(entryOffset + 8);
        const offset = buf.readUInt32LE(entryOffset + 12);
        if (size > bestSize) {
            bestSize = size;
            bestOffset = offset;
        }
    }

    if (bestSize === 0 || bestOffset + bestSize > buf.length) {
        return undefined;
    }

    const frame = buf.subarray(bestOffset, bestOffset + bestSize);

    let png: Buffer | undefined;

    if (frame.subarray(0, 4).equals(PNG_MAGIC)) {
        png = frame;
    } else if (frame.length >= 40 && frame.readUInt32LE(0) === BMP_DIB_HEADER) {
        png = bmpDibToPng(frame);
    }

    if (!png) {
        return undefined;
    }

    const hash = crypto.createHash('md5').update(icoPath).digest('hex');
    const outPath = path.join(storageDir, `favicon-${hash}.png`);

    try {
        await fs.mkdir(storageDir, { recursive: true });
        await fs.writeFile(outPath, png);
        return outPath;
    } catch {
        return undefined;
    }
}

/**
 * Converts a BMP DIB (as stored inside an ICO frame) to a PNG buffer.
 *
 * ICO BMP frames use a BITMAPINFOHEADER (40 bytes) with no file header.
 * The height in the DIB is doubled (XOR mask + AND mask stacked), so the real
 * image height is dibHeight / 2.  Pixels are stored bottom-up in BGRA order.
 */
function bmpDibToPng(dib: Buffer): Buffer | undefined {
    if (dib.length < 40) {
        return undefined;
    }

    const dibHeaderSize = dib.readUInt32LE(0);
    const width = dib.readInt32LE(4);
    const dibHeight = dib.readInt32LE(8);
    const bitCount = dib.readUInt16LE(14);
    const compression = dib.readUInt32LE(16);

    if (width <= 0 || dibHeight === 0) {
        return undefined;
    }

    const height = Math.abs(dibHeight) / 2;
    const topDown = dibHeight < 0;

    if (bitCount !== 32 || compression !== 0) {
        return undefined;
    }

    const pixelDataOffset = dibHeaderSize;
    const rowBytes = width * 4;
    const expectedBytes = rowBytes * height;

    if (pixelDataOffset + expectedBytes > dib.length) {
        return undefined;
    }

    const rgba = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
        const srcRow = topDown ? y : height - 1 - y;
        const srcBase = pixelDataOffset + srcRow * rowBytes;
        const dstBase = y * rowBytes;
        for (let x = 0; x < width; x++) {
            const s = srcBase + x * 4;
            const d = dstBase + x * 4;
            rgba[d + 0] = dib[s + 2];
            rgba[d + 1] = dib[s + 1];
            rgba[d + 2] = dib[s + 0];
            rgba[d + 3] = dib[s + 3];
        }
    }

    return encodePng(rgba, width, height);
}

function encodePng(rgba: Buffer, width: number, height: number): Buffer {
    const rowBytes = width * 4;

    const filtered = Buffer.alloc(height * (1 + rowBytes));
    for (let y = 0; y < height; y++) {
        filtered[y * (1 + rowBytes)] = 0;
        rgba.copy(filtered, y * (1 + rowBytes) + 1, y * rowBytes, (y + 1) * rowBytes);
    }

    const compressed = zlib.deflateSync(filtered, { level: 6 });

    const chunks: Buffer[] = [];

    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    chunks.push(sig);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    chunks.push(makePngChunk('IHDR', ihdr));

    chunks.push(makePngChunk('IDAT', compressed));

    chunks.push(makePngChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

function makePngChunk(type: string, data: Buffer): Buffer {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBytes, data]);
    const crcVal = pngCrc32(crcInput);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBytes, data, crc]);
}

const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        t[n] = c;
    }
    return t;
})();

function pngCrc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
