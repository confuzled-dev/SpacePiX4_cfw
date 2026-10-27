# Project Memory Bank: Creality SpacePi X4 Firmware Analysis

## Active Context & Status
- **Target Device:** Creality SpacePi X4 Multi-Chamber Filament Dryer (`DB-05`).
- **Active Comparison:** Baseline `v0.2.5_0.5` vs. Target `v0.3.0_0.7`.
- **Primary Discoveries:**
  - Decoded container signature `CT2E` (`0x000143543245`).
  - Carved and analyzed ARM Cortex-M Thumb-2 microcontroller binary (`0x08000000` base address).
  - Maximum temperature limit expanded from 85°C to 90°C.
  - Timer interface redesigned from minutes-only to a hybrid hour/minute system (up to 480 minutes / 8 hours).
  - Real-time UART telemetry stream added (`L_Tar`, `R_Tar`, `L_PTC`, `R_PTC`, `L_NTC`, `R_NTC`, `L_AHT`, `R_AHT`).
  - False-positive cover detection filtering added to prevent vibration-induced heating pauses.
  - Reverse-engineered and hardware-verified the `CT2E` 32-shift-per-byte CRC-32 checksums (`0xC4`, `0x18C`, and `mcu_offset - 4` with header XOR mask `data[0x03] ^ data[0x2E] ^ data[0x3C]`).
  - Reverse-engineered the `0a600103` 20-byte RLE picture compression format and picture descriptor table (`0x0581F1`), successfully flashing a custom `320x240` boot splash screen (`Pic 81` at `0x22B70B`) onto hardware.

## Known Technical Debt & Open Questions
- [ ] Map the exact UART baud rate and packet framing structure between the HMI display and main MCU.
- [ ] Reverse engineer the EEPROM memory layout for custom user material preset storage.
- [x] Investigate firmware container checksum verification routines (solved and verified on hardware).
