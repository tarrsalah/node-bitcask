import test from "node:test";
import assert from "node:assert/strict";
import { downDir, upDir } from "../test-utils";
import { BitCask } from "../index";

test("bitcask", async () => {
  let dir: string;
  try {
    dir = await upDir();
    const bitcask = await BitCask.initBitCask(dir);
    await bitcask.put("key", "value");
    const value = await bitcask.get("key") as unknown as Buffer;
    assert(value.toString(), "value");
  } finally {
    downDir(dir!!);
  }
});
