import test from "node:test";
import assert from "node:assert/strict";
import { downDir, upDir } from "../test-utils.js";
import { BitCask } from "../index.js";

test("bitcask", async () => {
  let dir;
  try {
    dir = await upDir();
    const bitcask = await BitCask.initBitCask(dir);
    await bitcask.put("key", "value");
    const value = await bitcask.get("key");
    assert(value.toString(), "value");
  } finally {
    downDir(dir);
  }
});
