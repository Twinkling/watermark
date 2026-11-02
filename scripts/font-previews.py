"""Regenerate tiny online font-card samples from the checked-in full fonts.

Requires fonttools[woff]==4.60.1. Normal builds use the checked-in results.
"""
import hashlib
import json
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent / "vendor" / "fonts"


def main():
    manifest = json.loads((ROOT / "manifest.json").read_text())
    for entry in manifest["fonts"]:
        source = ROOT / entry["file"]
        assert hashlib.sha256(source.read_bytes()).hexdigest() == entry["sha256"]
        font = TTFont(source, recalcTimestamp=False)
        options = subset.Options()
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.name_legacy = True
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(text=entry["sample"])
        subsetter.subset(font)
        # All modified samples get new internal names, including fonts with RFNs.
        family = "LiuyinPreview-" + entry["id"].removeprefix("art_")
        for record in font["name"].names:
            if record.nameID in [1, 3, 4, 6, 16, 18, 21, 25]:
                record.string = family.encode(record.getEncoding())
        font.flavor = "woff2"
        filename = entry["id"].removeprefix("art_") + ".preview.woff2"
        font.save(ROOT / filename)
        data = (ROOT / filename).read_bytes()
        entry["preview"] = {
            "file": filename,
            "sourceSha256": entry["sha256"],
            "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data),
            "family": family,
            "text": entry["sample"],
        }
        print(entry["name"], entry["bytes"], "->", len(data))
    (ROOT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
