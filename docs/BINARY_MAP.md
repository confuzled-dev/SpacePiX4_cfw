# Binary Map & Structural Specification

## 1. Container Header Format (`CT2E`)
- **Offset `0x00 - 0x01`:** Unknown flags (`0x0001`)
- **Offset `0x02 - 0x05`:** Magic ASCII signature `CT2E` (`0x54430100` / `0x43543245`)
- **Offset `0x0C - 0x13`:** Display dimensions (`0x0140` = 320, `0x00F0` = 240)
- **Offset `0x3C - 0x3F`:** 32-bit Little Endian pointer to the start of the MCU binary payload (also the total byte length of the TJC/Nextion `.tft` UI partition).
  - `v0.2.5_0.5.lcd`: Offset `4,419,944` (`0x437168`)
  - `v0.3.0_0.7.lcd`: Offset `4,421,092` (`0x4375E4`)
- **Container Checksums (32-shift-per-byte CRC-32, `poly = 0x04C11DB7`, `init = 0xFFFFFFFF`):**
  - **Header 1 CRC (`0xC4 - 0xC7`):** Computed over `0x00..0xC3` (`0x97C10CA9` in `v0.2.5`, `0x5A8AE654` in `v0.3.0`).
  - **Header 2 CRC (`0x18C - 0x18F`):** Computed over `0xC8..0x18B` (`0x1CF988A0` in `v0.2.5`, `0xA4321CAF` in `v0.3.0`).
  - **UI Partition Trailing CRC (`mcu_offset - 4 .. mcu_offset - 1`):** Computed over `0x00 .. mcu_offset - 5`, XORed with `data[0x03] ^ data[0x2E] ^ data[0x3C]` (`0x64D3CA5E` in `v0.2.5`, `0x9D19B2DB` in `v0.3.0`).

## 2. HMI / Display Asset Partition
- **Range:** `0x000040` to MCU Start Offset
- **Picture Descriptor Table (`0x0581F1` to `0x059601`):**
  - Contains `214` entries (`24` bytes each: `uint32_t id`, `uint32_t rel_offset` from `0x0581F1`, `uint16_t width`, `uint16_t height`, `uint32_t byte_size`, `uint64_t format_flags`).
  - **Boot Splash Screen (`Pic 81`):** Located at descriptor `0x058989`, data offset `0x22B70B..0x230872` (`320x240`, `20,840` bytes = `900` RLE blocks in `0a600103` format).
  - **`0a600103` RLE Picture Compression Format:**
    - `0x00..0x0F`: 16-byte header (`uint32_t scanline_table_offset + 4`, followed by 12 zero bytes).
    - `0x10..scanline_table_offset`: 20-byte pixel blocks (`uint32_t nibble_runs`, `uint16_t rgb565_colors[8]`). Nibble 0 max run is `14`; Nibbles 1..7 max run is `15`; `0x1111111F` encodes 8 literal pixels (`run = 1` each).
    - `scanline_table_offset`: `height` pairs of `(block_offset + 4, count_offset + 4)`.
    - `count_offset`: 1 byte per 20-byte block holding the block's pixel sum, followed by a 4-byte trailer `0x00000001`.
- **Bytecode & String Partition (`0x310000` to MCU Start Offset):**
  - Multilingual string tables (EN, DE, FR, ES, IT, PT, RU, TR, ZH, JA), font glyphs, touch coordinate lookup tables, and UI page descriptors.

## 3. Microcontroller Binary Payload (ARM Cortex-M)
- **Base Flash Address:** `0x08000000`
- **Vector Table Structure (at base offset):**
  - `0x00 - 0x03`: Initial Stack Pointer (e.g., `0x20001350`)
  - `0x04 - 0x07`: Reset Handler Vector (Thumb mode, e.g., `0x08000241`)
- **RAM Segment:** `0x20000000` (20KB SRAM)
