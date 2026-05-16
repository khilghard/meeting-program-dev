/**
 * uuid v4 — self-contained vendor bundle
 * Source: uuid@13.0.2 (dist/v4.js, dist/native.js, dist/rng.js, dist/stringify.js, dist/validate.js)
 * License: MIT
 *
 * Exports: { v4 }  — matches `import { v4 as uuidv4 } from "uuid"`
 */

// --- native.js ---
const _randomUUID =
  typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);

// --- rng.js ---
let _getRandomValues;
const _rnds8 = new Uint8Array(16);
function _rng() {
  if (!_getRandomValues) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported");
    }
    _getRandomValues = crypto.getRandomValues.bind(crypto);
  }
  return _getRandomValues(_rnds8);
}

// --- stringify.js (unsafeStringify only) ---
const _byteToHex = [];
for (let _i = 0; _i < 256; ++_i) {
  _byteToHex.push((_i + 0x100).toString(16).slice(1));
}
function _unsafeStringify(arr, offset = 0) {
  return (
    _byteToHex[arr[offset + 0]] +
    _byteToHex[arr[offset + 1]] +
    _byteToHex[arr[offset + 2]] +
    _byteToHex[arr[offset + 3]] +
    "-" +
    _byteToHex[arr[offset + 4]] +
    _byteToHex[arr[offset + 5]] +
    "-" +
    _byteToHex[arr[offset + 6]] +
    _byteToHex[arr[offset + 7]] +
    "-" +
    _byteToHex[arr[offset + 8]] +
    _byteToHex[arr[offset + 9]] +
    "-" +
    _byteToHex[arr[offset + 10]] +
    _byteToHex[arr[offset + 11]] +
    _byteToHex[arr[offset + 12]] +
    _byteToHex[arr[offset + 13]] +
    _byteToHex[arr[offset + 14]] +
    _byteToHex[arr[offset + 15]]
  ).toLowerCase();
}

// --- v4.js ---
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? _rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(
        "UUID byte range " + offset + ":" + (offset + 15) + " is out of buffer bounds"
      );
    }
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return _unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (_randomUUID && !buf && !options) {
    return _randomUUID();
  }
  return _v4(options, buf, offset);
}

export { v4 };
