import * as fs from "node:fs/promises";

export async function upDir() {
  return await fs.mkdtemp("bitcask")
}

export async function downDir(dir) {
  await fs.rm(dir, { recursive: true, force: true })  
}
