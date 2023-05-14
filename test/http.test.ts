import { test } from "node:test";
import assert from "node:assert/strict";
import {Buffer} from "node:buffer";
import { BitCask, createServer } from "../index";
import request from "supertest";
import { downDir, upDir } from "../test-utils";

test("http", async (t) => {
  let dir: string;
  t.beforeEach(async () => {
    dir = await upDir();
  });

  t.afterEach(async () => {
    await downDir(dir);
  });

  await t.test("malformed", async () => {
    const bitcask = await BitCask.initBitCask(dir);
    const server = createServer(bitcask);
    const response = await request(server).get("/");
    assert.equal(response.statusCode, 420);
  });

  await t.test("not found!", async () => {
    const bitcask = await BitCask.initBitCask(dir);
    const server = createServer(bitcask);
    const response = await request(server).get("/?key=valhala");
    assert.equal(response.statusCode, 404);
  });

  await t.test("found!", async () => {
    const bitcask = await BitCask.initBitCask(dir);
    await bitcask.put("xkey", "xval");
    const server = createServer(bitcask);
    const response = await request(server).get("/?key=xkey");
    assert.equal(response.statusCode, 200);

    const value = (response.body as Buffer).toString();
    debugger;
    assert.equal(value, "xval");
  });
});
