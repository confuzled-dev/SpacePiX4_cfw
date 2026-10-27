#!/usr/bin/env python3
"""
Creality SpacePi X4 (DB-05) Boot Splash Patcher (Pic 81)
Replaces Picture 81 (320x240 boot splash at 0x22B70B in v0.3.0_0.7.lcd)
in-place (exact 900 RLE blocks = 20,840 bytes) without altering any
table offsets or a single byte of the ARM Cortex-M MCU binary.
"""
import struct
import sys
import zlib


def nextion_crc_bytes(buf: bytes, init: int = 0xFFFFFFFF) -> int:
    crc = init & 0xFFFFFFFF
    for b in buf:
        crc ^= b
        for _ in range(32):
            if crc & 0x80000000:
                crc = ((crc << 1) ^ 0x04C11DB7) & 0xFFFFFFFF
            else:
                crc = (crc << 1) & 0xFFFFFFFF
    return crc


def decode_pic_rle(pic: bytes, w: int = 320, h: int = 240) -> list[list[int]]:
    tbl_off = struct.unpack_from("<I", pic, 0)[0] - 4
    rows: list[list[int]] = []
    for y in range(h):
        p1, p2 = struct.unpack_from("<II", pic, tbl_off + y * 8)
        p1 -= 4
        p2 -= 4
        next_p2 = (
            struct.unpack_from("<I", pic, tbl_off + (y + 1) * 8 + 4)[0] - 4
            if y < h - 1
            else len(pic) - 4
        )
        num_blocks = next_p2 - p2
        row: list[int] = []
        for b in range(num_blocks):
            blk_off = p1 + b * 20
            mask = struct.unpack_from("<I", pic, blk_off)[0]
            for i in range(8):
                run = 1 if mask == 0x1111111F else ((mask >> (i * 4)) & 0xF)
                if run == 0:
                    continue
                c = struct.unpack_from("<H", pic, blk_off + 4 + i * 2)[0]
                row.extend([c] * run)
        rows.append(row[:w])
    return rows


def encode_pic_rle(rows: list[list[int]], target_blocks: int = 900) -> bytes:
    h = len(rows)
    w = len(rows[0])

    # Pre-count natural blocks
    natural_blocks = 0
    for row in rows:
        x = 0
        while x < w:
            natural_blocks += 1
            for slot in range(8):
                if x >= w:
                    break
                max_run = 14 if slot == 0 else 15
                c = row[x]
                run = 0
                while x < w and row[x] == c and run < max_run:
                    run += 1
                    x += 1

    pad_rows = max(0, target_blocks - natural_blocks)
    cols = [0] * 8
    blocks: list[bytes] = []
    line_block_starts: list[int] = []
    line_count_starts: list[int] = []
    counts: list[int] = []

    for y, row in enumerate(rows):
        line_block_starts.append(0x10 + len(blocks) * 20)
        line_count_starts.append(len(counts))

        if pad_rows > 0 and all(c == 0 for c in row):
            pad_rows -= 1
            for _ in range(4):
                blocks.append(struct.pack("<I8H", 0x006FFFFE, *([0] * 8)))
                counts.append(80)
            continue

        x = 0
        while x < w:
            runs = [0] * 8
            total_run = 0
            for slot in range(8):
                if x >= w:
                    break
                max_run = 14 if slot == 0 else 15
                c = row[x]
                run = 0
                while x < w and row[x] == c and run < max_run:
                    run += 1
                    x += 1
                runs[slot] = run
                cols[slot] = c
                total_run += run

            if all(r == 1 for r in runs):
                mask = 0x1111111F
            else:
                mask = 0
                for slot in range(8):
                    mask |= (runs[slot] & 0xF) << (slot * 4)

            blocks.append(struct.pack("<I8H", mask, *cols))
            counts.append(total_run)

    tbl_offset = 0x10 + len(blocks) * 20
    ctl_offset = tbl_offset + h * 8
    out = bytearray(ctl_offset + len(counts) + 4)
    struct.pack_into("<I", out, 0, tbl_offset + 4)

    for i, blk in enumerate(blocks):
        out[0x10 + i * 20 : 0x10 + (i + 1) * 20] = blk

    for y in range(h):
        struct.pack_into(
            "<II",
            out,
            tbl_offset + y * 8,
            line_block_starts[y] + 4,
            ctl_offset + line_count_starts[y] + 4,
        )

    out[ctl_offset : ctl_offset + len(counts)] = bytes(counts)
    struct.pack_into("<I", out, len(out) - 4, 1)
    return bytes(out)


if __name__ == "__main__":
    fw_path = sys.argv[1] if len(sys.argv) > 1 else "firmware/v0.3.0_0.7_custom_splash.lcd"
    with open(fw_path, "rb") as f:
        data = f.read()
    mcu_off = struct.unpack_from("<I", data, 0x3C)[0]
    stored_crc = struct.unpack_from("<I", data, mcu_off - 4)[0]
    mask = data[0x03] ^ data[0x2E] ^ data[0x3C]
    calc_crc = nextion_crc_bytes(data[: mcu_off - 4]) ^ mask
    print(f"[*] {fw_path}:")
    print(f"    - Stored UI CRC:     0x{stored_crc:08x}")
    print(f"    - Calculated UI CRC: 0x{calc_crc:08x}")
    print(f"    - Status:            {'VALID' if stored_crc == calc_crc else 'MISMATCH'}")
