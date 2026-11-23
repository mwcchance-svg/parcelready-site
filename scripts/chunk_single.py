#!/usr/bin/env python3
"""Split the single-file Edge Function into paste chunks of at most
9,000 bytes at line boundaries (Anvil's proven dashboard paste size),
plus a manifest with the assembly check figures."""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_path = os.path.join(ROOT, "supabase", "dist", "parcelready-store.single.ts")
data = open(src_path, "rb").read()
lines = data.splitlines(keepends=True)
chunks, cur = [], b""
for piece in lines:
    if len(cur) + len(piece) > 9000 and cur:
        chunks.append(cur)
        cur = b""
    cur += piece
if cur:
    chunks.append(cur)
outdir = os.path.join(ROOT, "supabase", "dist", "chunks")
os.makedirs(outdir, exist_ok=True)
for old in os.listdir(outdir):
    os.remove(os.path.join(outdir, old))
for i, c in enumerate(chunks, 1):
    open(os.path.join(outdir, f"chunk-{i:02d}.txt"), "wb").write(c)
manifest = [
    f"ParcelReady store function paste chunks: {len(chunks)} chunks, {len(data)} bytes total.",
    "Paste chunk-01 into the empty editor file, then APPEND each next chunk in order at the end.",
    "Assembly check: the joined file is exactly "
    f"{len(data)} bytes and its last line is: {lines[-1].decode().strip() if lines else ''}",
] + [f"chunk-{i:02d}.txt: {len(c)} bytes" for i, c in enumerate(chunks, 1)]
open(os.path.join(outdir, "MANIFEST.txt"), "w").write("\n".join(manifest) + "\n")
print("\n".join(manifest))
