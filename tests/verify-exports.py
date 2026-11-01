"""Verify synthetic fixture exports using only Python's standard library."""
import struct
import sys
import zipfile
import zlib
import json

def read_png(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    offset, compressed = 8, bytearray()
    while offset < len(data):
        size, kind = struct.unpack('>I4s', data[offset:offset+8])
        chunk = data[offset+8:offset+8+size]
        if kind == b'IHDR':
            width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', chunk)
        if kind == b'IDAT':
            compressed.extend(chunk)
        offset += size + 12
    assert depth == 8 and color in (2, 6) and interlace == 0
    channels = 4 if color == 6 else 3
    raw, rows, previous = zlib.decompress(compressed), [], bytearray(width*channels)
    stride = width*channels
    for y in range(height):
        kind = raw[y*(stride+1)]
        row = bytearray(raw[y*(stride+1)+1:(y+1)*(stride+1)])
        for x in range(stride):
            a = row[x-channels] if x >= channels else 0
            b = previous[x]
            c = previous[x-channels] if x >= channels else 0
            if kind == 1: predictor = a
            elif kind == 2: predictor = b
            elif kind == 3: predictor = (a+b)//2
            elif kind == 4:
                p = a+b-c
                pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                predictor = a if pa <= pb and pa <= pc else b if pb <= pc else c
            else:
                assert kind == 0
                predictor = 0
            row[x] = (row[x]+predictor) & 255
        rows.append(row)
        previous = row
    def pixel(x, y):
        rgba = tuple(rows[y][x*channels:x*channels+channels])
        return rgba if channels == 4 else rgba+(255,)
    return width, height, pixel

if __name__ == '__main__':
    if sys.argv[1].endswith('.zip'):
        result = []
        with zipfile.ZipFile(sys.argv[1]) as archive:
            assert archive.testzip() is None
            assert len(archive.namelist()) == 2
            for name in archive.namelist():
                width, height, pixel = read_png(archive.read(name))
                if name.startswith('横版'):
                    assert (width, height) == (1200, 800)
                    quadrants = [0, 0, 0, 0]
                    for y in range(0, height, 3):
                        for x in range(0, width, 3):
                            if pixel(x,y) != (240,245,233,255):
                                quadrants[(y >= height//2)*2+(x >= width//2)] += 1
                    assert all(value > 100 for value in quadrants), quadrants
                    result.append({'file':name,'size':[width,height],'watermark_pixels_per_quadrant':quadrants})
                else:
                    assert (width, height) == (640, 960)
                    transparent = sum(pixel(x,y)[3] == 0 for y in range(0,height,3) for x in range(0,width//2,3))
                    marked = sum(0 < pixel(x,y)[3] < 255 for y in range(0,height,3) for x in range(0,width//2,3))
                    assert transparent > 5000 and marked > 100
                    result.append({'file':name,'size':[width,height],'transparent_samples':transparent,'watermark_samples':marked})
        print(json.dumps({'passed':True,'exports':result},ensure_ascii=False))
    else:
        with open(sys.argv[1], 'rb') as source:
            width,height,pixel=read_png(source.read())
        assert (width,height)==(640,960)
        assert pixel(0,0)==(255,255,255,255),pixel(0,0)
        print(json.dumps({'passed':True,'jpeg_white_background':pixel(0,0),'size':[width,height]}))
