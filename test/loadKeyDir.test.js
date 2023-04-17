import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { upDir, downDir } from "../test-utils.js";
import { BitCask, BitFile} from "../index.js";

test("loadKeyDir", async () => {
  const dir = await upDir();
  try {
    let bf = await BitFile.createBitFile(dir);

    await bf.write("key-1", "value-1");
    await bf.write("key-2", "value-2");
    await bf.write("key-1", "value-1*");
    const bc = await BitCask.initBitCask(dir);
    assert.equal(bc.keyDir.size, 2);
    
  } finally {
    await downDir(dir);
  }
});
