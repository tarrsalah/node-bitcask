import {test} from "node:test";
import assert from "node:assert/strict";
import { encode, now, headerSize } from "../index";

test("encode", () => {
  const key = "key";
  const value = "value";
  const keySize = key.length;
  const valueSize = value.length;
  const buf = encode(now(), keySize, valueSize, key, value);
  const bufValue = buf
    .subarray(headerSize + keySize, headerSize + keySize + valueSize)
    .toString("utf8");
  assert.equal(value, bufValue);
});
