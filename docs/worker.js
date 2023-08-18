(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }
  });

  // node_modules/pbf/index.js
  var require_pbf = __commonJS({
    "node_modules/pbf/index.js"(exports, module) {
      "use strict";
      module.exports = Pbf;
      var ieee754 = require_ieee754();
      function Pbf(buf) {
        this.buf = ArrayBuffer.isView && ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf || 0);
        this.pos = 0;
        this.type = 0;
        this.length = this.buf.length;
      }
      Pbf.Varint = 0;
      Pbf.Fixed64 = 1;
      Pbf.Bytes = 2;
      Pbf.Fixed32 = 5;
      var SHIFT_LEFT_32 = (1 << 16) * (1 << 16);
      var SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32;
      var TEXT_DECODER_MIN_LENGTH = 12;
      var utf8TextDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder("utf8");
      Pbf.prototype = {
        destroy: function() {
          this.buf = null;
        },
        // === READING =================================================================
        readFields: function(readField, result, end) {
          end = end || this.length;
          while (this.pos < end) {
            var val = this.readVarint(), tag = val >> 3, startPos = this.pos;
            this.type = val & 7;
            readField(tag, result, this);
            if (this.pos === startPos)
              this.skip(val);
          }
          return result;
        },
        readMessage: function(readField, result) {
          return this.readFields(readField, result, this.readVarint() + this.pos);
        },
        readFixed32: function() {
          var val = readUInt32(this.buf, this.pos);
          this.pos += 4;
          return val;
        },
        readSFixed32: function() {
          var val = readInt32(this.buf, this.pos);
          this.pos += 4;
          return val;
        },
        // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)
        readFixed64: function() {
          var val = readUInt32(this.buf, this.pos) + readUInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
          this.pos += 8;
          return val;
        },
        readSFixed64: function() {
          var val = readUInt32(this.buf, this.pos) + readInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
          this.pos += 8;
          return val;
        },
        readFloat: function() {
          var val = ieee754.read(this.buf, this.pos, true, 23, 4);
          this.pos += 4;
          return val;
        },
        readDouble: function() {
          var val = ieee754.read(this.buf, this.pos, true, 52, 8);
          this.pos += 8;
          return val;
        },
        readVarint: function(isSigned) {
          var buf = this.buf, val, b;
          b = buf[this.pos++];
          val = b & 127;
          if (b < 128)
            return val;
          b = buf[this.pos++];
          val |= (b & 127) << 7;
          if (b < 128)
            return val;
          b = buf[this.pos++];
          val |= (b & 127) << 14;
          if (b < 128)
            return val;
          b = buf[this.pos++];
          val |= (b & 127) << 21;
          if (b < 128)
            return val;
          b = buf[this.pos];
          val |= (b & 15) << 28;
          return readVarintRemainder(val, isSigned, this);
        },
        readVarint64: function() {
          return this.readVarint(true);
        },
        readSVarint: function() {
          var num = this.readVarint();
          return num % 2 === 1 ? (num + 1) / -2 : num / 2;
        },
        readBoolean: function() {
          return Boolean(this.readVarint());
        },
        readString: function() {
          var end = this.readVarint() + this.pos;
          var pos = this.pos;
          this.pos = end;
          if (end - pos >= TEXT_DECODER_MIN_LENGTH && utf8TextDecoder) {
            return readUtf8TextDecoder(this.buf, pos, end);
          }
          return readUtf8(this.buf, pos, end);
        },
        readBytes: function() {
          var end = this.readVarint() + this.pos, buffer = this.buf.subarray(this.pos, end);
          this.pos = end;
          return buffer;
        },
        // verbose for performance reasons; doesn't affect gzipped size
        readPackedVarint: function(arr, isSigned) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readVarint(isSigned));
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readVarint(isSigned));
          return arr;
        },
        readPackedSVarint: function(arr) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readSVarint());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readSVarint());
          return arr;
        },
        readPackedBoolean: function(arr) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readBoolean());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readBoolean());
          return arr;
        },
        readPackedFloat: function(arr) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readFloat());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readFloat());
          return arr;
        },
        readPackedDouble: function(arr) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readDouble());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readDouble());
          return arr;
        },
        readPackedFixed32: function(arr) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readFixed32());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readFixed32());
          return arr;
        },
        readPackedSFixed32: function(arr) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readSFixed32());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readSFixed32());
          return arr;
        },
        readPackedFixed64: function(arr) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readFixed64());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readFixed64());
          return arr;
        },
        readPackedSFixed64: function(arr) {
          if (this.type !== Pbf.Bytes)
            return arr.push(this.readSFixed64());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end)
            arr.push(this.readSFixed64());
          return arr;
        },
        skip: function(val) {
          var type = val & 7;
          if (type === Pbf.Varint)
            while (this.buf[this.pos++] > 127) {
            }
          else if (type === Pbf.Bytes)
            this.pos = this.readVarint() + this.pos;
          else if (type === Pbf.Fixed32)
            this.pos += 4;
          else if (type === Pbf.Fixed64)
            this.pos += 8;
          else
            throw new Error("Unimplemented type: " + type);
        },
        // === WRITING =================================================================
        writeTag: function(tag, type) {
          this.writeVarint(tag << 3 | type);
        },
        realloc: function(min) {
          var length = this.length || 16;
          while (length < this.pos + min)
            length *= 2;
          if (length !== this.length) {
            var buf = new Uint8Array(length);
            buf.set(this.buf);
            this.buf = buf;
            this.length = length;
          }
        },
        finish: function() {
          this.length = this.pos;
          this.pos = 0;
          return this.buf.subarray(0, this.length);
        },
        writeFixed32: function(val) {
          this.realloc(4);
          writeInt32(this.buf, val, this.pos);
          this.pos += 4;
        },
        writeSFixed32: function(val) {
          this.realloc(4);
          writeInt32(this.buf, val, this.pos);
          this.pos += 4;
        },
        writeFixed64: function(val) {
          this.realloc(8);
          writeInt32(this.buf, val & -1, this.pos);
          writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
          this.pos += 8;
        },
        writeSFixed64: function(val) {
          this.realloc(8);
          writeInt32(this.buf, val & -1, this.pos);
          writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
          this.pos += 8;
        },
        writeVarint: function(val) {
          val = +val || 0;
          if (val > 268435455 || val < 0) {
            writeBigVarint(val, this);
            return;
          }
          this.realloc(4);
          this.buf[this.pos++] = val & 127 | (val > 127 ? 128 : 0);
          if (val <= 127)
            return;
          this.buf[this.pos++] = (val >>>= 7) & 127 | (val > 127 ? 128 : 0);
          if (val <= 127)
            return;
          this.buf[this.pos++] = (val >>>= 7) & 127 | (val > 127 ? 128 : 0);
          if (val <= 127)
            return;
          this.buf[this.pos++] = val >>> 7 & 127;
        },
        writeSVarint: function(val) {
          this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2);
        },
        writeBoolean: function(val) {
          this.writeVarint(Boolean(val));
        },
        writeString: function(str) {
          str = String(str);
          this.realloc(str.length * 4);
          this.pos++;
          var startPos = this.pos;
          this.pos = writeUtf8(this.buf, str, this.pos);
          var len = this.pos - startPos;
          if (len >= 128)
            makeRoomForExtraLength(startPos, len, this);
          this.pos = startPos - 1;
          this.writeVarint(len);
          this.pos += len;
        },
        writeFloat: function(val) {
          this.realloc(4);
          ieee754.write(this.buf, val, this.pos, true, 23, 4);
          this.pos += 4;
        },
        writeDouble: function(val) {
          this.realloc(8);
          ieee754.write(this.buf, val, this.pos, true, 52, 8);
          this.pos += 8;
        },
        writeBytes: function(buffer) {
          var len = buffer.length;
          this.writeVarint(len);
          this.realloc(len);
          for (var i = 0; i < len; i++)
            this.buf[this.pos++] = buffer[i];
        },
        writeRawMessage: function(fn, obj) {
          this.pos++;
          var startPos = this.pos;
          fn(obj, this);
          var len = this.pos - startPos;
          if (len >= 128)
            makeRoomForExtraLength(startPos, len, this);
          this.pos = startPos - 1;
          this.writeVarint(len);
          this.pos += len;
        },
        writeMessage: function(tag, fn, obj) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeRawMessage(fn, obj);
        },
        writePackedVarint: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedVarint, arr);
        },
        writePackedSVarint: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedSVarint, arr);
        },
        writePackedBoolean: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedBoolean, arr);
        },
        writePackedFloat: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedFloat, arr);
        },
        writePackedDouble: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedDouble, arr);
        },
        writePackedFixed32: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedFixed32, arr);
        },
        writePackedSFixed32: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedSFixed32, arr);
        },
        writePackedFixed64: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedFixed64, arr);
        },
        writePackedSFixed64: function(tag, arr) {
          if (arr.length)
            this.writeMessage(tag, writePackedSFixed64, arr);
        },
        writeBytesField: function(tag, buffer) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeBytes(buffer);
        },
        writeFixed32Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeFixed32(val);
        },
        writeSFixed32Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeSFixed32(val);
        },
        writeFixed64Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeFixed64(val);
        },
        writeSFixed64Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeSFixed64(val);
        },
        writeVarintField: function(tag, val) {
          this.writeTag(tag, Pbf.Varint);
          this.writeVarint(val);
        },
        writeSVarintField: function(tag, val) {
          this.writeTag(tag, Pbf.Varint);
          this.writeSVarint(val);
        },
        writeStringField: function(tag, str) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeString(str);
        },
        writeFloatField: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeFloat(val);
        },
        writeDoubleField: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeDouble(val);
        },
        writeBooleanField: function(tag, val) {
          this.writeVarintField(tag, Boolean(val));
        }
      };
      function readVarintRemainder(l, s, p) {
        var buf = p.buf, h, b;
        b = buf[p.pos++];
        h = (b & 112) >> 4;
        if (b < 128)
          return toNum(l, h, s);
        b = buf[p.pos++];
        h |= (b & 127) << 3;
        if (b < 128)
          return toNum(l, h, s);
        b = buf[p.pos++];
        h |= (b & 127) << 10;
        if (b < 128)
          return toNum(l, h, s);
        b = buf[p.pos++];
        h |= (b & 127) << 17;
        if (b < 128)
          return toNum(l, h, s);
        b = buf[p.pos++];
        h |= (b & 127) << 24;
        if (b < 128)
          return toNum(l, h, s);
        b = buf[p.pos++];
        h |= (b & 1) << 31;
        if (b < 128)
          return toNum(l, h, s);
        throw new Error("Expected varint not more than 10 bytes");
      }
      function readPackedEnd(pbf) {
        return pbf.type === Pbf.Bytes ? pbf.readVarint() + pbf.pos : pbf.pos + 1;
      }
      function toNum(low, high, isSigned) {
        if (isSigned) {
          return high * 4294967296 + (low >>> 0);
        }
        return (high >>> 0) * 4294967296 + (low >>> 0);
      }
      function writeBigVarint(val, pbf) {
        var low, high;
        if (val >= 0) {
          low = val % 4294967296 | 0;
          high = val / 4294967296 | 0;
        } else {
          low = ~(-val % 4294967296);
          high = ~(-val / 4294967296);
          if (low ^ 4294967295) {
            low = low + 1 | 0;
          } else {
            low = 0;
            high = high + 1 | 0;
          }
        }
        if (val >= 18446744073709552e3 || val < -18446744073709552e3) {
          throw new Error("Given varint doesn't fit into 10 bytes");
        }
        pbf.realloc(10);
        writeBigVarintLow(low, high, pbf);
        writeBigVarintHigh(high, pbf);
      }
      function writeBigVarintLow(low, high, pbf) {
        pbf.buf[pbf.pos++] = low & 127 | 128;
        low >>>= 7;
        pbf.buf[pbf.pos++] = low & 127 | 128;
        low >>>= 7;
        pbf.buf[pbf.pos++] = low & 127 | 128;
        low >>>= 7;
        pbf.buf[pbf.pos++] = low & 127 | 128;
        low >>>= 7;
        pbf.buf[pbf.pos] = low & 127;
      }
      function writeBigVarintHigh(high, pbf) {
        var lsb = (high & 7) << 4;
        pbf.buf[pbf.pos++] |= lsb | ((high >>>= 3) ? 128 : 0);
        if (!high)
          return;
        pbf.buf[pbf.pos++] = high & 127 | ((high >>>= 7) ? 128 : 0);
        if (!high)
          return;
        pbf.buf[pbf.pos++] = high & 127 | ((high >>>= 7) ? 128 : 0);
        if (!high)
          return;
        pbf.buf[pbf.pos++] = high & 127 | ((high >>>= 7) ? 128 : 0);
        if (!high)
          return;
        pbf.buf[pbf.pos++] = high & 127 | ((high >>>= 7) ? 128 : 0);
        if (!high)
          return;
        pbf.buf[pbf.pos++] = high & 127;
      }
      function makeRoomForExtraLength(startPos, len, pbf) {
        var extraLen = len <= 16383 ? 1 : len <= 2097151 ? 2 : len <= 268435455 ? 3 : Math.floor(Math.log(len) / (Math.LN2 * 7));
        pbf.realloc(extraLen);
        for (var i = pbf.pos - 1; i >= startPos; i--)
          pbf.buf[i + extraLen] = pbf.buf[i];
      }
      function writePackedVarint(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeVarint(arr[i]);
      }
      function writePackedSVarint(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeSVarint(arr[i]);
      }
      function writePackedFloat(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeFloat(arr[i]);
      }
      function writePackedDouble(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeDouble(arr[i]);
      }
      function writePackedBoolean(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeBoolean(arr[i]);
      }
      function writePackedFixed32(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeFixed32(arr[i]);
      }
      function writePackedSFixed32(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeSFixed32(arr[i]);
      }
      function writePackedFixed64(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeFixed64(arr[i]);
      }
      function writePackedSFixed64(arr, pbf) {
        for (var i = 0; i < arr.length; i++)
          pbf.writeSFixed64(arr[i]);
      }
      function readUInt32(buf, pos) {
        return (buf[pos] | buf[pos + 1] << 8 | buf[pos + 2] << 16) + buf[pos + 3] * 16777216;
      }
      function writeInt32(buf, val, pos) {
        buf[pos] = val;
        buf[pos + 1] = val >>> 8;
        buf[pos + 2] = val >>> 16;
        buf[pos + 3] = val >>> 24;
      }
      function readInt32(buf, pos) {
        return (buf[pos] | buf[pos + 1] << 8 | buf[pos + 2] << 16) + (buf[pos + 3] << 24);
      }
      function readUtf8(buf, pos, end) {
        var str = "";
        var i = pos;
        while (i < end) {
          var b0 = buf[i];
          var c = null;
          var bytesPerSequence = b0 > 239 ? 4 : b0 > 223 ? 3 : b0 > 191 ? 2 : 1;
          if (i + bytesPerSequence > end)
            break;
          var b1, b2, b3;
          if (bytesPerSequence === 1) {
            if (b0 < 128) {
              c = b0;
            }
          } else if (bytesPerSequence === 2) {
            b1 = buf[i + 1];
            if ((b1 & 192) === 128) {
              c = (b0 & 31) << 6 | b1 & 63;
              if (c <= 127) {
                c = null;
              }
            }
          } else if (bytesPerSequence === 3) {
            b1 = buf[i + 1];
            b2 = buf[i + 2];
            if ((b1 & 192) === 128 && (b2 & 192) === 128) {
              c = (b0 & 15) << 12 | (b1 & 63) << 6 | b2 & 63;
              if (c <= 2047 || c >= 55296 && c <= 57343) {
                c = null;
              }
            }
          } else if (bytesPerSequence === 4) {
            b1 = buf[i + 1];
            b2 = buf[i + 2];
            b3 = buf[i + 3];
            if ((b1 & 192) === 128 && (b2 & 192) === 128 && (b3 & 192) === 128) {
              c = (b0 & 15) << 18 | (b1 & 63) << 12 | (b2 & 63) << 6 | b3 & 63;
              if (c <= 65535 || c >= 1114112) {
                c = null;
              }
            }
          }
          if (c === null) {
            c = 65533;
            bytesPerSequence = 1;
          } else if (c > 65535) {
            c -= 65536;
            str += String.fromCharCode(c >>> 10 & 1023 | 55296);
            c = 56320 | c & 1023;
          }
          str += String.fromCharCode(c);
          i += bytesPerSequence;
        }
        return str;
      }
      function readUtf8TextDecoder(buf, pos, end) {
        return utf8TextDecoder.decode(buf.subarray(pos, end));
      }
      function writeUtf8(buf, str, pos) {
        for (var i = 0, c, lead; i < str.length; i++) {
          c = str.charCodeAt(i);
          if (c > 55295 && c < 57344) {
            if (lead) {
              if (c < 56320) {
                buf[pos++] = 239;
                buf[pos++] = 191;
                buf[pos++] = 189;
                lead = c;
                continue;
              } else {
                c = lead - 55296 << 10 | c - 56320 | 65536;
                lead = null;
              }
            } else {
              if (c > 56319 || i + 1 === str.length) {
                buf[pos++] = 239;
                buf[pos++] = 191;
                buf[pos++] = 189;
              } else {
                lead = c;
              }
              continue;
            }
          } else if (lead) {
            buf[pos++] = 239;
            buf[pos++] = 191;
            buf[pos++] = 189;
            lead = null;
          }
          if (c < 128) {
            buf[pos++] = c;
          } else {
            if (c < 2048) {
              buf[pos++] = c >> 6 | 192;
            } else {
              if (c < 65536) {
                buf[pos++] = c >> 12 | 224;
              } else {
                buf[pos++] = c >> 18 | 240;
                buf[pos++] = c >> 12 & 63 | 128;
              }
              buf[pos++] = c >> 6 & 63 | 128;
            }
            buf[pos++] = c & 63 | 128;
          }
        }
        return pos;
      }
    }
  });

  // node_modules/earcut/src/earcut.js
  var require_earcut = __commonJS({
    "node_modules/earcut/src/earcut.js"(exports, module) {
      "use strict";
      module.exports = earcut2;
      module.exports.default = earcut2;
      function earcut2(data, holeIndices, dim) {
        dim = dim || 2;
        var hasHoles = holeIndices && holeIndices.length, outerLen = hasHoles ? holeIndices[0] * dim : data.length, outerNode = linkedList(data, 0, outerLen, dim, true), triangles = [];
        if (!outerNode || outerNode.next === outerNode.prev)
          return triangles;
        var minX, minY, maxX, maxY, x, y, invSize;
        if (hasHoles)
          outerNode = eliminateHoles(data, holeIndices, outerNode, dim);
        if (data.length > 80 * dim) {
          minX = maxX = data[0];
          minY = maxY = data[1];
          for (var i = dim; i < outerLen; i += dim) {
            x = data[i];
            y = data[i + 1];
            if (x < minX)
              minX = x;
            if (y < minY)
              minY = y;
            if (x > maxX)
              maxX = x;
            if (y > maxY)
              maxY = y;
          }
          invSize = Math.max(maxX - minX, maxY - minY);
          invSize = invSize !== 0 ? 32767 / invSize : 0;
        }
        earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);
        return triangles;
      }
      function linkedList(data, start, end, dim, clockwise) {
        var i, last;
        if (clockwise === signedArea(data, start, end, dim) > 0) {
          for (i = start; i < end; i += dim)
            last = insertNode(i, data[i], data[i + 1], last);
        } else {
          for (i = end - dim; i >= start; i -= dim)
            last = insertNode(i, data[i], data[i + 1], last);
        }
        if (last && equals(last, last.next)) {
          removeNode(last);
          last = last.next;
        }
        return last;
      }
      function filterPoints(start, end) {
        if (!start)
          return start;
        if (!end)
          end = start;
        var p = start, again;
        do {
          again = false;
          if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
            removeNode(p);
            p = end = p.prev;
            if (p === p.next)
              break;
            again = true;
          } else {
            p = p.next;
          }
        } while (again || p !== end);
        return end;
      }
      function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
        if (!ear)
          return;
        if (!pass && invSize)
          indexCurve(ear, minX, minY, invSize);
        var stop = ear, prev, next;
        while (ear.prev !== ear.next) {
          prev = ear.prev;
          next = ear.next;
          if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
            triangles.push(prev.i / dim | 0);
            triangles.push(ear.i / dim | 0);
            triangles.push(next.i / dim | 0);
            removeNode(ear);
            ear = next.next;
            stop = next.next;
            continue;
          }
          ear = next;
          if (ear === stop) {
            if (!pass) {
              earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);
            } else if (pass === 1) {
              ear = cureLocalIntersections(filterPoints(ear), triangles, dim);
              earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);
            } else if (pass === 2) {
              splitEarcut(ear, triangles, dim, minX, minY, invSize);
            }
            break;
          }
        }
      }
      function isEar(ear) {
        var a = ear.prev, b = ear, c = ear.next;
        if (area(a, b, c) >= 0)
          return false;
        var ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
        var x0 = ax < bx ? ax < cx ? ax : cx : bx < cx ? bx : cx, y0 = ay < by ? ay < cy ? ay : cy : by < cy ? by : cy, x1 = ax > bx ? ax > cx ? ax : cx : bx > cx ? bx : cx, y1 = ay > by ? ay > cy ? ay : cy : by > cy ? by : cy;
        var p = c.next;
        while (p !== a) {
          if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0)
            return false;
          p = p.next;
        }
        return true;
      }
      function isEarHashed(ear, minX, minY, invSize) {
        var a = ear.prev, b = ear, c = ear.next;
        if (area(a, b, c) >= 0)
          return false;
        var ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
        var x0 = ax < bx ? ax < cx ? ax : cx : bx < cx ? bx : cx, y0 = ay < by ? ay < cy ? ay : cy : by < cy ? by : cy, x1 = ax > bx ? ax > cx ? ax : cx : bx > cx ? bx : cx, y1 = ay > by ? ay > cy ? ay : cy : by > cy ? by : cy;
        var minZ = zOrder(x0, y0, minX, minY, invSize), maxZ = zOrder(x1, y1, minX, minY, invSize);
        var p = ear.prevZ, n = ear.nextZ;
        while (p && p.z >= minZ && n && n.z <= maxZ) {
          if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0)
            return false;
          p = p.prevZ;
          if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0)
            return false;
          n = n.nextZ;
        }
        while (p && p.z >= minZ) {
          if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0)
            return false;
          p = p.prevZ;
        }
        while (n && n.z <= maxZ) {
          if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0)
            return false;
          n = n.nextZ;
        }
        return true;
      }
      function cureLocalIntersections(start, triangles, dim) {
        var p = start;
        do {
          var a = p.prev, b = p.next.next;
          if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
            triangles.push(a.i / dim | 0);
            triangles.push(p.i / dim | 0);
            triangles.push(b.i / dim | 0);
            removeNode(p);
            removeNode(p.next);
            p = start = b;
          }
          p = p.next;
        } while (p !== start);
        return filterPoints(p);
      }
      function splitEarcut(start, triangles, dim, minX, minY, invSize) {
        var a = start;
        do {
          var b = a.next.next;
          while (b !== a.prev) {
            if (a.i !== b.i && isValidDiagonal(a, b)) {
              var c = splitPolygon(a, b);
              a = filterPoints(a, a.next);
              c = filterPoints(c, c.next);
              earcutLinked(a, triangles, dim, minX, minY, invSize, 0);
              earcutLinked(c, triangles, dim, minX, minY, invSize, 0);
              return;
            }
            b = b.next;
          }
          a = a.next;
        } while (a !== start);
      }
      function eliminateHoles(data, holeIndices, outerNode, dim) {
        var queue = [], i, len, start, end, list;
        for (i = 0, len = holeIndices.length; i < len; i++) {
          start = holeIndices[i] * dim;
          end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
          list = linkedList(data, start, end, dim, false);
          if (list === list.next)
            list.steiner = true;
          queue.push(getLeftmost(list));
        }
        queue.sort(compareX);
        for (i = 0; i < queue.length; i++) {
          outerNode = eliminateHole(queue[i], outerNode);
        }
        return outerNode;
      }
      function compareX(a, b) {
        return a.x - b.x;
      }
      function eliminateHole(hole, outerNode) {
        var bridge = findHoleBridge(hole, outerNode);
        if (!bridge) {
          return outerNode;
        }
        var bridgeReverse = splitPolygon(bridge, hole);
        filterPoints(bridgeReverse, bridgeReverse.next);
        return filterPoints(bridge, bridge.next);
      }
      function findHoleBridge(hole, outerNode) {
        var p = outerNode, hx = hole.x, hy = hole.y, qx = -Infinity, m;
        do {
          if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
            var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
            if (x <= hx && x > qx) {
              qx = x;
              m = p.x < p.next.x ? p : p.next;
              if (x === hx)
                return m;
            }
          }
          p = p.next;
        } while (p !== outerNode);
        if (!m)
          return null;
        var stop = m, mx = m.x, my = m.y, tanMin = Infinity, tan;
        p = m;
        do {
          if (hx >= p.x && p.x >= mx && hx !== p.x && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
            tan = Math.abs(hy - p.y) / (hx - p.x);
            if (locallyInside(p, hole) && (tan < tanMin || tan === tanMin && (p.x > m.x || p.x === m.x && sectorContainsSector(m, p)))) {
              m = p;
              tanMin = tan;
            }
          }
          p = p.next;
        } while (p !== stop);
        return m;
      }
      function sectorContainsSector(m, p) {
        return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
      }
      function indexCurve(start, minX, minY, invSize) {
        var p = start;
        do {
          if (p.z === 0)
            p.z = zOrder(p.x, p.y, minX, minY, invSize);
          p.prevZ = p.prev;
          p.nextZ = p.next;
          p = p.next;
        } while (p !== start);
        p.prevZ.nextZ = null;
        p.prevZ = null;
        sortLinked(p);
      }
      function sortLinked(list) {
        var i, p, q, e, tail, numMerges, pSize, qSize, inSize = 1;
        do {
          p = list;
          list = null;
          tail = null;
          numMerges = 0;
          while (p) {
            numMerges++;
            q = p;
            pSize = 0;
            for (i = 0; i < inSize; i++) {
              pSize++;
              q = q.nextZ;
              if (!q)
                break;
            }
            qSize = inSize;
            while (pSize > 0 || qSize > 0 && q) {
              if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
                e = p;
                p = p.nextZ;
                pSize--;
              } else {
                e = q;
                q = q.nextZ;
                qSize--;
              }
              if (tail)
                tail.nextZ = e;
              else
                list = e;
              e.prevZ = tail;
              tail = e;
            }
            p = q;
          }
          tail.nextZ = null;
          inSize *= 2;
        } while (numMerges > 1);
        return list;
      }
      function zOrder(x, y, minX, minY, invSize) {
        x = (x - minX) * invSize | 0;
        y = (y - minY) * invSize | 0;
        x = (x | x << 8) & 16711935;
        x = (x | x << 4) & 252645135;
        x = (x | x << 2) & 858993459;
        x = (x | x << 1) & 1431655765;
        y = (y | y << 8) & 16711935;
        y = (y | y << 4) & 252645135;
        y = (y | y << 2) & 858993459;
        y = (y | y << 1) & 1431655765;
        return x | y << 1;
      }
      function getLeftmost(start) {
        var p = start, leftmost = start;
        do {
          if (p.x < leftmost.x || p.x === leftmost.x && p.y < leftmost.y)
            leftmost = p;
          p = p.next;
        } while (p !== start);
        return leftmost;
      }
      function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
        return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
      }
      function isValidDiagonal(a, b) {
        return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && // dones't intersect other edges
        (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && // locally visible
        (area(a.prev, a, b.prev) || area(a, b.prev, b)) || // does not create opposite-facing sectors
        equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0);
      }
      function area(p, q, r) {
        return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      }
      function equals(p1, p2) {
        return p1.x === p2.x && p1.y === p2.y;
      }
      function intersects(p1, q1, p2, q2) {
        var o1 = sign(area(p1, q1, p2));
        var o2 = sign(area(p1, q1, q2));
        var o3 = sign(area(p2, q2, p1));
        var o4 = sign(area(p2, q2, q1));
        if (o1 !== o2 && o3 !== o4)
          return true;
        if (o1 === 0 && onSegment(p1, p2, q1))
          return true;
        if (o2 === 0 && onSegment(p1, q2, q1))
          return true;
        if (o3 === 0 && onSegment(p2, p1, q2))
          return true;
        if (o4 === 0 && onSegment(p2, q1, q2))
          return true;
        return false;
      }
      function onSegment(p, q, r) {
        return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
      }
      function sign(num) {
        return num > 0 ? 1 : num < 0 ? -1 : 0;
      }
      function intersectsPolygon(a, b) {
        var p = a;
        do {
          if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b))
            return true;
          p = p.next;
        } while (p !== a);
        return false;
      }
      function locallyInside(a, b) {
        return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
      }
      function middleInside(a, b) {
        var p = a, inside = false, px = (a.x + b.x) / 2, py = (a.y + b.y) / 2;
        do {
          if (p.y > py !== p.next.y > py && p.next.y !== p.y && px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x)
            inside = !inside;
          p = p.next;
        } while (p !== a);
        return inside;
      }
      function splitPolygon(a, b) {
        var a2 = new Node(a.i, a.x, a.y), b2 = new Node(b.i, b.x, b.y), an = a.next, bp = b.prev;
        a.next = b;
        b.prev = a;
        a2.next = an;
        an.prev = a2;
        b2.next = a2;
        a2.prev = b2;
        bp.next = b2;
        b2.prev = bp;
        return b2;
      }
      function insertNode(i, x, y, last) {
        var p = new Node(i, x, y);
        if (!last) {
          p.prev = p;
          p.next = p;
        } else {
          p.next = last.next;
          p.prev = last;
          last.next.prev = p;
          last.next = p;
        }
        return p;
      }
      function removeNode(p) {
        p.next.prev = p.prev;
        p.prev.next = p.next;
        if (p.prevZ)
          p.prevZ.nextZ = p.nextZ;
        if (p.nextZ)
          p.nextZ.prevZ = p.prevZ;
      }
      function Node(i, x, y) {
        this.i = i;
        this.x = x;
        this.y = y;
        this.prev = null;
        this.next = null;
        this.z = 0;
        this.prevZ = null;
        this.nextZ = null;
        this.steiner = false;
      }
      earcut2.deviation = function(data, holeIndices, dim, triangles) {
        var hasHoles = holeIndices && holeIndices.length;
        var outerLen = hasHoles ? holeIndices[0] * dim : data.length;
        var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
        if (hasHoles) {
          for (var i = 0, len = holeIndices.length; i < len; i++) {
            var start = holeIndices[i] * dim;
            var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
            polygonArea -= Math.abs(signedArea(data, start, end, dim));
          }
        }
        var trianglesArea = 0;
        for (i = 0; i < triangles.length; i += 3) {
          var a = triangles[i] * dim;
          var b = triangles[i + 1] * dim;
          var c = triangles[i + 2] * dim;
          trianglesArea += Math.abs(
            (data[a] - data[c]) * (data[b + 1] - data[a + 1]) - (data[a] - data[b]) * (data[c + 1] - data[a + 1])
          );
        }
        return polygonArea === 0 && trianglesArea === 0 ? 0 : Math.abs((trianglesArea - polygonArea) / polygonArea);
      };
      function signedArea(data, start, end, dim) {
        var sum = 0;
        for (var i = start, j = end - dim; i < end; i += dim) {
          sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
          j = i;
        }
        return sum;
      }
      earcut2.flatten = function(data) {
        var dim = data[0][0].length, result = { vertices: [], holes: [], dimensions: dim }, holeIndex = 0;
        for (var i = 0; i < data.length; i++) {
          for (var j = 0; j < data[i].length; j++) {
            for (var d = 0; d < dim; d++)
              result.vertices.push(data[i][j][d]);
          }
          if (i > 0) {
            holeIndex += data[i - 1].length;
            result.holes.push(holeIndex);
          }
        }
        return result;
      };
    }
  });

  // node_modules/@mapbox/point-geometry/index.js
  var require_point_geometry = __commonJS({
    "node_modules/@mapbox/point-geometry/index.js"(exports, module) {
      "use strict";
      module.exports = Point;
      function Point(x, y) {
        this.x = x;
        this.y = y;
      }
      Point.prototype = {
        /**
         * Clone this point, returning a new point that can be modified
         * without affecting the old one.
         * @return {Point} the clone
         */
        clone: function() {
          return new Point(this.x, this.y);
        },
        /**
         * Add this point's x & y coordinates to another point,
         * yielding a new point.
         * @param {Point} p the other point
         * @return {Point} output point
         */
        add: function(p) {
          return this.clone()._add(p);
        },
        /**
         * Subtract this point's x & y coordinates to from point,
         * yielding a new point.
         * @param {Point} p the other point
         * @return {Point} output point
         */
        sub: function(p) {
          return this.clone()._sub(p);
        },
        /**
         * Multiply this point's x & y coordinates by point,
         * yielding a new point.
         * @param {Point} p the other point
         * @return {Point} output point
         */
        multByPoint: function(p) {
          return this.clone()._multByPoint(p);
        },
        /**
         * Divide this point's x & y coordinates by point,
         * yielding a new point.
         * @param {Point} p the other point
         * @return {Point} output point
         */
        divByPoint: function(p) {
          return this.clone()._divByPoint(p);
        },
        /**
         * Multiply this point's x & y coordinates by a factor,
         * yielding a new point.
         * @param {Point} k factor
         * @return {Point} output point
         */
        mult: function(k) {
          return this.clone()._mult(k);
        },
        /**
         * Divide this point's x & y coordinates by a factor,
         * yielding a new point.
         * @param {Point} k factor
         * @return {Point} output point
         */
        div: function(k) {
          return this.clone()._div(k);
        },
        /**
         * Rotate this point around the 0, 0 origin by an angle a,
         * given in radians
         * @param {Number} a angle to rotate around, in radians
         * @return {Point} output point
         */
        rotate: function(a) {
          return this.clone()._rotate(a);
        },
        /**
         * Rotate this point around p point by an angle a,
         * given in radians
         * @param {Number} a angle to rotate around, in radians
         * @param {Point} p Point to rotate around
         * @return {Point} output point
         */
        rotateAround: function(a, p) {
          return this.clone()._rotateAround(a, p);
        },
        /**
         * Multiply this point by a 4x1 transformation matrix
         * @param {Array<Number>} m transformation matrix
         * @return {Point} output point
         */
        matMult: function(m) {
          return this.clone()._matMult(m);
        },
        /**
         * Calculate this point but as a unit vector from 0, 0, meaning
         * that the distance from the resulting point to the 0, 0
         * coordinate will be equal to 1 and the angle from the resulting
         * point to the 0, 0 coordinate will be the same as before.
         * @return {Point} unit vector point
         */
        unit: function() {
          return this.clone()._unit();
        },
        /**
         * Compute a perpendicular point, where the new y coordinate
         * is the old x coordinate and the new x coordinate is the old y
         * coordinate multiplied by -1
         * @return {Point} perpendicular point
         */
        perp: function() {
          return this.clone()._perp();
        },
        /**
         * Return a version of this point with the x & y coordinates
         * rounded to integers.
         * @return {Point} rounded point
         */
        round: function() {
          return this.clone()._round();
        },
        /**
         * Return the magitude of this point: this is the Euclidean
         * distance from the 0, 0 coordinate to this point's x and y
         * coordinates.
         * @return {Number} magnitude
         */
        mag: function() {
          return Math.sqrt(this.x * this.x + this.y * this.y);
        },
        /**
         * Judge whether this point is equal to another point, returning
         * true or false.
         * @param {Point} other the other point
         * @return {boolean} whether the points are equal
         */
        equals: function(other) {
          return this.x === other.x && this.y === other.y;
        },
        /**
         * Calculate the distance from this point to another point
         * @param {Point} p the other point
         * @return {Number} distance
         */
        dist: function(p) {
          return Math.sqrt(this.distSqr(p));
        },
        /**
         * Calculate the distance from this point to another point,
         * without the square root step. Useful if you're comparing
         * relative distances.
         * @param {Point} p the other point
         * @return {Number} distance
         */
        distSqr: function(p) {
          var dx = p.x - this.x, dy = p.y - this.y;
          return dx * dx + dy * dy;
        },
        /**
         * Get the angle from the 0, 0 coordinate to this point, in radians
         * coordinates.
         * @return {Number} angle
         */
        angle: function() {
          return Math.atan2(this.y, this.x);
        },
        /**
         * Get the angle from this point to another point, in radians
         * @param {Point} b the other point
         * @return {Number} angle
         */
        angleTo: function(b) {
          return Math.atan2(this.y - b.y, this.x - b.x);
        },
        /**
         * Get the angle between this point and another point, in radians
         * @param {Point} b the other point
         * @return {Number} angle
         */
        angleWith: function(b) {
          return this.angleWithSep(b.x, b.y);
        },
        /*
         * Find the angle of the two vectors, solving the formula for
         * the cross product a x b = |a||b|sin(θ) for θ.
         * @param {Number} x the x-coordinate
         * @param {Number} y the y-coordinate
         * @return {Number} the angle in radians
         */
        angleWithSep: function(x, y) {
          return Math.atan2(
            this.x * y - this.y * x,
            this.x * x + this.y * y
          );
        },
        _matMult: function(m) {
          var x = m[0] * this.x + m[1] * this.y, y = m[2] * this.x + m[3] * this.y;
          this.x = x;
          this.y = y;
          return this;
        },
        _add: function(p) {
          this.x += p.x;
          this.y += p.y;
          return this;
        },
        _sub: function(p) {
          this.x -= p.x;
          this.y -= p.y;
          return this;
        },
        _mult: function(k) {
          this.x *= k;
          this.y *= k;
          return this;
        },
        _div: function(k) {
          this.x /= k;
          this.y /= k;
          return this;
        },
        _multByPoint: function(p) {
          this.x *= p.x;
          this.y *= p.y;
          return this;
        },
        _divByPoint: function(p) {
          this.x /= p.x;
          this.y /= p.y;
          return this;
        },
        _unit: function() {
          this._div(this.mag());
          return this;
        },
        _perp: function() {
          var y = this.y;
          this.y = this.x;
          this.x = -y;
          return this;
        },
        _rotate: function(angle) {
          var cos = Math.cos(angle), sin = Math.sin(angle), x = cos * this.x - sin * this.y, y = sin * this.x + cos * this.y;
          this.x = x;
          this.y = y;
          return this;
        },
        _rotateAround: function(angle, p) {
          var cos = Math.cos(angle), sin = Math.sin(angle), x = p.x + cos * (this.x - p.x) - sin * (this.y - p.y), y = p.y + sin * (this.x - p.x) + cos * (this.y - p.y);
          this.x = x;
          this.y = y;
          return this;
        },
        _round: function() {
          this.x = Math.round(this.x);
          this.y = Math.round(this.y);
          return this;
        }
      };
      Point.convert = function(a) {
        if (a instanceof Point) {
          return a;
        }
        if (Array.isArray(a)) {
          return new Point(a[0], a[1]);
        }
        return a;
      };
    }
  });

  // node_modules/@mapbox/vector-tile/lib/vectortilefeature.js
  var require_vectortilefeature = __commonJS({
    "node_modules/@mapbox/vector-tile/lib/vectortilefeature.js"(exports, module) {
      "use strict";
      var Point = require_point_geometry();
      module.exports = VectorTileFeature2;
      function VectorTileFeature2(pbf, end, extent, keys, values) {
        this.properties = {};
        this.extent = extent;
        this.type = 0;
        this._pbf = pbf;
        this._geometry = -1;
        this._keys = keys;
        this._values = values;
        pbf.readFields(readFeature, this, end);
      }
      function readFeature(tag, feature, pbf) {
        if (tag == 1)
          feature.id = pbf.readVarint();
        else if (tag == 2)
          readTag(pbf, feature);
        else if (tag == 3)
          feature.type = pbf.readVarint();
        else if (tag == 4)
          feature._geometry = pbf.pos;
      }
      function readTag(pbf, feature) {
        var end = pbf.readVarint() + pbf.pos;
        while (pbf.pos < end) {
          var key = feature._keys[pbf.readVarint()], value = feature._values[pbf.readVarint()];
          feature.properties[key] = value;
        }
      }
      VectorTileFeature2.types = ["Unknown", "Point", "LineString", "Polygon"];
      VectorTileFeature2.prototype.loadGeometry = function() {
        var pbf = this._pbf;
        pbf.pos = this._geometry;
        var end = pbf.readVarint() + pbf.pos, cmd = 1, length = 0, x = 0, y = 0, lines = [], line;
        while (pbf.pos < end) {
          if (length <= 0) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 7;
            length = cmdLen >> 3;
          }
          length--;
          if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();
            if (cmd === 1) {
              if (line)
                lines.push(line);
              line = [];
            }
            line.push(new Point(x, y));
          } else if (cmd === 7) {
            if (line) {
              line.push(line[0].clone());
            }
          } else {
            throw new Error("unknown command " + cmd);
          }
        }
        if (line)
          lines.push(line);
        return lines;
      };
      VectorTileFeature2.prototype.bbox = function() {
        var pbf = this._pbf;
        pbf.pos = this._geometry;
        var end = pbf.readVarint() + pbf.pos, cmd = 1, length = 0, x = 0, y = 0, x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
        while (pbf.pos < end) {
          if (length <= 0) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 7;
            length = cmdLen >> 3;
          }
          length--;
          if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();
            if (x < x1)
              x1 = x;
            if (x > x2)
              x2 = x;
            if (y < y1)
              y1 = y;
            if (y > y2)
              y2 = y;
          } else if (cmd !== 7) {
            throw new Error("unknown command " + cmd);
          }
        }
        return [x1, y1, x2, y2];
      };
      VectorTileFeature2.prototype.toGeoJSON = function(x, y, z) {
        var size = this.extent * Math.pow(2, z), x0 = this.extent * x, y0 = this.extent * y, coords = this.loadGeometry(), type = VectorTileFeature2.types[this.type], i, j;
        function project(line) {
          for (var j2 = 0; j2 < line.length; j2++) {
            var p = line[j2], y2 = 180 - (p.y + y0) * 360 / size;
            line[j2] = [
              (p.x + x0) * 360 / size - 180,
              360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90
            ];
          }
        }
        switch (this.type) {
          case 1:
            var points = [];
            for (i = 0; i < coords.length; i++) {
              points[i] = coords[i][0];
            }
            coords = points;
            project(coords);
            break;
          case 2:
            for (i = 0; i < coords.length; i++) {
              project(coords[i]);
            }
            break;
          case 3:
            coords = classifyRings(coords);
            for (i = 0; i < coords.length; i++) {
              for (j = 0; j < coords[i].length; j++) {
                project(coords[i][j]);
              }
            }
            break;
        }
        if (coords.length === 1) {
          coords = coords[0];
        } else {
          type = "Multi" + type;
        }
        var result = {
          type: "Feature",
          geometry: {
            type,
            coordinates: coords
          },
          properties: this.properties
        };
        if ("id" in this) {
          result.id = this.id;
        }
        return result;
      };
      function classifyRings(rings) {
        var len = rings.length;
        if (len <= 1)
          return [rings];
        var polygons = [], polygon, ccw;
        for (var i = 0; i < len; i++) {
          var area = signedArea(rings[i]);
          if (area === 0)
            continue;
          if (ccw === void 0)
            ccw = area < 0;
          if (ccw === area < 0) {
            if (polygon)
              polygons.push(polygon);
            polygon = [rings[i]];
          } else {
            polygon.push(rings[i]);
          }
        }
        if (polygon)
          polygons.push(polygon);
        return polygons;
      }
      function signedArea(ring) {
        var sum = 0;
        for (var i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
          p1 = ring[i];
          p2 = ring[j];
          sum += (p2.x - p1.x) * (p1.y + p2.y);
        }
        return sum;
      }
    }
  });

  // node_modules/@mapbox/vector-tile/lib/vectortilelayer.js
  var require_vectortilelayer = __commonJS({
    "node_modules/@mapbox/vector-tile/lib/vectortilelayer.js"(exports, module) {
      "use strict";
      var VectorTileFeature2 = require_vectortilefeature();
      module.exports = VectorTileLayer;
      function VectorTileLayer(pbf, end) {
        this.version = 1;
        this.name = null;
        this.extent = 4096;
        this.length = 0;
        this._pbf = pbf;
        this._keys = [];
        this._values = [];
        this._features = [];
        pbf.readFields(readLayer, this, end);
        this.length = this._features.length;
      }
      function readLayer(tag, layer, pbf) {
        if (tag === 15)
          layer.version = pbf.readVarint();
        else if (tag === 1)
          layer.name = pbf.readString();
        else if (tag === 5)
          layer.extent = pbf.readVarint();
        else if (tag === 2)
          layer._features.push(pbf.pos);
        else if (tag === 3)
          layer._keys.push(pbf.readString());
        else if (tag === 4)
          layer._values.push(readValueMessage(pbf));
      }
      function readValueMessage(pbf) {
        var value = null, end = pbf.readVarint() + pbf.pos;
        while (pbf.pos < end) {
          var tag = pbf.readVarint() >> 3;
          value = tag === 1 ? pbf.readString() : tag === 2 ? pbf.readFloat() : tag === 3 ? pbf.readDouble() : tag === 4 ? pbf.readVarint64() : tag === 5 ? pbf.readVarint() : tag === 6 ? pbf.readSVarint() : tag === 7 ? pbf.readBoolean() : null;
        }
        return value;
      }
      VectorTileLayer.prototype.feature = function(i) {
        if (i < 0 || i >= this._features.length)
          throw new Error("feature index out of bounds");
        this._pbf.pos = this._features[i];
        var end = this._pbf.readVarint() + this._pbf.pos;
        return new VectorTileFeature2(this._pbf, end, this.extent, this._keys, this._values);
      };
    }
  });

  // node_modules/@mapbox/vector-tile/lib/vectortile.js
  var require_vectortile = __commonJS({
    "node_modules/@mapbox/vector-tile/lib/vectortile.js"(exports, module) {
      "use strict";
      var VectorTileLayer = require_vectortilelayer();
      module.exports = VectorTile2;
      function VectorTile2(pbf, end) {
        this.layers = pbf.readFields(readTile, {}, end);
      }
      function readTile(tag, layers, pbf) {
        if (tag === 3) {
          var layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
          if (layer.length)
            layers[layer.name] = layer;
        }
      }
    }
  });

  // node_modules/@mapbox/vector-tile/index.js
  var require_vector_tile = __commonJS({
    "node_modules/@mapbox/vector-tile/index.js"(exports, module) {
      module.exports.VectorTile = require_vectortile();
      module.exports.VectorTileFeature = require_vectortilefeature();
      module.exports.VectorTileLayer = require_vectortilelayer();
    }
  });

  // src/worker.ts
  var import_pbf = __toESM(require_pbf());
  var import_earcut = __toESM(require_earcut());
  var import_vector_tile = __toESM(require_vector_tile());

  // src/mercator.ts
  function mercatorXfromLng(lng) {
    return (180 + lng) / 360;
  }
  function mercatorYfromLat(lat) {
    return (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) / 360;
  }
  function fromLngLat(lngLat) {
    const x = -1 + mercatorXfromLng(lngLat[0]) * 2;
    const y = 1 - mercatorYfromLat(lngLat[1]) * 2;
    return [x, y];
  }

  // env-ns:env
  var TOKEN = "pk.eyJ1IjoiZ2FsbXVuZ3JhbCIsImEiOiJjbGU3YzA0NmEwM3llM3FzM3Mzd3BsN3g2In0.g5-OcMejJ48DwU0qvb7EPg";

  // src/worker.ts
  var sourceId = "mapbox.country-boundaries-v1";
  addEventListener("message", async (event) => {
    const { x, y, z } = event.data;
    const compiled = await compileTile(x, y, z);
    if (compiled)
      self.postMessage(compiled);
  });
  async function compileTile(x, y, z) {
    const tileId = `${x}-${y}-${z}`;
    const compiledFeatures = [];
    let vectorTile;
    try {
      const res = await fetch(
        `https:/api.mapbox.com/v4/${sourceId}/${z}/${x}/${y}.vector.pbf?access_token=${TOKEN}`
      );
      vectorTile = new import_vector_tile.VectorTile(new import_pbf.default(await res.arrayBuffer()));
    } catch (e) {
      console.debug(e);
      return null;
    }
    function colorMap(feature) {
      switch (feature.properties.class) {
        case "crop":
          return [0.2, 0.5, 0.2];
        case "grass":
          return [0.1, 0.5, 0];
        case "scrub":
          return [0.2, 0.4, 0];
        case "snow":
          return [1, 1, 1];
        case "wood":
          return [0.01, 0.4, 0.01];
        case "shadow":
        case "highlight":
          let c = (feature.properties.level - 56) / (94 - 56);
          return Array(3).fill(c);
        default:
          return [100, 100, 200].map((m) => feature.id % m / m);
      }
    }
    function compileFeature(feature) {
      const featureId = feature.id;
      const geojson = feature.toGeoJSON(x, y, z);
      const triangles = [];
      const vertices = [];
      function compile(rings) {
        const data = import_earcut.default.flatten(rings.map((ring) => ring.map(fromLngLat)));
        const base = vertices.length / 2;
        vertices.push(...data.vertices);
        const tri = (0, import_earcut.default)(data.vertices, data.holes, data.dimensions);
        triangles.push(...tri.map((i) => i + base));
      }
      switch (geojson.geometry.type) {
        case "Polygon":
          compile(geojson.geometry.coordinates);
          break;
        case "MultiPolygon":
          geojson.geometry.coordinates.forEach((c) => compile(c));
          break;
        case "LineString":
        case "MultiLineString":
          console.log("not implemented");
        default:
      }
      const color = colorMap(feature);
      compiledFeatures.push({ tileId, featureId, color, vertices, triangles });
    }
    for (const [key, layer] of Object.entries(vectorTile.layers)) {
      for (let i = 0; i < layer.length; ++i) {
        compileFeature(layer.feature(i));
      }
    }
    return compiledFeatures;
  }
})();
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)
*/
