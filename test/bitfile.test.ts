import {test} from "node:test";
import assert from "node:assert/strict";
import { BitFile } from "../index";
import { upDir, downDir } from "../test-utils";

test("bitfile", async () => {
  const dir = await upDir();
  try {
    const bf = await BitFile.createBitFile(dir);
    const entry_1 = await bf.write("key_1", "value_1");
    assert.equal(entry_1.valueSize, "value_1".length);

    const entry_2 = await bf.write("key_2", "value_2");
    assert.equal(entry_2.valueSize, "value_2".length);

  } finally {
    await downDir(dir);
  }
});
