#!/usr/bin/env python3
import os
import struct
import sys

def extract_firmware(filepath):
    if not os.path.exists(filepath):
        print(f"[!] File not found: {filepath}")
        return
    
    filename = os.path.basename(filepath)
    print(f"[*] Processing {filename}...")
    
    with open(filepath, 'rb') as f:
        data = f.read()
    
    # Read MCU offset from header at 0x3c
    mcu_offset = struct.unpack('<I', data[0x3c:0x40])[0]
    print(f"    - Container Size: {len(data)} bytes")
    print(f"    - MCU Offset: 0x{mcu_offset:x} ({mcu_offset})")
    
    ui_partition = data[:mcu_offset]
    mcu_partition = data[mcu_offset:]
    
    os.makedirs('extracted', exist_ok=True)
    base_name = os.path.splitext(filename)[0]
    
    ui_path = os.path.join('extracted', f'{base_name}_ui.bin')
    mcu_path = os.path.join('extracted', f'{base_name}_mcu.bin')
    
    with open(ui_path, 'wb') as f:
        f.write(ui_partition)
    with open(mcu_path, 'wb') as f:
        f.write(mcu_partition)
        
    print(f"    -> Extracted UI partition to {ui_path}")
    print(f"    -> Extracted MCU partition to {mcu_path}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 extract.py <firmware.lcd>")
        sys.exit(1)
    extract_firmware(sys.argv[1])
