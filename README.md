# Creality SpacePi X4 Firmware Reverse Engineering Initiative

An open-source reverse engineering and analysis framework for the Creality SpacePi X4 multi-chamber filament dryer (`DB-05` hardware platform).

## Quick Start
1. Place firmware files (`v0.2.5_0.5.lcd` and `v0.3.0_0.7.lcd`) into `firmware/`.
2. Run extraction and binary diffing:
   ```bash
   make all
   ```
3. Explore extracted partitions in `extracted/`.

## Key Findings (v0.2.5 vs. v0.3.0)
- **Temperature Ceiling:** Increased maximum setpoint limit from 85°C to 90°C.
- **Timer Engine:** Redesigned from minutes-only increments to a hybrid hour/minute system supporting up to 480 minutes (8 hours).
- **Telemetry Stream:** Added real-time UART output streams for chamber target temperatures, PTC duty cycles, NTC thermistor values, and AHT sensor relative humidity.
- **Cover Interlock Filtering:** Added false-positive cover detection filtering to prevent vibration-induced heating pauses.

## Repository Structure
- `docs/` — Architectural documentation, binary memory maps, and LLM operational guidelines:
  - [`MEMORY_BANK.md`](docs/MEMORY_BANK.md): Project status, primary discoveries, and open questions.
  - [`BINARY_MAP.md`](docs/BINARY_MAP.md): Container header (`CT2E`), checksums, HMI picture table (`0a600103` RLE), and ARM Cortex-M flash/RAM layout.
  - [`EXTRACTION_REPORT.md`](docs/EXTRACTION_REPORT.md): Full partition table and string/telemetry comparison report.
  - [`LLM_PROMPT_BOOK.md`](docs/LLM_PROMPT_BOOK.md): Operational guidelines for AI-assisted firmware analysis.
- `scripts/` — Python 3 analysis, extraction, and patching utilities:
  - [`extract.py`](scripts/extract.py): Unpacks `.lcd` firmware containers into UI and MCU partitions.
  - [`diff_mcu.py`](scripts/diff_mcu.py): Performs binary region diffing across MCU payloads.
  - [`patch_splash.py`](scripts/patch_splash.py): Encodes and patches custom `320x240` boot splash screens (`Pic 81`) and verifies `CT2E` CRC-32 checksums.
- `firmware/` — Directory for target `.lcd` firmware images (ignored by Git).
- `extracted/` — Output directory for carved partitions, CSV exports, and decoded splash previews.
