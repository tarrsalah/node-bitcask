import path from "node:path";
import process from "node:process";
import { BitCask, createServer } from ".";

BitCask.initBitCask(path.join(process.cwd(), "_dir")).then(async (bitcask) => {
  await bitcask.put("xkey", "xvalue");
  createServer(bitcask).listen(3000);
});
