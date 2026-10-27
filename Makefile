.PHONY: all extract diff clean

all: extract diff

extract:
	python3 scripts/extract.py firmware/v0.2.5_0.5.lcd
	python3 scripts/extract.py firmware/v0.3.0_0.7.lcd

diff:
	python3 scripts/diff_mcu.py firmware/v0.2.5_0.5.lcd firmware/v0.3.0_0.7.lcd

clean:
	rm -rf extracted/*.bin
