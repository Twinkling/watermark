"""Check browser exports of format fixtures with Python's standard library.

Select the 作品署名 preset before exporting to keep the sampled corners clear.
Usage: python3 tests/verify-format-exports.py path/to/export.zip expected_count
"""
import importlib.util
import json
import pathlib
import sys
import zipfile

spec = importlib.util.spec_from_file_location(
    "png_check", pathlib.Path(__file__).with_name("verify-exports.py")
)
png_check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(png_check)
results = []
with zipfile.ZipFile(sys.argv[1]) as archive:
    assert archive.testzip() is None
    assert len(archive.namelist()) == int(sys.argv[2])
    for name in archive.namelist():
        width, height, pixel = png_check.read_png(archive.read(name))
        assert (width, height) == ((64, 96) if name.startswith("orientation") else (96, 64))
        if name.startswith("transparent"):
            assert pixel(8, 8)[3] == 0
        elif name.startswith("orientation"):
            assert pixel(8, 8) == (40, 80, 220, 255)
            assert pixel(55, 8) == (230, 40, 40, 255)
        elif name.startswith(("colors", "multipage")):
            assert pixel(8, 8)[0] > 180 and pixel(8, 8)[3] == 255
        results.append({"file": name, "size": [width, height]})
print(json.dumps({"passed": True, "exports": results}, ensure_ascii=False))
