import re
import os
import glob

src_dir = r'C:/Users/James/.openclaw/workspace/peninsula-insider/next/src'

# Match: href="/path" where path is non-empty, not already trailing-slashed,
# not an anchor, not external, not an asset
pattern = re.compile(
    r'(href=")(/(?![/#])[a-zA-Z0-9][a-zA-Z0-9/_.-]*)("(?:\s|>|class|aria))'
)

def needs_slash(path):
    skip_prefixes = ['/_', '/assets', '/images', '/favicon']
    if path == '/':
        return False
    if path.endswith('/'):
        return False
    for s in skip_prefixes:
        if path.startswith(s):
            return False
    return True

files = glob.glob(src_dir + '/**/*.astro', recursive=True)
total_changes = 0
files_changed = []

for fpath in sorted(files):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    local_changes = [0]

    def replacer(m):
        href_start, path, href_end = m.group(1), m.group(2), m.group(3)
        if needs_slash(path):
            local_changes[0] += 1
            return '{}{}/{}'.format(href_start, path, href_end)
        return m.group(0)

    new_content = pattern.sub(replacer, content)

    if local_changes[0] > 0:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        rel = os.path.relpath(fpath, src_dir)
        files_changed.append((rel, local_changes[0]))
        total_changes += local_changes[0]

print('Total replacements: {} across {} files'.format(total_changes, len(files_changed)))
print()
for rel, n in files_changed:
    print('  {:3d}  {}'.format(n, rel))
