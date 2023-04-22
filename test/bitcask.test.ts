import { test } from "node:test";
import assert from "node:assert/strict";
import { downDir, upDir } from "../test-utils";
import { BitCask } from "../index";

test("bitcask", async (t) => {
  let dir: string;
  t.beforeEach(async () => {
    dir = await upDir();
  });

  t.afterEach(async () => {
    await downDir(dir);
  });

  await t.test("One writefile", async () => {
    const bitcask = await BitCask.initBitCask(dir);
    await bitcask.put("key", "value");
    const value = (await bitcask.get("key")) as unknown as Buffer;
    assert.equal(value.toString(), "value");
  });

  await t.test("Get the latest value ", async () => {
    const bitcask = await BitCask.initBitCask(dir);
    await bitcask.put("k", "v1");
    await bitcask.put("k", "v2");
    await bitcask
      .get("k")
      .then((value) => assert.equal(value?.toString(), "v2"));
  });

  await t.test("Get value from old bitfiles", async (t) => {
    await BitCask.initBitCask(dir).then((b) => {
      b.put("k1", "v1");
    });

    await BitCask.initBitCask(dir).then((b) => {
      b.put("k2", "v2");
    });

    const b = await BitCask.initBitCask(dir);
    await b.put("k3", "v3");

    await b.get("k1").then((v) => {
      assert.equal(v?.toString(), "v1");
    });

    await b.get("k2").then((v) => {
      assert.equal(v?.toString(), "v2");
    });
  });

  await t.test("check writeFile size", async () => {
    await assert.rejects(
      BitCask.initBitCask(dir, 0).then((bc) => bc.put("key", "value")),
      (err: Error) => {
        assert.ok(err.message);
        return true;
      }
    );
  });
});
