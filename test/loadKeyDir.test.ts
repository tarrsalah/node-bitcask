import { test } from "node:test";
import assert from "node:assert/strict";
import { upDir, downDir } from "../test-utils";
import { BitCask, BitFile } from "../index";

test("loadKeyDir", async () => {
  const dir = await upDir();
  try {
    let bf = await BitFile.createBitFile(dir);

    await bf.write("key-1", "value-1");
    await bf.write("key-2", "value-2");
    await bf.write("key-1", "value-1*");
    const bc = await BitCask.initBitCask(dir);
    assert.equal(bc.keyDir.size, 2);

    const value_1 = await bc.get("key-1");
    assert.equal(value_1?.toString(), "value-1*");

    const value_2 = await bc.get("key-2");
    assert.equal(value_2?.toString(), "value-2");
  } finally {
    await downDir(dir);
  }
});
