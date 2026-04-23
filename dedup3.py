#!/usr/bin/env python3
"""Deduplicate globals.css keeping only the LAST complete definition group per class.

For each primary class that appears in multiple definition groups:
1. Find all definition groups (contiguous blocks with same primary class)
2. Among groups that contain a BASE definition (non-.dark scoped), keep the last such group
3. If no group has a base def, keep the absolute last group
4. Remove all other groups for that class

Also deduplicates @keyframes, @media, @property, @layer by their name/query.
"""

import re

SRC = '/home/z/my-project/src/app/globals.css'

def _pc(selector):
    """Extract primary class name, skipping .dark/.light scope."""
    if not selector: return None
    classes = re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', selector)
    if not classes: return None
    if classes[0] in ('dark', 'light'):
        return classes[1] if len(classes) > 1 else None
    return classes[0]

def _norm(s):
    return re.sub(r'\s+', ' ', s).strip()

def main():
    with open(SRC) as f:
        text = f.read()
    lines = text.split('\n')
    orig_len = len(lines)
    print(f"Input: {orig_len} lines")

    # ── 1. Parse into blocks ──
    blocks = []
    n = len(lines)
    p = 0
    while p < n:
        s = lines[p].strip()
        if s == '':
            q = p
            while q < n and lines[q].strip() == '': q += 1
            blocks.append({'type': 'blank', 'i0': p, 'i1': q-1, 'sel': None, 'pc': None})
            p = q; continue
        if s.startswith('/*'):
            q = p
            while q < n and '*/' not in lines[q]: q += 1
            if q < n: q += 1
            blocks.append({'type': 'comment', 'i0': p, 'i1': q-1, 'sel': None, 'pc': None})
            p = q; continue
        if re.match(r'^@(import|custom-variant|tailwind)\b', s):
            blocks.append({'type': 'directive', 'i0': p, 'i1': p, 'sel': s, 'pc': None})
            p += 1; continue
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
            dk = _norm(sel_raw)
            btype = 'atrule' if is_at else 'rule'
            blocks.append({'type': btype, 'i0': p, 'i1': q, 'sel': sel_raw, 'pc': pc, 'dk': dk})
            p = q + 1; continue
        blocks.append({'type': 'other', 'i0': p, 'i1': p, 'sel': s, 'pc': _pc(s), 'dk': _norm(s) if s else None})
        p += 1

    print(f"Parsed {len(blocks)} blocks")

    # ── 2. Identify definition groups ──
    #    A definition group is a maximal contiguous sequence of blocks where:
    #    - Rule blocks share the same primary_class (pc)
    #    - Blanks and comments between them are included
    #    - For atrules: each block is its own "group" (keyed by dk)

    # Collect indices per dedup key
    # For class rules: key = pc value
    # For atrules: key = ('@', dk)
    pc_indices = {}   # pc -> [block_indices with this pc]
    dk_indices = {}   # dk -> [block_indices with this dk]

    for i, b in enumerate(blocks):
        if b['pc']:
            pc_indices.setdefault(b['pc'], []).append(i)
        elif b['type'] == 'atrule' and b.get('dk'):
            dk_indices.setdefault(b['dk'], []).append(i)

    # For each pc, split indices into contiguous clusters (allowing blank/comment gaps)
    def get_clusters(indices):
        """Split sorted indices into contiguous clusters (gap = only blank/comment)."""
        if not indices:
            return []
        clusters = [[indices[0]]]
        for idx in indices[1:]:
            prev_idx = clusters[-1][-1]
            # Check gap
            gap_ok = all(blocks[j]['type'] in ('blank', 'comment')
                        for j in range(prev_idx + 1, idx))
            if gap_ok:
                clusters[-1].append(idx)
            else:
                clusters.append([idx])
        return clusters

    # ── 3. For each pc with multiple clusters, decide which to keep ──
    remove_set = set()
    stats = {}

    for pc, indices in pc_indices.items():
        clusters = get_clusters(indices)
        if len(clusters) <= 1:
            continue  # unique, keep all

        stats[pc] = len(clusters)

        # Check which clusters have a BASE definition
        # (a block whose sel starts with .{pc} without .dark prefix)
        def has_base(cluster_indices):
            return any(
                blocks[i]['sel'] and
                blocks[i]['sel'].strip().startswith(f'.{pc}') and
                not blocks[i]['sel'].strip().startswith('.dark') and
                not blocks[i]['sel'].strip().startswith('.light')
                for i in cluster_indices
                if blocks[i].get('sel')
            )

        # Find last cluster with base def
        last_base_cluster = None
        last_base_idx = -1
        for ci, cluster in enumerate(clusters):
            if has_base(cluster):
                last_base_cluster = ci
                last_base_idx = cluster[0]

        # Keep the last cluster with a base definition (if exists)
        # Otherwise keep the absolute last cluster
        if last_base_cluster is not None:
            keep_cluster = last_base_cluster
        else:
            keep_cluster = len(clusters) - 1

        # Remove all other clusters
        for ci, cluster in enumerate(clusters):
            if ci != keep_cluster:
                for idx in cluster:
                    remove_set.add(idx)

    # ── 4. Deduplicate atrules by dk ──
    for dk, indices in dk_indices.items():
        if len(indices) > 1:
            for idx in indices[:-1]:
                remove_set.add(idx)
            stats[('@', dk)] = len(indices)

    # ── 5. Remove orphaned blank/comment blocks ──
    final_remove = set(remove_set)
    for i in range(len(blocks)):
        if i in final_remove or blocks[i]['type'] not in ('blank', 'comment'):
            continue
        # Check if nearest non-blank/comment before and after are both removed
        prev_r = next_r = True  # default if nothing found
        for j in range(i - 1, -1, -1):
            if blocks[j]['type'] not in ('blank', 'comment'):
                prev_r = j in final_remove
                break
        for j in range(i + 1, len(blocks)):
            if blocks[j]['type'] not in ('blank', 'comment'):
                next_r = j in final_remove
                break
        if prev_r and next_r:
            final_remove.add(i)

    # Print stats
    print(f"Found {len(stats)} identifiers with multiple definitions")
    print(f"Removing {len(final_remove)} blocks")
    top = sorted(stats.items(), key=lambda x: -x[1])[:15]
    print("\nTop duplicated:")
    for k, v in top:
        label = str(k)[:65]
        print(f"  [{v}x] {label}")

    # ── 6. Rebuild ──
    new_blocks = [b for i, b in enumerate(blocks) if i not in final_remove]
    # Collapse blanks
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


if __name__ == '__main__':
    main()
