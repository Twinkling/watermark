"""Optional font refresh; build uses checked-in files and never downloads fonts.
Run with Python + fonttools[woff]==4.60.1. Full glyph sets are retained.
"""
import hashlib
import io
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent / 'vendor' / 'fonts'
REV = 'e7db6ca603fd4862010383ff17ffd6cc4ffac1c0'
FONTS = [
    ('mashanzheng', 'MaShanZheng-Regular.ttf', '马善政毛笔', 'Ma Shan Zheng', '中文 · 毛笔', '留住美好时光'),
    ('longcang', 'LongCang-Regular.ttf', '龙藏手写', 'Long Cang', '中文 · 行草', '留住美好时光'),
    ('zcoolkuaile', 'ZCOOLKuaiLe-Regular.ttf', '站酷快乐体', 'ZCOOL KuaiLe', '中文 · 活泼', '留住美好时光'),
    ('zhimangxing', 'ZhiMangXing-Regular.ttf', '志莽行书', 'Zhi Mang Xing', '中文 · 行书', '留住美好时光'),
    ('liujianmaocao', 'LiuJianMaoCao-Regular.ttf', '刘建毛草', 'Liu Jian Mao Cao', '中文 · 草书', '留住美好时光'),
    ('lxgwwenkaitc', 'LXGWWenKaiTC-Regular.ttf', '霞鹜文楷 TC', 'LXGW WenKai TC', '中文 · 手写楷书', '留住美好时光'),
    ('dancingscript', 'DancingScript[wght].ttf', 'Dancing Script', 'Dancing Script', '英文 · 连笔', 'Beautiful Moments'),
    ('greatvibes', 'GreatVibes-Regular.ttf', 'Great Vibes', 'Great Vibes', '英文 · 花体', 'Beautiful Moments'),
    ('caveat', 'Caveat[wght].ttf', 'Caveat', 'Caveat', '英文 · 手写', 'Beautiful Moments'),
    ('allura', 'Allura-Regular.ttf', 'Allura', 'Allura', '英文 · 书法', 'Beautiful Moments'),
    ('sacramento', 'Sacramento-Regular.ttf', 'Sacramento', 'Sacramento', '英文 · 签名字体', 'Beautiful Moments'),
    ('kalam', 'Kalam-Regular.ttf', 'Kalam', 'Kalam', '英文 · 手写', 'Beautiful Moments'),
]

def digest(b):
    return hashlib.sha256(b).hexdigest()

def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    previous = json.loads((ROOT / 'manifest.json').read_text())['fonts'] if (ROOT / 'manifest.json').exists() else []
    records = []
    for slug, filename, name, family, category, sample in FONTS:
        base = f'https://raw.githubusercontent.com/google/fonts/{REV}/ofl/{slug}/'
        cached = next((f for f in previous if f['id'] == 'art_' + slug and f['source'] == base + quote(filename)), None)
        if cached and digest((ROOT / cached['file']).read_bytes()) == cached['sha256']:
            records.append(cached)
            print(name, 'verified local cache', flush=True)
            continue
        data = urlopen(base + quote(filename)).read()
        license_data = urlopen(base + 'OFL.txt').read()
        assert 'SIL OPEN FONT LICENSE Version 1.1' in license_data.decode()
        # Keep fonts with reserved names byte-for-byte.
        ext = 'ttf' if slug in ['dancingscript', 'sacramento'] else 'woff2'
        font = TTFont(io.BytesIO(data), recalcTimestamp=False)
        cmap = font.getBestCmap()
        assert all(ord(c) in cmap for c in sample if not c.isspace())
        packed = data
        if ext == 'woff2':
            font.flavor = 'woff2'
            output = io.BytesIO()
            font.save(output)
            packed = output.getvalue()
        target = slug + '.' + ext
        (ROOT / target).write_bytes(packed)
        (ROOT / (slug + '.OFL.txt')).write_bytes(license_data)
        records.append(dict(id='art_' + slug, name=name, family=family, category=category, sample=sample,
                            file=target, license=slug + '.OFL.txt', source=base + quote(filename),
                            licenseUrl=base + 'OFL.txt', sourceSha256=digest(data), sha256=digest(packed),
                            bytes=len(packed), glyphs=len(cmap), variable='fvar' in font))
        print(name, len(data), '->', len(packed), flush=True)
    (ROOT / 'manifest.json').write_text(json.dumps(dict(revision=REV, fonts=records), ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
