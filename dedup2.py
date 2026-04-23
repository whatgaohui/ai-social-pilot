#!/usr/bin/env python3
"""Deduplicate globals.css: for each class/at-rule defined multiple times,
keep only the LAST definition group and remove all earlier ones."""

import re
import sys

SRC = '/home/z/my-project/src/app/globals.css'

def main():
    with open(SRC) as f:
        text = f.read()
    lines = text.split('\n')
    orig_len = len(lines)
    print(f"Input: {orig_len} lines")

    # ── 1. Parse into blocks ──
    blocks = []  # list of {'type','i0','i1','sel','pc'}
    n = len(lines)
    p = 0
    while p < n:
        s = lines[p].strip()

        # blank run
        if s == '':
            q = p
            while q < n and lines[q].strip() == '': q += 1
            blocks.append({'type':'blank','i0':p,'i1':q-1,'sel':None,'pc':None})
            p = q; continue

        # comment
        if s.startswith('/*'):
            q = p
            while q < n and '*/' not in lines[q]: q += 1
            if q < n: q += 1
            blocks.append({'type':'comment','i0':p,'i1':q-1,'sel':None,'pc':None})
            p = q; continue

        # single-line directive
        if re.match(r'^@(import|custom-variant|tailwind)\b', s):
            blocks.append({'type':'directive','i0':p,'i1':p,'sel':s,'pc':None})
            p += 1; continue

        # brace-delimited block (@theme, @keyframes, @layer, @media, @property, or rule)
        if '{' in s or re.match(r'^@', s):
            q = p
            depth = 0
            while q < n:
                depth += lines[q].count('{') - lines[q].count('}')
                if depth <= 0: break
                q += 1
            sel_raw = s.split('{')[0].strip() if '{' in s else s
            is_at = bool(re.match(r'^@', sel_raw))
            pc = None if is_at else _pc(sel_raw)
            dk = _norm(sel_raw)  # dedup key: full normalised selector / at-rule header
            btype = 'atrule' if is_at else 'rule'
            blocks.append({'type':btype,'i0':p,'i1':q,'sel':sel_raw,'pc':pc,'dk':dk})
            p = q + 1; continue

        # fallback
        blocks.append({'type':'other','i0':p,'i1':p,'sel':s,'pc':_pc(s),'dk':_norm(s) if s else None})
        p += 1

    print(f"Parsed {len(blocks)} blocks")

    # ── 2. Assign a dedup-group key to every rule/atrule block ──
    #    For class rules: key = ('C', primary_class)
    #    For at-rules:    key = ('A', normalised_selector)
    for b in blocks:
        b['gk'] = None
        if b['type'] == 'rule' and b['pc']:
            b['gk'] = ('C', b['pc'])
        elif b['type'] == 'atrule' and b.get('dk'):
            b['gk'] = ('A', b['dk'])

    # ── 3. Find "definition groups": contiguous runs sharing the same gk
    #    (allowing comment/blank gaps between same-gk blocks)
    #    We walk forward; whenever we see a block with a gk that already
    #    has a recorded group, check if it's adjacent (only blanks/comments
    #    between). If so, extend the existing group; otherwise start a new one.
    #    But simpler: just collect all indices per gk, then for each gk
    #    identify the LAST contiguous cluster.

    gk_indices = {}  # gk -> [list of block indices]
    for i, b in enumerate(blocks):
        gk = b.get('gk')
        if gk is not None:
            gk_indices.setdefault(gk, []).append(i)

    # For each gk with multiple indices, find the LAST contiguous cluster.
    # A cluster = indices where consecutive ones differ by <= gap_max
    # (gap includes only blank/comment blocks).
    def last_cluster(indices):
        """Given sorted indices, return the last contiguous cluster."""
        if not indices:
            return []
        # Work backwards from the last index
        cluster = [indices[-1]]
        for idx in reversed(indices[:-1]):
            # Check if all blocks between idx and cluster[0] are blank/comment
            gap_ok = True
            for j in range(idx + 1, cluster[0]):
                if blocks[j]['type'] not in ('blank', 'comment'):
                    gap_ok = False
                    break
            if gap_ok:
                cluster.append(idx)
            else:
                break
        cluster.reverse()
        return cluster

    keep_indices = set()  # Block indices to KEEP (from last clusters)
    remove_indices = set()  # Block indices to REMOVE

    dup_count = 0
    for gk, indices in sorted(gk_indices.items(), key=lambda x: -len(x[1])):
        if len(indices) <= 1:
            # Unique – always keep
            keep_indices.update(indices)
            continue

        dup_count += 1
        lc = last_cluster(indices)

        # Keep the last cluster
        keep_indices.update(lc)

        # Also keep any blank/comment blocks that are BETWEEN kept blocks
        # (they serve as separators)

        # Remove earlier clusters
        all_set = set(indices)
        for idx in indices:
            if idx not in set(lc):
                remove_indices.add(idx)

    # Don't remove blocks that have no gk (comments, blanks, directives, etc.)
    # Also don't remove standalone blocks
    final_remove = set()
    for idx in remove_indices:
        b = blocks[idx]
        if b.get('gk') is not None:
            final_remove.add(idx)

    # Also remove blank/comment blocks that are SURROUNDED by removed blocks
    # (orphaned whitespace)
    for i in range(len(blocks)):
        if i in final_remove:
            continue
        b = blocks[i]
        if b['type'] in ('blank', 'comment'):
            # Check if the nearest non-blank/comment blocks before and after
            # are both removed
            prev_removed = False
            next_removed = False
            for j in range(i-1, -1, -1):
                if blocks[j]['type'] not in ('blank', 'comment'):
                    prev_removed = j in final_remove
                    break
            for j in range(i+1, len(blocks)):
                if blocks[j]['type'] not in ('blank', 'comment'):
                    next_removed = j in final_remove
                    break
            if prev_removed and next_removed:
                final_remove.add(i)

    # Print stats
    print(f"Found {dup_count} identifiers with multiple definition groups")
    print(f"Removing {len(final_remove)} blocks")

    # Show top dups
    top_dups = sorted(gk_indices.items(), key=lambda x: -len(x[1]))[:15]
    print("\nTop duplicated identifiers:")
    for gk, idxs in top_dups:
        label = gk[1][:65]
        print(f"  [{len(idxs)}x] {gk[0]}: {label}")

    # ── 4. Rebuild ──
    new_blocks = [b for i, b in enumerate(blocks) if i not in final_remove]

    # Collapse consecutive blanks to at most 1
    collapsed = []
    bc = 0
    for b in new_blocks:
        if b['type'] == 'blank':
            bc += 1
            if bc <= 1: collapsed.append(b)
        else:
            bc = 0
            collapsed.append(b)
    while collapsed and collapsed[0]['type'] == 'blank': collapsed.pop(0)
    while collapsed and collapsed[-1]['type'] == 'blank': collapsed.pop()

    out_lines = []
    for b in collapsed:
        out_lines.extend(lines[b['i0']:b['i1']+1])

    out_text = '\n'.join(out_lines).rstrip('\n') + '\n'

    new_len = out_text.count('\n')
    saved = orig_len - new_len
    pct = saved / orig_len * 100
    print(f"\nResult: {new_len} lines (saved {saved}, {pct:.1f}%)")

    with open(SRC, 'w') as f:
        f.write(out_text)
    print(f"Written to {SRC}")


def _pc(selector):
    """Extract primary class name, skipping .dark/.light scope prefixes."""
    if not selector: return None
    classes = re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', selector)
    if not classes: return None
    if classes[0] in ('dark','light'):
        return classes[1] if len(classes) > 1 else None
    return classes[0]

def _norm(s):
    return re.sub(r'\s+',' ',s).strip()

if __name__ == '__main__':
    main()
