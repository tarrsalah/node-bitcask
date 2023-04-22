import fs from "node:fs/promises";
import path from "node:path";
export const ext = ".bitcask";

export interface File {
  filename: string;
  fid: number;
}

export const now = () => Math.floor(Date.now() / 1000);

export const headerSize = 16;

//  | header | key | value
export function entrySize(keySize: number, valueSize: number) {
  return headerSize + keySize + valueSize;
}

// offset | header | key| ///
export function valueOffset(offset: number, keySize: number) {
  return offset + headerSize + keySize;
}

//             header (16)                            |
// crc32(4) | timestamp(4) | keySize(4) | valueSize(4)|  key (keySize)  | value (valueSize)
export function encode(
  timestamp: number,
  keySize: number,
  valueSize: number,
  key: string,
  value: string
) {
  const buf = Buffer.alloc(entrySize(keySize, valueSize));
  // header
  buf.writeUint32BE(timestamp, 4);
  buf.writeUint32BE(keySize, 8);
  buf.writeUint32BE(valueSize, 12);

  // key and value
  buf.write(key, headerSize, keySize, "binary");
  buf.write(value, headerSize + keySize, valueSize, "binary");

  // TODO: calculate the crc32
  return buf;
}

export async function scanFiles(dir: string): Promise<File[]> {
  const files = await fs.readdir(dir);
  return files
    .filter((filename) => path.extname(filename) === ext)
    .map((filename) => ({
      filename,
      fid: getFid(filename),
    }))
    .sort((f1, f2) => (f1.fid <= f2.fid ? 1 : -1));
}

export function formatFid(fid: number): string {
  return `${fid}`.padStart(6, "0");
}

export function getFid(filename: string) {
  const fid = Number(filename.slice(0, 6));

  if (isNaN(fid)) {
    throw new Error("Can't parse a filename");
  }

  return fid;
}

export async function getLastFid(dir: string): Promise<number> {
  const files = await scanFiles(dir);
  if (files.length > 0) {
    return files[0].fid;
  }
  return 0;
}

export function filePath(dir: string, formattedFid: string): string {
  const filename = `${formattedFid}${ext}`;
  return path.join(dir, filename);
}

export interface Entry {
  fid: number;
  timestamp: number;
  valueSize: number;
  valueOffset: number;
}

export class BitFile {
  fid: number;
  file: string;
  offset: number;

  constructor(fid: number, file: string) {
    this.fid = fid;
    this.file = file;
    this.offset = 0;
  }

  static async createBitFile(dir: string) {
    const lastFid = await getLastFid(dir);
    const fid = lastFid + 1;
    const file = filePath(dir, formatFid(fid));
    return new BitFile(fid, file);
  }

  async write(key: string, value: string): Promise<Entry> {
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

export async function readFiles(dir: string, writeFid: number) {
  const files = await scanFiles(dir);
  return files.filter(({ fid }) => fid !== writeFid);
}

export class BitCask {
  static defaultMaxSize = 1 << 10;

  dir: string;
  writeFile?: BitFile;
  readFiles: File[];
  maxFileSize: number;

  keyDir: Map<string, Entry>;

  constructor(dir: string, maxFileSize?: number) {
    this.keyDir = new Map();
    this.readFiles = [];
    this.dir = dir;
    if (maxFileSize === undefined) {
      this.maxFileSize = BitCask.defaultMaxSize;
    } else {
      this.maxFileSize = maxFileSize;
    }
  }

  static async initBitCask(dir: string, maxFileSize?: number) {
    const bc = new BitCask(dir, maxFileSize);
    bc.writeFile = await BitFile.createBitFile(dir);
    bc.readFiles = await readFiles(dir, bc.writeFile.fid);
    await bc.#loadKeyDir();
    return bc;
  }

  async put(key: string, value: string) {
    if (!this.writeFile) {
      throw new Error("No write file");
    }
    const keySize = key.length;
    const valueSize = value.length;

    if (keySize + valueSize > this.maxFileSize) {
      throw new Error("Values are too big to store");
    }

    if (
      this.writeFile.offset + entrySize(key.length, value.length) >
      this.maxFileSize
    ) {
      this.readFiles.push({
        filename: this.writeFile.file,
        fid: this.writeFile.fid,
      });
      this.writeFile = await BitFile.createBitFile(this.dir);
    }

    const entry = await this.writeFile.write(key, value);
    this.keyDir.set(key, entry);
  }

  async get(key: string) {
    const value = this.keyDir.get(key);
    if (value === undefined) {
      return undefined;
    }
    const { fid, valueOffset, valueSize } = value;
    const filehandle = await fs.open(filePath(this.dir, formatFid(fid)));
    const { buffer } = await filehandle.read(
      Buffer.alloc(valueSize),
      0,
      valueSize,
      valueOffset
    );
    await filehandle.close();
    return buffer;
  }

  async #loadKeyDir() {
    for (const file of this.readFiles) {
      let b = await fs.readFile(path.join(this.dir, file.filename));
      let offset = 0;
      while (true) {
        try {
          const timestamp = b.readUInt32BE(offset + 4);
          const keySize = b.readUInt32BE(offset + 8);
          const valueSize = b.readUInt32BE(offset + 12);
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
