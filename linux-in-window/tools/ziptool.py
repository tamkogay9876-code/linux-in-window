#!/usr/bin/env python3
"""Tiny zip helper used by @liw/core archives (no external deps).
Usage:
  ziptool.py create <archive.zip> <src_dir>
  ziptool.py extract <archive.zip> <dest_dir>
"""
import sys, os, zipfile

def create(archive, src):
    if os.path.exists(archive):
        os.remove(archive)
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(src):
            dirs.sort(); files.sort()
            for f in sorted(files):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, src)
                zf.write(full, rel)

def extract(archive, dest):
    os.makedirs(dest, exist_ok=True)
    with zipfile.ZipFile(archive) as zf:
        # path-traversal guard
        for name in zf.namelist():
            target = os.path.realpath(os.path.join(dest, name))
            if not target.startswith(os.path.realpath(dest) + os.sep) and target != os.path.realpath(dest):
                raise SystemExit(f"unsafe path in archive: {name}")
        zf.extractall(dest)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    cmd, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
    if cmd == "create": create(a, b)
    elif cmd == "extract": extract(a, b)
    else: raise SystemExit("unknown command")
