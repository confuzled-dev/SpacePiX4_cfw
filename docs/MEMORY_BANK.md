# Project Memory Bank: Creality SpacePi X4 Firmware Analysis

## Active Context & Status
- **Target Device:** Creality SpacePi X4 Multi-Chamber Filament Dryer (`DB-05`).
- **Active Comparison:** `v0.2.5_0.5` → `v0.3.0_0.7` → `v0.3.0_0.8` → `v0.2.9_1.1_cspx4` → Latest `v0.2.9_3.1_cspx4`.
- **Primary Discoveries:**
  - Decoded container signature `CT2E` (`0x000143543245`) and newer `DT` (`0xF7014454`) header with embedded MCU size (`0x04`) and CRC (`0x08`).
  - Carved and analyzed ARM Cortex-M Thumb-2 microcontroller binary (`0x08000000` base address).
  - Maximum temperature limit expanded from 85°C to 90°C.
  - Timer interface redesigned from minutes-only to a hybrid hour/minute system (up to 480 minutes / 8 hours for Auto Drying; 1–48 hours for Manual Drying).
  - Real-time UART telemetry stream added (`L_Tar`, `R_Tar`, `L_PTC`, `R_PTC`, `L_NTC`, `R_NTC`, `L_AHT`, `R_AHT`).
  - False-positive cover detection filtering added to prevent vibration-induced heating pauses.
  - Reverse-engineered and hardware-verified the `CT2E` 32-shift-per-byte CRC-32 checksums (`0xC4`, `0x18C`, and `mcu_offset - 4` with header XOR mask `data[0x03] ^ data[0x2E] ^ data[0x3C]`).
  - Reverse-engineered the `0a600103` 20-byte RLE picture compression format and picture descriptor table (`0x0581F1`), successfully flashing a custom `320x240` boot splash screen (`Pic 81` at `0x22B70B`) onto hardware.
  - Analyzed `v0.3.0_0.8.lcd` vs. `v0.3.0_0.7.lcd`: MCU binary is 100% functionally identical (only build date changed from `"Mar  2 2026"` to `"Mar  6 2026"` at `0x080042E9`); UI partition shrank by 12 bytes by removing duplicate `page page4` calls from cross-triggering hotspots `m1`/`m2` (`0x32F675`, `0x32F6DA`) and moving `page page4` into the language/state transition `up` handler (`0x32ED4E`) to resolve post-language-switch UI lag.
  - Analyzed `v0.2.9_1.1_cspx4.lcd` vs. `v0.2.9_3.1_cspx4.lcd`: Both share the exact same `22,844`-byte MCU binary (`0` bytes diff, `"Jun  1 2026"`, adding `AHT30` `0x38` + `NSHT30` `0x44` dual I2C sensor auto-detection). `v0.2.9_1.1_cspx4` is the transitional release (`4,444,236` B, UI `"_1.1"`) built directly on `v0.3.0_0.8`'s 34-page/214-picture UI (`+312` B), adding `<5%` low-humidity clamping (`0x3210D6`, `0x3225AD`, `0x3281F3`), the `<` glyph in Font 2 (`0x10028`), and fixing the `[E01..E04]` error dialog text box overlap (`55,70,212,80` → `55,70,212,60` at `0x389BE0`). `v0.2.9_3.1_cspx4` (`4,161,192` B, UI `"_3.1"`) is the newest firmware overall, refactoring the 34 per-page helper blocks into a single global subroutine (`0x310E90..0x3131E4`, saving `283 KB`), expanding to 35 pages (`My Drying` and `Auto Dehum` separated) and 218 pictures, and fixing the single-chamber Left/Right Auto Dry `480 min` (`8h`) limit (`0x34295D`, `0x343D7E`).
  - Identified HMI-to-MCU UART command framing at `0x389DC0`: `5A A5 <len> <cmd> <payload_u16_be> <crc16_modbus_le>` (e.g., `5A A5 05 06 00 01 61 F5`, `5A A5 05 06 00 02 21 F4`).

## Known Technical Debt & Open Questions
- [ ] Map the exact UART baud rate and packet framing structure between the HMI display and main MCU.
- [ ] Reverse engineer the EEPROM memory layout for custom user material preset storage.
- [x] Investigate firmware container checksum verification routines (solved and verified on hardware).

- [x] Compare all 5 official firmware revisions (`v0.2.5_0.5`, `v0.3.0_0.7`, `v0.3.0_0.8`, `v0.2.9_1.1_cspx4`, `v0.2.9_3.1_cspx4`) and verify `v0.2.9_3.1_cspx4.lcd` as the latest base firmware.
- [x] Build custom firmware `A3.0.0_cspx4.lcd` (`95°C`/`203°F` max temperature across UI + MCU with thermal fault reporting preserved, full native `1×1` `320×240` custom splash screen, boot process disclaimer `"ALPHA FIRMWARE: NO WARRANTY, EXPRESS OR IMPLIED"`, and version `A3.0.0`).
