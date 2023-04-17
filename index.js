import fs from "node:fs/promises";
import path from "node:path";
export const ext = ".bitcask";

export const now = () => Math.floor(Date.now() / 1000);

export const headerSize = 16;

//  | header | key | value
export function entrySize(keySize, valueSize) {
  return headerSize + keySize + valueSize;
}

// offset | header | key| ///
export function valueOffset(offset, keySize) {
  return offset + headerSize + keySize;
}

//             header (16)                            |
// crc32(4) | timestamp(4) | keySize(4) | valueSize(4)|  key (keySize)  | value (valueSize)
export function encode(timestamp, keySize, valueSize, key, value) {
  const buf = Buffer.alloc(entrySize(keySize, valueSize));
  // header
  buf.writeUint32BE(timestamp, 4, 4);
  buf.writeUint32BE(keySize, 8, 4);
  buf.writeUint32BE(valueSize, 12, 16);

  // key and value
  buf.write(key, headerSize, keySize);
  buf.write(value, headerSize + keySize, valueSize);

  // TODO: calculate the crc32
  return buf;
}

export async function scanFiles(dir) {
  const files = await fs.readdir(dir);
  return files
    .filter((filename) => path.extname(filename) === ext)
    .map((filename) => ({
      filename,
      fid: getFid(filename),
    }))
    .sort((f1, f2) => f1.fid < f2.fid);
}

export function formatFid(fid) {
  return `${fid}`.padStart(6, 0);
}

export function getFid(filename) {
  const fid = Number(filename.slice(0, 6));

  if (isNaN(fid)) {
    throw new Error("Can't parse a filename");
  }

  return fid;
}

export async function getLastFid(dir) {
  const files = await scanFiles(dir);
  if (files.length > 0) {
    return files[files.length - 1].fid;
  }
  return 0;
}

export function filePath(dir, fid) {
  const filename = `${fid}${ext}`;
  return path.join(dir, filename);
}

export class BitFile {
  constructor(fid, file) {
    this.fid = fid;
    this.file = file;
    this.offset = 0;
  }

  static async createBitFile(dir) {
    const lastFid = await getLastFid(dir);
    const fid = lastFid + 1;
    const file = filePath(dir, formatFid(fid));
    return new BitFile(fid, file);
  }

  async write(key, value) {
    const timestamp = now();
    const keySize = key.length;
    const valueSize = value.length;
    const buf = encode(timestamp, keySize, valueSize, key, value);
    await fs.appendFile(this.file, buf);
    const valueOffset = this.offset + headerSize + keySize;
    this.offset += entrySize(keySize, valueSize);

    return {
      fid: this.fid,
      timestamp,
      valueSize,
      valueOffset,
    };
  }
}

export async function readFiles(dir, writeFid) {
  const files = await scanFiles(dir);
  return files.filter(({ fid }) => fid !== writeFid);
}

export class BitCask {
  constructor(dir) {
    this.keyDir = new Map();
    this.dir = dir;
  }

  static async initBitCask(dir) {
    const bc = new BitCask(dir);
    bc.writeFile = await BitFile.createBitFile(dir);
    bc.readFiles = await readFiles(dir, bc.writeFile.fid);
    await bc.#loadKeyDir();
    return bc;
  }

  async put(key, value) {
    const entry = await this.writeFile.write(key, value);
    this.keyDir.set(key, entry);
  }

  async get(key) {
    const { fid, valueOffset, valueSize } = this.keyDir.get(key);
    const filehandle = await fs.open(filePath(this.dir, formatFid(fid)));
    const { buffer } = await filehandle.read(
      Buffer.alloc(valueSize),
      0,
      valueSize,
      valueOffset
    );
    return buffer;
  }

  async #loadKeyDir() {
    for (const file of this.readFiles) {
      let b = await fs.readFile(path.join(this.dir, file.filename));
      let offset = 0;
      while (true) {
        try {
          const timestamp = b.readUInt32BE(offset + 4, 4);
          const keySize = b.readUInt32BE(offset + 8, 4);
          const valueSize = b.readUInt32BE(offset + 12, 4);
          const key = b.subarray(offset + 16, offset + 16 + keySize);
          const valueOffset = offset + 16 + keySize;

          this.keyDir.set(key.toString(), {
            fid: file.fid,
            timestamp,
            valueSize,
            valueOffset,
          });
          offset += 16 + keySize + valueSize;
        } catch (err) {
          // TODO: check corrupted files
          break;
        }
      }
    }
  }
}
