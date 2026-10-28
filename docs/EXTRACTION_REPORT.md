# Creality SpacePi X4 Firmware Extraction & Diff Report

## 1. Container Extraction Summary

| Firmware Image | Container Size | Header Magic & Flags | MCU Offset (`0x3C`) | Extracted UI Partition | Extracted MCU Partition | Vector Table (`SP` / `Reset`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `v0.2.5_0.5.lcd` | `4,440,664` bytes | `0x0100` / `"CT2E"` | `0x437168` (`4,419,944`) | `extracted/v0.2.5_0.5_ui.bin` (`4,419,944` B) | `extracted/v0.2.5_0.5_mcu.bin` (`20,720` B) | `SP=0x20001358`, `Reset=0x08000241` |
| `v0.3.0_0.7.lcd` | `4,441,828` bytes | `0x0100` / `"CT2E"` | `0x4375E4` (`4,421,092`) | `extracted/v0.3.0_0.7_ui.bin` (`4,421,092` B) | `extracted/v0.3.0_0.7_mcu.bin` (`20,736` B) | `SP=0x20001350`, `Reset=0x08000241` |
| `v0.3.0_0.8.lcd` | `4,441,816` bytes | `0x0100` / `"CT2E"` | `0x4375D8` (`4,421,080`) | `extracted/v0.3.0_0.8_ui.bin` (`4,421,080` B) | `extracted/v0.3.0_0.8_mcu.bin` (`20,736` B) | `SP=0x20001350`, `Reset=0x08000241` |
| `v0.2.9_1.1_cspx4.lcd` | `4,444,236` bytes | `0x0100` / `"CT2E"` | `0x437710` (`4,421,392`) | `extracted/v0.2.9_1.1_cspx4_ui.bin` (`4,421,392` B) | `extracted/v0.2.9_1.1_cspx4_mcu.bin` (`22,844` B) | `SP=0x20001408`, `Reset=0x08000241` |
| `v0.2.9_3.1_cspx4.lcd` | `4,161,192` bytes | `0x01F7` / `"DT"` | `0x3F256C` (`4,138,348`) | `extracted/v0.2.9_3.1_cspx4_ui.bin` (`4,138,348` B) | `extracted/v0.2.9_3.1_cspx4_mcu.bin` (`22,844` B) | `SP=0x20001408`, `Reset=0x08000241` |

---

## 2. Chronological Lineage (`v0.2.5_0.5` → `v0.3.0_0.7` → `v0.3.0_0.8` → `v0.2.9_1.1` → `v0.2.9_3.1`)

`v0.2.9_1.1_cspx4.lcd` is the **exact transitional release** between `v0.3.0_0.8.lcd` and `v0.2.9_3.1_cspx4.lcd`, confirming that **`v0.2.9_3.1_cspx4.lcd` is the newest firmware overall**:

| Order | Firmware File | MCU Build Date & Size | UI Version String | Key Milestone / Delta |
| :--- | :--- | :--- | :--- | :--- |
| **1 (Oldest)** | `v0.2.5_0.5.lcd` | `"May 13 2025"` (`20,720` B) | `"_0.5"` (`0x397B4E`) | Baseline: `85°C` ceiling, `60 min` (`1h`) Auto Dry, `AHT30` only (`0x38`), no UART telemetry. |
| **2** | `v0.3.0_0.7.lcd` | `"Mar  2 2026"` (`20,736` B) | `"_0.5"` (`0x397FCC`) | Adds `90°C` ceiling, UART telemetry, lid debounce, `480 min` (`8h`) Auto Dry selector + `L+R` page; introduces language-switch UI lag. |
| **3** | `v0.3.0_0.8.lcd` | `"Mar  6 2026"` (`20,736` B) | `"_0.5"` (`0x397FC0`) | `-12` B UI fix: removes `page page4` from `m1`/`m2` (`0x32F675`) and moves it to `0x32ED4E` to fix post-language-switch lag. |
| **4** | `v0.2.9_1.1_cspx4.lcd` | `"Jun  1 2026"` (`22,844` B) | **`"_1.1"`** (`0x3980F5`) | **Transitional release:** Introduces the new `22,844`-byte MCU binary (`AHT30` + `NSHT30` dual sensor auto-detect), retains the `v0.3.0_0.8` 34-page/214-pic UI (`+312` B) while adding `<5%` low-humidity clamping (`0x3210D6`, `0x3225AD`, `0x3281F3`), the `<` glyph in Font 2 (`0x10028`), error dialog text height fix (`55,70,212,80` → `55,70,212,60` at `0x389BE0`), and UI version `"_1.1"`. |
| **5 (Latest)** | **`v0.2.9_3.1_cspx4.lcd`** | `"Jun  1 2026"` (`22,844` B) | **`"_3.1"`** (`0x35184B`) | **Latest release:** Identical MCU binary (`0` bytes diff vs. `v0.2.9_1.1`), paired with a major UI overhaul (`-283,044` B): global subroutine refactoring (`0x310E90..0x3131E4`), **35 pages** (`My Drying` & `Auto Dehum` split), **218 pictures**, single-chamber Left/Right Auto Dry `480 min` (`8h`) fix (`0x34295D`, `0x343D7E`), updated `DT` (`0x01F7`) header with embedded MCU size/CRC, and UI version **`"_3.1"`**. |

---

## 3. `v0.2.9_1.1_cspx4.lcd` & `v0.2.9_3.1_cspx4.lcd` vs. `v0.3.0_0.8.lcd` Delta Analysis

Despite the `v0.2.9` MCU major/minor numbering in the filename, `v0.2.9_3.1_cspx4.lcd` carries a **newer compilation date (`"Jun  1 2026"` vs. `"Mar  6 2026"`)**, a **newer HMI UI version (`_3.1` vs. `_0.8`)**, and an **expanded MCU binary (`22,844` bytes vs. `20,736` bytes, `+2,108` bytes)**.

### A. Microcontroller (MCU) Binary (`20,736` B → `22,844` B, `+2,108` bytes)
1. **Dual I2C Humidity/Temperature Sensor Auto-Detection (`AHT30` + `NSHT30`):**
   - Adds runtime I2C hardware probing and driver routines (`0x08004D60 .. 0x08005670`) to support both the **Aosong `AHT30`** (I2C address `0x38`) and the **Novosense `NSHT30`** / SHT30-compatible sensor (I2C address `0x44`, `MOVS R1, #0x44` at `0x08004D6C`).
   - Adds diagnostic boot output at `0x08004DB0`: `"Sensor's type is %s\r\n"` with string literals `"AHT30"` (`0x0800565C`), `"NSHT30"` (`0x08005664`), and `"UNKNOWN"` (`0x0800566C`).
   - Expands initial stack pointer (`SP`) from `0x20001350` to `0x20001408` (`+184` bytes SRAM) to accommodate the dual sensor state buffers.
2. **Retains All `v0.3.0` Core Upgrades:**
   - Retains the `90°C` (`194°F`) maximum temperature limit, 8-hour hybrid timer, cover-opening debounce filter, and the real-time UART telemetry stream (`L_Tar`, `R_Tar`, `L_PTC`, `R_PTC`, `L_NTC`, `R_NTC`, `L_AHT`, `R_AHT`).

### B. HMI Display / UI Partition (`4,421,080` B → `4,138,348` B, `-282,732` bytes)
1. **Global Shared Subroutine Refactoring (`-282 KB` Bytecode Reduction):**
   - In `v0.3.0_0.7` / `v0.3.0_0.8`, a ~`7.5 KB` shared helper block (temperature unit conversion `*18+320` / `*100-3200/18` and state logic) was duplicated inside all 34 pages (`34 × 7.5 KB ≈ 255 KB`).
   - In `v0.2.9_3.1_cspx4`, this shared logic was factored into a single global subroutine block at `0x310E90 .. 0x3131E4` (referenced via section header `0x310020 = 0x70A`), shrinking every UI page by ~`7.5 KB` and reducing total `.lcd` size by `280 KB`.
2. **Low-Humidity `<5%` Display Clamping (`0x31C4D6`, `0x31D9C9`, `0x322B5F`):**
   - Adds a `< 5%` RH check (`if RH < 5 -> "=<5"`) on the chamber humidity readouts so readings below 5% display `"<5"` instead of raw single-digit values.
3. **35 Pages (vs. 34 in `v0.3.0_0.8`) & 218 Pictures (vs. 214 in `v0.3.0_0.8`):**
   - Adds 4 UI button/frame graphics (`Pic 214` `142×36`, `Pic 215` `142×36`, `Pic 216` `296×35`, `Pic 217` `296×44`; picture table moves to `0x054A31`).
   - Splits **"My Drying"** (`Page 33` at `0x375AF3`) and **"Auto Dehum"** (`Page 34` at `0x378A9D`) into dedicated pages, and updates the embedded UI version suffix at `0x35184B` from `"_0.5"` to **`"_3.1"`**.
4. **Auto Drying Duration Limit (`480` min = `8h` vs. `48H`) & Single-Chamber Bug Fix:**
   - **Standard Drying (`Page 6`, `Page 7`, `Page 11`):** Capped at **`48H`** (`+="1~48"` at `0x328EE4`/`0x32B3BE`, `,48,3,` / `=48` at `0x329483`/`0x329760`, `,48,5,` / `=48` at `0x32C05A`/`0x32EF0A`) across all 4 firmwares.
   - **Auto Drying (`Page 14` & `Page 15`):** Stored in **minutes** and capped at **`480` minutes (`8h`, NOT `48h`)** (`"10min"`..`"50min"`, `"1h"`..`"8h"`, `=8*60`, `,480,2,` → `+=60` at `0x340B65`, `,480,5,` → `=480` at `0x340CAD`–`0x340CC2`).
   - **Bug Fix vs. `v0.3.0_0.8`:** In `v0.3.0_0.7` and `v0.3.0_0.8`, when Creality raised the Auto Drying limit from `60` minutes (`1h`) to `480` minutes (`8h`), they updated the selector (`0x35CAC4`) and the dual `L+R` Auto Drying page (`0x360D18`), **but left the single-chamber Left (`0x3566FB`) and Right (`0x3591A9`) Auto Drying pages stuck at `,60,5,` (`60` min) without hour formatting**. In `v0.2.9_3.1_cspx4`, both the Left (`0x34295D`) and Right (`0x343D7E`) Auto Drying pages are updated to `,480,5,` (`480` min = `8h`) with full `,60,2,` (`+="min"`) and `,60,3,` (`/60`, `+="h"`) formatting (`0x342A73..0x342C61` and `0x343E94..0x344082`).

---

## 2. `v0.3.0_0.7` vs. `v0.3.0_0.8` Delta Analysis

### A. Microcontroller (MCU) Binary (`20,736` bytes)
- **Total Modified Bytes:** `1` byte (out of `20,736` bytes — **99.995% identical**).
- **Exact Modification:**
  - Offset `0x42E9` (`Flash 0x080042E9`): `0x32` (`'2'`) → `0x36` (`'6'`).
  - Changes the embedded compilation date string at `0x080042E4` from `"Mar  2 2026"` to `"Mar  6 2026"`.
  - **Zero instructions, registers, constants, or safety routines changed.**

### B. HMI Display / UI Partition (`4,421,092` B → `4,421,080` B, `-12` bytes)
- **Official Engineer Release Note:** *"It fixes the performance lag issue that occurred after switching languages in the previous version."*
- **Picture & Font Asset Region (`0x000190 .. 0x310000`):** `0` bytes changed (all 214 pictures, including `Pic 81` at `0x22B70B`, and all fonts are 100% identical).
- **Root-Cause & UI Bytecode Fix (`0x32ED4E .. 0x32F6DA`):**
  1. **Removed (`-24` bytes):** Removed the two `page page4` (`08 00 00 00 09 0B 04 70 61 67 65 34`, 12 bytes each) instructions from the `up` (touch-release) handlers of **Component 13 (`m1`, `63,55,60,133` at `0x32F675`)** and **Component 14 (`m2`, `216,55,60,133` at `0x32F6DA`)**, setting their `up` event pointers at `0x41BAC8` and `0x41BBB0` to `0xFFFFFFFF`. Notably, `m1` and `m2` cross-trigger `click 1, click 2, click 3, click 14` and `click 13` on `down`, and `page4` disables them via `tsw m1,0` / `tsw m2,0` whenever `sys_lang != 1` (non-Chinese languages).
  2. **Added (`+12` bytes):** Moved `page page4` (`08 00 00 00 09 0B 04 70 61 67 65 34`, 12 bytes) directly into the language/state transition `up` handler of **Component 6 (`0x32ED4E`)**, immediately after `var_0x0304 = var_0x0021; var_0x00A8 = 0;`.
  3. **Pointer Relocations:** All subsequent bytecode jump targets (`L \x03<offset>`) after `0x32F6DA` shifted by `-12` bytes (`-0x0C`) to account for the net `-12`-byte size reduction.

---

## 3. Verified String & Telemetry Signatures (`0x08000000` Base)

| Flash Address (`v0.2.5`) | MCU Offset (`v0.2.5`) | Flash Address (`v0.3.0`) | MCU Offset (`v0.3.0`) | String Literal | Category | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `0x08000B3B` | `0x0B3B` | `0x08000B0B` | `0x0B0B` | `"%s probably missed detect"` | Diagnostic | Sensor / peripheral detection warning |
| `0x0800221B` | `0x221B` | `0x080021E7` | `0x21E7` | `"L_Box:The temperature of the NTC is too high"` | Thermal Safety | Left chamber NTC thermal cutoff |
| `0x0800224C` | `0x224C` | `0x08002218` | `0x2218` | `"R_Box:The temperature of the NTC is too high"` | Thermal Safety | Right chamber NTC thermal cutoff |
| — | — | `0x08002760` | `0x2760` | `"L_Tar:%dC, R_Tar:%dC, "` | UART Telemetry | **New in v0.3.0:** Target temp telemetry |
| — | — | `0x0800277C` | `0x277C` | `"L_PTC:%d, R_PTC:%d, "` | UART Telemetry | **New in v0.3.0:** PTC heater state telemetry |
| — | — | `0x0800279C` | `0x279C` | `"L_NTC:%d.%dC, R_NTC:%d.%dC, "` | UART Telemetry | **New in v0.3.0:** NTC thermistor telemetry |
| — | — | `0x080027C0` | `0x27C0` | `"L_AHT:%d.%dC, %d.%d%%RH, "` | UART Telemetry | **New in v0.3.0:** Left AHT temp/RH telemetry |
| — | — | `0x080027DC` | `0x27DC` | `"R_AHT:%d.%dC, %d.%d%%RH"` | UART Telemetry | **New in v0.3.0:** Right AHT temp/RH telemetry |
| `0x08002784` | `0x2784` | `0x080027F8` | `0x27F8` | `"L_Box: PTC fault! Stop heating"` | Thermal Safety | Left chamber PTC runaway protection |
| `0x080027A8` | `0x27A8` | `0x0800281C` | `0x281C` | `"R_Box: PTC fault! Stop heating"` | Thermal Safety | Right chamber PTC runaway protection |
| `0x080027CC` | `0x27CC` | `0x08002840` | `0x2840` | `"L_Box: detected an artificial opening of the cover."` | Interlock Safety | Left chamber lid interlock |
| `0x08002804` | `0x2804` | `0x08002878` | `0x2878` | `"R_Box: detected an artificial opening of the cover."` | Interlock Safety | Right chamber lid interlock |
| `0x080042B4` | `0x42B4` | `0x080042E4` | `0x42E4` | `"May 13 2025"` → `"Mar  2 2026"` | Build Metadata | Build timestamp |
| `0x080042C4` | `0x42C4` | `0x080042F0` | `0x42F0` | `"Software version: V%d.%d.%d, Date:%s"` | Build Metadata | Version banner format string |


---

## 9. Custom Firmware `A3.0.0_cspx4.lcd` (95°C Max Temp + Native 320×240 Splash + Boot Disclaimer)

- **Output Binary:** `firmware/A3.0.0_cspx4.lcd` (`4,161,192` bytes)
- **Base Firmware:** `firmware/v0.2.9_3.1_cspx4.lcd` (`4,161,192` bytes, MCU `"Jun  1 2026"` + UI `"_3.1"`)
- **Build Script:** `scripts/build_A3.0.0.js`

### 9.1 Exact Binary Patch Table

| Subsystem | `.lcd` Offset | Partition Offset | Original Bytes | Patched Bytes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UI Max Temp (`var_0x0020`)** | `0x310054` | `ui.bin+0x310054` | `5A 00 00 00` (`90`) | `5F 00 00 00` (`95`) | Master UI ceiling (`95°C` / dynamically computes `203°F` via `(95*18+320)/10 = 203` in `sub 0/1`); updates all keypad prompts (`"45~95"` / `"113~203"`), `OK` clamping, `+` buttons, Manual, Auto, and My Drying screens |
| **MCU Max Temp (`MOVS R5, #95`)** | `0x3F3E4A` | `mcu.bin+0x18DE` | `5A 25` (`MOVS R5, #90`) | `5F 25` (`MOVS R5, #95`) | MCU target temperature clamping value in `0x080058D4` loop |
| **MCU Max Temp (`CMP R2, #95`)** | `0x3F3E60` | `mcu.bin+0x18F4` | `5A 2A` (`CMP R2, #90`) | `5F 2A` (`CMP R2, #95`) | MCU target temperature upper-bound check (`95°C`); all thermal error checks (`[E01L/R]`, `[E02L/R]`, `[E03L/R]`, `[E04L/R]`) remain active and track dynamically relative to `Target_Temp` |
| **MCU Version Tuple** | `0x3F6F2C` | `mcu.bin+0x49C0` | `00 02 09 00` (`0.2.9`) | `03 00 00 00` (`3.0.0`) | Reported via UART cmd `0x03` and boot banner |
| **MCU Version Prefix** | `0x3F6F4E` | `mcu.bin+0x49E2` | `56` (`'V'`) | `41` (`'A'`) | Changes UART banner to `"Software version: A3.0.0, Date:Jun  1 2026\r\n"` |
| **UI Version Prefix (`sub 6`)** | `0x312BDD` | `ui.bin+0x312BDD` | `56` (`'V'`) | `41` (`'A'`) | Formats `str_0x00a2` as `"A" + major + "." + minor + "." + patch` (`"A3.0.0"`) |
| **UI About Initial Version** | `0x3517D3` | `ui.bin+0x3517D3` | `00 00 00 00 00 00 00` | `41 33 2E 30 2E 30 00` | Sets `Page 19` (`str_0x288d`) default string to `"A3.0.0"` |
| **UI About Version Suffix** | `0x351852` | `ui.bin+0x351852` | `5F 33 2E 31` (`"_3.1"`) | `00 00 00 00` (`""`) | Clears `str_0x2945` suffix so `str_0x00a2 + str_0x2945` displays `"A3.0.0"` |
| **Boot Disclaimer (`Pic 65..80`)** | `0x1CA086..0x222D79` | `ui.bin+0x1CA086` | 16 animation frames | 16 RLE disclaimer frames | Displays `"SPACEPI X4 CUSTOM FIRMWARE A3.0.0"`, `"MAX TEMPERATURE LIMIT: 95C / 203F"`, and `"ALPHA FIRMWARE: NO WARRANTY, EXPRESS OR IMPLIED"` |
| **Native 1×1 Splash (`Pic 81`)** | `0x222D79..0x22D113` | `ui.bin+0x222D79` | `20,840` B (`900` blks) | `41,882` B (`1,902` blks) | Full native `320×240` (`1×1` pixel, 16-bit RGB565) custom splash + `"ALPHA FIRMWARE: NO WARRANTY, EXPRESS OR IMPLIED"` banner |
| **Container Checksums** | `0x08`, `0xC4`, `0x18C`, `0x3F2568` | Header & UI Footer | `e04812ff`, `28aa5b32`, `35f9333a`, `2a48bfca` | `cdb98d14`, `97b4b463`, `35f9333a`, `296987be` | Recomputed `nextion_crc_bytes` across MCU, Header 1, Header 2, and UI Master partition |
