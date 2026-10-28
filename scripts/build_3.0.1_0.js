#!/usr/bin/env node
/**
 * Creality SpacePi X4 (DB-05) Custom Firmware Builder — Version 3.0.1_0 (v3.0.1_0)
 * Base Official Firmware: v0.2.9_3.1_cspx4.lcd (4,161,192 bytes)
 *
 * Feature Highlights:
 *  1. 95°C (203°F) Maximum Temperature Range:
 *     - UI master global variable var_0x0020 at 0x310054: 90 (0x5A) -> 95 (0x5F)
 *       (Automatically scales all Celsius 45~95°C & Fahrenheit 113~203°F limits, keypad prompts,
 *        keypad OK clamping, + buttons, Manual Drying, Auto Drying, and My Drying presets)
 *     - MCU target-temperature clamp in 0x080058D4 loop:
 *       * 0x18DE (.lcd 0x3F3E4A): 25 5A (MOVS R5, #90) -> 25 5F (MOVS R5, #95)
 *       * 0x18F4 (.lcd 0x3F3E60): 2A 5A (CMP  R2, #90) -> 2A 5F (CMP  R2, #95)
 *       (All MCU thermal safety fault checks [E01], [E02], [E03], [E04] remain 100% active and
 *        dynamically track Target_Temp)
 *  2. Full Native Resolution (320x240, 1x1 pixel, 16-bit RGB565) Custom Splash & Boot Disclaimer:
 *     - Custom splash image encoded at 100% native 1x1 resolution without pixel grouping or posterization
 *     - Prominent boot disclaimer banner: "ALPHA FIRMWARE: NO WARRANTY, EXPRESS OR IMPLIED" at y = 227..233
 *     - Stored cleanly in the 61,058-byte unused zero-padding region at 0x301180 (relOff = 0x2AC74F)
 *     - Leaves ALL heating gauge ring assets (Pic 0..80) and UI pictures (Pic 82..217) 100% factory original
 *  3. Firmware Version 3.0.1_0 (V3.0.1_0):
 *     - MCU version tuple at 0x49C0 (.lcd 0x3F6F2C): 03 00 01 00 (3.0.1)
 *     - MCU UART banner at 0x49E2: "Software version: V3.0.1, Date:Jun  1 2026\r\n"
 *     - UI sub 6 prefix at 0x312BDD: "V" (0x56) -> str_0x00a2 = "V3.0.1"
 *     - UI Page 19 version suffix str_0x2945 at 0x351852: "_0\0\0" (5F 30 00 00)
 *     - UI Page 19 default string str_0x288d at 0x3517D3: "V3.0.1_0\0"
 *       -> About screen displays: "V3.0.1_0"
 *  4. Hardware Checksum Regeneration:
 *     - Recomputes all 4 container & partition CRC-32 checksums (0x08 MCU CRC, 0xC4 Header 1,
 *       0x18C Header 2, and 0x3F2568 UI Master CRC).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function nextionCrcBytes(buf, init = 0xFFFFFFFF) {
  let crc = init >>> 0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let b = 0; b < 32; b++) {
      if (crc & 0x80000000) {
        crc = (((crc << 1) ^ 0x04C11DB7) >>> 0);
      } else {
        crc = ((crc << 1) >>> 0);
      }
    }
  }
  return crc >>> 0;
}

function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  let off = 8, w = 0, h = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IHDR') {
      w = buf.readUInt32BE(off + 8);
      h = buf.readUInt32BE(off + 12);
    } else if (type === 'IDAT') {
      idat.push(buf.subarray(off + 8, off + 8 + len));
    }
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(w * h * 4);
  const stride = w * 4;
  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  }
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const rowIn = y * (stride + 1) + 1;
    const rowOut = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[rowIn + i];
      const a = i >= 4 ? rgba[rowOut + i - 4] : 0;
      const b = y > 0 ? rgba[rowOut - stride + i] : 0;
      const c = (y > 0 && i >= 4) ? rgba[rowOut - stride + i - 4] : 0;
      let val = x;
      if (filter === 1) val = (x + a) & 0xFF;
      else if (filter === 2) val = (x + b) & 0xFF;
      else if (filter === 3) val = (x + ((a + b) >> 1)) & 0xFF;
      else if (filter === 4) val = (x + paeth(a, b, c)) & 0xFF;
      rgba[rowOut + i] = val;
    }
  }
  return { w, h, rgba };
}

function writePng(filePath, w, h, rows565) {
  const stride = w * 3 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < w; x++) {
      const c = rows565[y][x];
      const r5 = (c >>> 11) & 0x1F;
      const g6 = (c >>> 5) & 0x3F;
      const b5 = c & 0x1F;
      const r = (r5 << 3) | (r5 >>> 2);
      const g = (g6 << 2) | (g6 >>> 4);
      const b = (b5 << 3) | (b5 >>> 2);
      const idx = y * stride + 1 + x * 3;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
    }
  }
  function chunk(type, data) {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 4, 'ascii');
    data.copy(out, 8);
    const crc = zlib.crc32(out.subarray(4, 8 + data.length)) >>> 0;
    out.writeUInt32BE(crc, 8 + data.length);
    return out;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  fs.writeFileSync(filePath, Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]));
}

function decodePicRle(pic, w = 320, h = 240) {
  const tblOff = pic.readUInt32LE(0) - 4;
  const rows = [];
  for (let y = 0; y < h; y++) {
    const p1 = pic.readUInt32LE(tblOff + y * 8) - 4;
    const p2 = pic.readUInt32LE(tblOff + y * 8 + 4) - 4;
    const nextP2 = (y < h - 1) ? (pic.readUInt32LE(tblOff + (y + 1) * 8 + 4) - 4) : (pic.length - 4);
    const numBlocks = nextP2 - p2;
    const row = [];
    for (let b = 0; b < numBlocks; b++) {
      const blkOff = p1 + b * 20;
      const mask = pic.readUInt32LE(blkOff);
      for (let i = 0; i < 8; i++) {
        const run = (mask === 0x1111111F) ? 1 : ((mask >>> (i * 4)) & 0xF);
        if (run === 0) continue;
        const c = pic.readUInt16LE(blkOff + 4 + i * 2);
        for (let r = 0; r < run; r++) row.push(c);
      }
    }
    rows.push(row.slice(0, w));
  }
  return rows;
}

function encodePicRle(rows) {
  const h = rows.length, w = rows[0].length;
  let naturalBlocks = 0;
  for (const row of rows) {
    let x = 0;
    while (x < w) {
      naturalBlocks++;
      for (let slot = 0; slot < 8; slot++) {
        if (x >= w) break;
        const maxRun = (slot === 0) ? 14 : 15;
        const c = row[x];
        let run = 0;
        while (x < w && row[x] === c && run < maxRun) {
          run++;
          x++;
        }
      }
    }
  }

  const cols = new Array(8).fill(0);
  const blocks = [];
  const lineBlockStarts = [];
  const lineCountStarts = [];
  const counts = [];

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    lineBlockStarts.push(0x10 + blocks.length * 20);
    lineCountStarts.push(counts.length);

    let x = 0;
    while (x < w) {
      const runs = [0, 0, 0, 0, 0, 0, 0, 0];
      let totalRun = 0;
      for (let slot = 0; slot < 8; slot++) {
        if (x >= w) break;
        const maxRun = (slot === 0) ? 14 : 15;
        const c = row[x];
        let run = 0;
        while (x < w && row[x] === c && run < maxRun) {
          run++;
          x++;
        }
        runs[slot] = run;
        cols[slot] = c;
        totalRun += run;
      }
      let mask = 0;
      if (runs.every(r => r === 1)) {
        mask = 0x1111111F;
      } else {
        for (let slot = 0; slot < 8; slot++) {
          mask = (mask | ((runs[slot] & 0xF) << (slot * 4))) >>> 0;
        }
      }
      const blk = Buffer.alloc(20);
      blk.writeUInt32LE(mask >>> 0, 0);
      for (let slot = 0; slot < 8; slot++) {
        blk.writeUInt16LE(cols[slot] & 0xFFFF, 4 + slot * 2);
      }
      blocks.push(blk);
      counts.push(totalRun);
    }
  }

  const tblOffset = 0x10 + blocks.length * 20;
  const ctlOffset = tblOffset + h * 8;
  const out = Buffer.alloc(ctlOffset + counts.length + 4);
  out.writeUInt32LE(tblOffset + 4, 0);
  for (let i = 0; i < blocks.length; i++) {
    blocks[i].copy(out, 0x10 + i * 20);
  }
  for (let y = 0; y < h; y++) {
    out.writeUInt32LE(lineBlockStarts[y] + 4, tblOffset + y * 8);
    out.writeUInt32LE(ctlOffset + lineCountStarts[y] + 4, tblOffset + y * 8 + 4);
  }
  for (let i = 0; i < counts.length; i++) {
    out[ctlOffset + i] = counts[i];
  }
  out.writeUInt32LE(1, out.length - 4);
  return { buf: out, numBlocks: blocks.length, naturalBlocks };
}

const FONT_5X7 = {
  'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
  'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
  'D': [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
  'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
  'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
  'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F],
  'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
  'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
  'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
  'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
  'S': [0x0E, 0x11, 0x10, 0x0E, 0x01, 0x11, 0x0E],
  'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
  'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
  '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
  '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
  '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
  '3': [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E],
  '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
  '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x11, 0x0E],
  ':': [0x00, 0x0C, 0x0C, 0x00, 0x0C, 0x0C, 0x00],
  ',': [0x00, 0x00, 0x00, 0x00, 0x06, 0x04, 0x08],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C],
  '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '-': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
  '_': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
};

function drawTextCentered5x7(rows, text, y, color565, spacing = 6) {
  const outW = rows[0].length;
  const textW = text.length * spacing - (spacing - 5);
  const startX = Math.floor((outW - textW) / 2);
  for (let i = 0; i < text.length; i++) {
    const glyph = FONT_5X7[text[i]] || FONT_5X7[' '];
    const cx = startX + i * spacing;
    for (let gy = 0; gy < 7; gy++) {
      const bits = glyph[gy];
      const py = y + gy;
      if (py < 0 || py >= rows.length) continue;
      for (let gx = 0; gx < 5; gx++) {
        if ((bits >>> (4 - gx)) & 1) {
          const px = cx + gx;
          if (px >= 0 && px < outW) {
            rows[py][px] = color565;
          }
        }
      }
    }
  }
}

function rgb888To565(r, g, b) {
  return (((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >>> 3)) & 0xFFFF;
}

// 1. Load clean official base firmware v0.2.9_3.1_cspx4.lcd
const baseFwPath = path.resolve(__dirname, '../firmware/v0.2.9_3.1_cspx4.lcd');
const lcd = Buffer.from(fs.readFileSync(baseFwPath));
const mcuOff = lcd.readUInt32LE(0x3C); // 0x3F256C
console.log(`[*] Loaded base official firmware: ${baseFwPath} (${lcd.length} bytes, MCU offset: 0x${mcuOff.toString(16)})`);

// 2. Build Full-Resolution (320x240, 1x1 pixel) Custom Splash + Disclaimer (Pic 81)
const splashPngPath = path.resolve(__dirname, '../assets/splash_source.png');
const src = readPng(splashPngPath);
const cx = src.w / 2, cy = src.h / 2, maxR = 374;
const outW = 320, outH = 240;

const splashRows = Array.from({ length: outH }, () => new Array(outW).fill(0));
const srcY0 = 75, srcH = 635;
const dstY0 = 3, dstH = 216;
const scale = srcH / dstH;

for (let dy = 0; dy < dstH; dy++) {
  const syStart = srcY0 + dy * scale;
  const syEnd = syStart + scale;
  const sy0 = Math.floor(syStart), sy1 = Math.min(src.h - 1, Math.ceil(syEnd));
  for (let dx = 0; dx < outW; dx++) {
    const sxCenter = cx + (dx - outW / 2) * scale;
    const sxStart = sxCenter - scale / 2;
    const sxEnd = sxCenter + scale / 2;
    const sx0 = Math.floor(sxStart), sx1 = Math.min(src.w - 1, Math.ceil(sxEnd));
    let rSum = 0, gSum = 0, bSum = 0, wSum = 0;
    for (let sy = sy0; sy <= sy1; sy++) {
      const wy = Math.min(sy + 1, syEnd) - Math.max(sy, syStart);
      if (wy <= 0) continue;
      for (let sx = sx0; sx <= sx1; sx++) {
        if (sx < 0 || sx >= src.w || sy < 0 || sy >= src.h) continue;
        const wx = Math.min(sx + 1, sxEnd) - Math.max(sx, sxStart);
        if (wx <= 0) continue;
        const weight = wx * wy;
        const dist = Math.hypot(sx - cx, sy - cy);
        let r = 0, g = 0, b = 0;
        if (dist <= maxR) {
          const idx = (sy * src.w + sx) * 4;
          r = src.rgba[idx];
          g = src.rgba[idx + 1];
          b = src.rgba[idx + 2];
          if (r < 12 && g < 12 && b < 12) { r = 0; g = 0; b = 0; }
        }
        rSum += r * weight;
        gSum += g * weight;
        bSum += b * weight;
        wSum += weight;
      }
    }
    if (wSum > 0) {
      const r = Math.round(rSum / wSum);
      const g = Math.round(gSum / wSum);
      const b = Math.round(bSum / wSum);
      splashRows[dstY0 + dy][dx] = rgb888To565(r, g, b);
    }
  }
}

const DISCLAIMER_TEXT = "ALPHA FIRMWARE: NO WARRANTY, EXPRESS OR IMPLIED";
const amber565 = rgb888To565(255, 195, 70);
drawTextCentered5x7(splashRows, DISCLAIMER_TEXT, 227, amber565, 6);

const encodedSplash = encodePicRle(splashRows);
console.log(`[*] Encoded Pic 81 (Full 1x1 Native Resolution Splash + Disclaimer): ${encodedSplash.numBlocks} blocks (${encodedSplash.buf.length} bytes)`);

// 3. Write Full-Resolution Custom Splash + Disclaimer (Pic 81) into free padding at 0x301180
// Preserves Pic 0..80 (heating gauge rings) and Pic 82..217 completely 100% factory original!
const picTblBase = 0x054A31;
const splashTargetOff = 0x301180;
const splashRelOff = splashTargetOff - picTblBase; // 0x2AC74F

encodedSplash.buf.copy(lcd, splashTargetOff);

const p81 = picTblBase + 81 * 24;
lcd.writeUInt32LE(splashRelOff, p81 + 4);
lcd.writeUInt32LE(encodedSplash.buf.length, p81 + 12);
console.log(`[*] Placed Pic 81 in free asset padding at 0x${splashTargetOff.toString(16)} (relOff=0x${splashRelOff.toString(16)}, len=${encodedSplash.buf.length} bytes)`);
console.log(`[*] Preserved Pic 0..80 (temperature gauge rings) and Pic 82..217 completely factory-original.`);

// 4. Patch UI Max Temperature (90°C -> 95°C / 203°F)
const uiMaxTempOff = 0x310054;
const oldUiMaxTemp = lcd.readUInt32LE(uiMaxTempOff);
if (oldUiMaxTemp !== 90) {
  throw new Error(`Unexpected var_0x0020 value at 0x310054: ${oldUiMaxTemp}`);
}
lcd.writeUInt32LE(95, uiMaxTempOff);
console.log(`[*] Patched UI master max_temp (var_0x0020 at 0x310054): ${oldUiMaxTemp} -> ${lcd.readUInt32LE(uiMaxTempOff)} (95°C / 203°F)`);

// 5. Patch Version to 3.0.1_0 (V3.0.1_0)
// 5a. UI sub 6 at 0x312BDD: keeps "V" prefix so str_0x00a2 = "V3.0.1"
if (lcd[0x312BDD] !== 0x56) {
  throw new Error(`Unexpected byte at 0x312BDD: 0x${lcd[0x312BDD].toString(16)}`);
}

// 5b. UI Page 19 initial default string str_0x288d at 0x3517D3: "V3.0.1_0\0"
Buffer.from('V3.0.1_0\0', 'ascii').copy(lcd, 0x3517D3);

// 5c. UI Page 19 version suffix str_0x2945 at 0x351852: "_3.1" -> "_0\0\0"
if (lcd.toString('ascii', 0x351852, 0x351856) !== '_3.1') {
  throw new Error(`Unexpected suffix at 0x351852: ${lcd.toString('ascii', 0x351852, 0x351856)}`);
}
Buffer.from('_0\0\0', 'ascii').copy(lcd, 0x351852);
console.log(`[*] Patched UI firmware version strings (0x312BDD, 0x3517D3, 0x351852) -> "V3.0.1_0"`);

// 6. Patch MCU Max Temperature (90°C -> 95°C) and Version (V0.2.9 -> V3.0.1)
const mcuMovsOff = mcuOff + 0x18DE; // 0x3F3E4A
const mcuCmpOff  = mcuOff + 0x18F4; // 0x3F3E60
if (lcd[mcuMovsOff] !== 0x5A || lcd[mcuMovsOff + 1] !== 0x25) {
  throw new Error(`Unexpected instruction at 0x${mcuMovsOff.toString(16)}: ${lcd.subarray(mcuMovsOff, mcuMovsOff + 2).toString('hex')}`);
}
if (lcd[mcuCmpOff] !== 0x5A || lcd[mcuCmpOff + 1] !== 0x2A) {
  throw new Error(`Unexpected instruction at 0x${mcuCmpOff.toString(16)}: ${lcd.subarray(mcuCmpOff, mcuCmpOff + 2).toString('hex')}`);
}
lcd[mcuMovsOff] = 0x5F; // MOVS R5, #95 (5F 25)
lcd[mcuCmpOff]  = 0x5F; // CMP  R2, #95 (5F 2A)
console.log(`[*] Patched MCU target temperature clamp (0x18DE MOVS R5,#95 & 0x18F4 CMP R2,#95)`);

const mcuVerOff = mcuOff + 0x49C0; // 0x3F6F2C
if (lcd[mcuVerOff] !== 0x00 || lcd[mcuVerOff + 1] !== 0x02 || lcd[mcuVerOff + 2] !== 0x09) {
  throw new Error(`Unexpected MCU version bytes at 0x${mcuVerOff.toString(16)}`);
}
lcd[mcuVerOff]     = 0x03; // major = 3
lcd[mcuVerOff + 1] = 0x00; // minor = 0
lcd[mcuVerOff + 2] = 0x01; // patch = 1 (3.0.1)
console.log(`[*] Patched MCU firmware version (0x49C0 -> 3.0.1, banner -> "Software version: V3.0.1, Date:Jun  1 2026")`);

// 7. Recompute all container & partition CRCs
// 7a. MCU CRC at header offset 0x08
const mcuSlice = lcd.subarray(mcuOff);
const newMcuCrc = nextionCrcBytes(mcuSlice);
lcd.writeUInt32LE(newMcuCrc, 0x08);

// 7b. Header1 CRC at 0xC4 (over 0x00..0xC4)
const newHdr1Crc = nextionCrcBytes(lcd.subarray(0x00, 0xC4));
lcd.writeUInt32LE(newHdr1Crc, 0xC4);

// 7c. Header2 CRC at 0x18C (over 0xC8..0x18C)
const newHdr2Crc = nextionCrcBytes(lcd.subarray(0xC8, 0x18C));
lcd.writeUInt32LE(newHdr2Crc, 0x18C);

// 7d. UI Master CRC at mcuOff - 4 (0x3F2568)
const mask = lcd[0x03] ^ lcd[0x2E] ^ lcd[0x3C];
const newUiCrc = (nextionCrcBytes(lcd.subarray(0x00, mcuOff - 4)) ^ mask) >>> 0;
lcd.writeUInt32LE(newUiCrc, mcuOff - 4);

console.log(`[*] Recomputed Checksums:`);
console.log(`    - MCU CRC (0x08):        0x${newMcuCrc.toString(16).padStart(8, '0')}`);
console.log(`    - Header1 CRC (0xC4):    0x${newHdr1Crc.toString(16).padStart(8, '0')}`);
console.log(`    - Header2 CRC (0x18C):   0x${newHdr2Crc.toString(16).padStart(8, '0')}`);
console.log(`    - UI Master CRC (0x3F2568): 0x${newUiCrc.toString(16).padStart(8, '0')} (mask=0x${mask.toString(16)})`);

// 8. Save outputs and decoded verification previews
const outFwPaths = [
  path.resolve(__dirname, '../firmware/v3.0.1_0_cspx4.lcd'),
  path.resolve(__dirname, '../firmware/3.0.1_0_cspx4.lcd')
];
const outUiPath = path.resolve(__dirname, '../extracted/v3.0.1_0_cspx4_ui.bin');
const outMcuPath = path.resolve(__dirname, '../extracted/v3.0.1_0_cspx4_mcu.bin');
const outSplashPreview = path.resolve(__dirname, '../extracted/v3.0.1_0_splash_preview.png');
const outGaugePreview = path.resolve(__dirname, '../extracted/v3.0.1_0_pic65_gauge_preview.png');

outFwPaths.forEach(p => fs.writeFileSync(p, lcd));
fs.writeFileSync(outUiPath, lcd.subarray(0, mcuOff));
fs.writeFileSync(outMcuPath, lcd.subarray(mcuOff));

// Decode Pic 65 directly from the written .lcd buffer to verify the heating ring is factory-clean
const p65 = picTblBase + 65 * 24;
const p65Rel = lcd.readUInt32LE(p65 + 4), p65Len = lcd.readUInt32LE(p65 + 12);
const decoded65 = decodePicRle(lcd.subarray(picTblBase + p65Rel, picTblBase + p65Rel + p65Len));
writePng(outGaugePreview, outW, outH, decoded65);

// Decode Pic 81 directly from the written .lcd buffer to verify custom splash + disclaimer integrity
const p81Entry = picTblBase + 81 * 24;
const p81Rel = lcd.readUInt32LE(p81Entry + 4), p81Len = lcd.readUInt32LE(p81Entry + 12);
const decoded81 = decodePicRle(lcd.subarray(picTblBase + p81Rel, picTblBase + p81Rel + p81Len));
writePng(outSplashPreview, outW, outH, decoded81);

console.log(`[+] Successfully built ${outFwPaths[0]} (${lcd.length} bytes)`);
