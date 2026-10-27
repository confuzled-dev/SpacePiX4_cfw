#!/usr/bin/env python3
import struct
import sys

def analyze_binaries(path1, path2):
    with open(path1, 'rb') as f:
        d1 = f.read()
    with open(path2, 'rb') as f:
        d2 = f.read()

    mcu_off1 = struct.unpack('<I', d1[0x3c:0x40])[0]
    mcu_off2 = struct.unpack('<I', d2[0x3c:0x40])[0]

    mcu1 = d1[mcu_off1:]
    mcu2 = d2[mcu_off2:]

    print(f"[*] Comparing MCU Binaries:")
    print(f"    - {path1}: {len(mcu1)} bytes")
    print(f"    - {path2}: {len(mcu2)} bytes")

    diffs = []
    min_len = min(len(mcu1), len(mcu2))
    in_diff = False
    start_idx = 0

    for i in range(min_len):
        if mcu1[i] != mcu2[i]:
            if not in_diff:
                in_diff = True
                start_idx = i
        else:
            if in_diff:
                in_diff = False
                diffs.append((start_idx, i))

    if in_diff:
        diffs.append((start_idx, min_len))

    print(f"[*] Found {len(diffs)} modified regions in MCU binary.")
    for idx, (start, end) in enumerate(diffs[:20]):
        print(f"    Region {idx+1}: offset 0x{start:x}..0x{end:x} (size: {end-start} bytes)")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 diff_mcu.py <firmware1.lcd> <firmware2.lcd>")
        sys.exit(1)
    analyze_binaries(sys.argv[1], sys.argv[2])
