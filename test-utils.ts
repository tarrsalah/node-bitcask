import * as fs from "node:fs/promises";

export async function upDir() {
  return await fs.mkdtemp("_bitcask")
}

export async function downDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true })  
}
