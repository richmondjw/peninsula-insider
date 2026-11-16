"""Narrow copy edits in published PDFs, preserving their existing embedded glyphs.

Requires PyMuPDF and pypdf. Reads the baseline from Git, never regenerates from
drifted print-page sources. Only matched BT/ET text objects are rewritten; all
images, page geometry, fonts, links and other content streams remain untouched.
"""
import io
import json
import re
import statistics
import subprocess
from pathlib import Path

import fitz
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
BASE = 'd4563409f5ef72fb147fc4b3f1d691d4644d888d'
REPLACEMENTS = [
    ('Eight pages · Six venues · One sample weekend', 'Seasonal picks · A sample weekend'),
    ('Eight pages · Six venues · One four-day plan', 'Seasonal picks · A four-day plan'),
    ('This guide is six venues', 'This guide covers venues'),
    ('This long-weekend guide is six venues', 'This long-weekend guide covers venues'),
    ('Six venues, sequenced', 'The picks, sequenced'),
    ('Six venues we\'d commit', 'Some venues we\'d commit'),
    ('The six', 'The shortlist'),
    ('one of the six is the second', 'choose the second here'),
    ('one of the six.', 'a shortlist pick.'),
    ('one of the six. Two-and-a-half', 'a shortlist pick. Two-and-a-half'),
    ('across five pillars:', 'across our pillars:'),
    ('across five', 'across our'),
    ('Two products carry the brand.', 'The products carry the brand.'),
    ('Three rules ', 'The rules '),
    ('Six ways ', 'Some ways '),
    ('Three placements, ', 'The placements, '),
    ('Three rules hold the line.', 'The rules hold the line.'),
    ('Six ways to partner with us.', 'Selected ways to partner with us.'),
    ('and two products coming later', 'and products coming later'),
    ('Two further products', 'The further products'),
    ('Three placements, simple and', 'The placements, simple and'),
    ('Fifty venues across', 'Featured venues across'),
]

def cmap(font):
    raw = font['/ToUnicode'].get_object().get_data().decode('ascii')
    result = {}
    for block in re.findall(r'beginbfchar(.*?)endbfchar', raw, re.S):
        for code, value in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            result[int(code, 16)] = bytes.fromhex(value).decode('utf-16-be')
    for block in re.findall(r'beginbfrange(.*?)endbfrange', raw, re.S):
        for start, end, value in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            for code in range(int(start, 16), int(end, 16) + 1):
                result[code] = chr(int(value, 16) + code - int(start, 16))
    return result

TOKENS = re.compile(rb'/(F\d+)\s+([\d.]+)\s+Tf|<([0-9A-Fa-f]+)>\s*Tj')
receipts = []
for target in sorted((ROOT / 'next/public/downloads').glob('*.pdf')):
    relative = target.relative_to(ROOT).as_posix()
    original = subprocess.check_output(['git', 'show', f'{BASE}:{relative}'], cwd=ROOT)
    reader = PdfReader(io.BytesIO(original))
    document = fitz.open(stream=original, filetype='pdf')
    changes = []
    processed = set()
    for number, page in enumerate(document):
        groups = {}
        for font_xref, ext, kind, family, name, encoding, referencer in page.get_fonts(full=True):
            groups.setdefault(referencer, {})[name] = reader.get_object(font_xref)
        for referencer, fonts in groups.items():
            stream_refs = [referencer] if referencer else page.get_contents()
            stream_refs = [xref for xref in stream_refs if xref not in processed]
            processed.update(stream_refs)
            maps = {name: cmap(font) for name, font in fonts.items()}
            def replace_object(match):
                obj = match.group(0)
                text, used, glyphs = '', [], []
                font_name, size = None, None
                for token in TOKENS.finditer(obj):
                    if token[1]:
                        font_name, size = token[1].decode(), float(token[2])
                        if font_name not in used: used.append(font_name)
                    else:
                        value = token[3].decode()
                        # Embedded Type3 strings may contain several glyph bytes.
                        if fonts[font_name].get('/Subtype') != '/Type3': return obj
                        for offset in range(0, len(value), 2):
                            code = int(value[offset:offset + 2], 16)
                            char = maps[font_name].get(code)
                            if char is None: return obj
                            text += char
                            glyphs.append((char, font_name, size, code))
                replacement = text
                for before, after in REPLACEMENTS:
                    replacement = replacement.replace(before, after)
                if replacement == text:
                    matrix = re.search(rb'([-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+)\s+Tm', obj)
                    if matrix:
                        values = [float(x) for x in matrix[1].split()]
                        for end_x, y, delta in shifts:
                            if abs(values[5] - y) < .01 and abs(values[4] - end_x) < 2:
                                values[4] += delta
                                obj = obj[:matrix.start(1)] + ' '.join(f'{v:.6f}' for v in values).encode() + obj[matrix.end(1):]
                                changes.append({'page': number + 1, 'before': text, 'after': text, 'shiftX': delta})
                                break
                    return obj
                matrix = re.search(rb'([-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+)\s+Tm', obj)
                assert matrix and len(re.findall(rb'\bTm\b', obj)) == 1 and len({g[2] for g in glyphs}) == 1, text
                size = glyphs[0][2]
                reverse = {name: {char: code for code, char in maps[name].items()} for name in used}
                def width(name, code):
                    font = fonts[name]
                    return float(font['/Widths'][code - int(font['/FirstChar'])]) * size / 1000
                # Preserve the original tracking, excluding kerning outliers.
                advances = [float(x) for x in re.findall(rb'([-\d.]+)\s+0\s+Td', obj)]
                tracking = statistics.median([advance - width(g[1], g[3]) for advance, g in zip(advances, glyphs)]) if len(advances) == len(glyphs) - 1 else 0
                lines = [b'BT', matrix[1] + b' Tm']
                index = 0
                new_width = 0
                while index < len(replacement):
                    choices = [(len(char), name, char, code) for name in used for char, code in reverse[name].items() if replacement.startswith(char, index)]
                    assert choices, (target.name, text, replacement[index:])
                    _, preferred, char, code = max(choices, key=lambda item: (item[0], -used.index(item[1])))
                    lines += [f'/{preferred} {size:g} Tf'.encode(), f'<{code:02X}> Tj'.encode()]
                    new_width += width(preferred, code) + tracking
                    index += len(char)
                    if index < len(replacement):
                        lines.append(f'{width(preferred, code) + tracking:.6f} 0 Td'.encode())
                new_width -= tracking
                values = [float(x) for x in matrix[1].split()]
                old_width = sum(advances) + width(glyphs[-1][1], glyphs[-1][3])
                shifts.append((values[4] + old_width, values[5], new_width - old_width))
                lines.append(b'ET')
                changes.append({'page': number + 1, 'before': text, 'after': replacement})
                return b'\n'.join(lines)
            for xref in stream_refs:
                stream = document.xref_stream(xref)
                shifts = []
                updated = re.sub(rb'\bBT\b.*?\bET\b', replace_object, stream, flags=re.S)
                if updated != stream: document.update_stream(xref, updated)
    assert changes, target.name
    document.save(target, deflate=True)
    receipts.append({'file': target.name, 'baseline': BASE, 'changes': changes})
out = ROOT / 'ops/records/count-free-pdf-copy.json'
out.write_text(json.dumps(receipts, indent=2) + '\n', encoding='utf-8')
print(json.dumps(receipts, indent=2))
