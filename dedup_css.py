#!/usr/bin/env python3
"""
Safely deduplicate globals.css.

Strategy: 
1. Parse CSS into blocks
2. Identify "definition groups" - contiguous sequences of blocks sharing the 
   same primary class (plus interleaved comments/blanks)
3. For each primary class that has multiple definition groups, keep only the 
   LAST group and remove all earlier groups

This correctly handles:
- Base class definitions (.glass-card) and their dark variants (.dark .glass-card)
- Class variants like .class > *, .class:hover, .class::after
- @keyframes, @media blocks (deduplicated by their name/query)
- Comments and blank lines between related rules
"""

import re
from collections import defaultdict

INPUT_FILE = '/home/z/my-project/src/app/globals.css'
OUTPUT_FILE = '/home/z/my-project/src/app/globals.css'

SCOPE_PREFIXES = {'dark', 'light'}


def extract_primary_class(selector):
    """
    Extract the primary class name from a CSS selector, skipping scope prefixes.
    Returns None for pseudo-element/pseudo-class-only selectors.
    """
    if not selector:
        return None
    stripped = selector.strip()
    
    # Pure scope selector
    if re.match(r'^\.(' + '|'.join(SCOPE_PREFIXES) + r')(\s|$)', stripped):
        return None
    
    classes = re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', stripped)
    if not classes:
        return None
    
    # Skip scope prefix
    if classes[0] in SCOPE_PREFIXES:
        return classes[1] if len(classes) > 1 else None
    
    return classes[0]


def normalize(s):
    return re.sub(r'\s+', ' ', s).strip()


def parse_blocks(content):
    """Parse CSS content into blocks."""
    lines = content.split('\n')
    blocks = []
    i = 0

    while i < len(lines):
        stripped = lines[i].strip()

        if stripped == '':
            bs = i
            while i < len(lines) and lines[i].strip() == '':
                i += 1
            blocks.append({'type': 'blank', 'start': bs, 'end': i-1,
                           'content': '\n'.join(lines[bs:i]),
                           'selector': None, 'primary_class': None, 'dedup_key': None})
            continue

        if stripped.startswith('/*'):
            cs = i
            cl = [lines[i]]
            if '*/' not in stripped:
                i += 1
                while i < len(lines):
                    cl.append(lines[i])
                    if '*/' in lines[i]:
                        i += 1
                        break
                    i += 1
            else:
                i += 1
            blocks.append({'type': 'comment', 'start': cs, 'end': i-1,
                           'content': '\n'.join(cl),
                           'selector': None, 'primary_class': None, 'dedup_key': None})
            continue

        if re.match(r'^@(import|custom-variant|tailwind)\b', stripped):
            blocks.append({'type': 'directive', 'start': i, 'end': i,
                           'content': lines[i], 'selector': stripped,
                           'primary_class': None, 'dedup_key': None})
            i += 1
            continue

        if re.match(r'^@(theme|keyframes|layer|media|property)\b', stripped):
            bs = i
            bl = [lines[i]]
            bd = stripped.count('{') - stripped.count('}')
            i += 1
            while i < len(lines) and bd > 0:
                bl.append(lines[i])
                bd += lines[i].count('{') - lines[i].count('}')
                i += 1
            sel = stripped.split('{')[0].strip()
            rt = re.match(r'^@(\w+)', sel).group(1)
            blocks.append({'type': f'at-{rt}', 'start': bs, 'end': i-1,
                           'content': '\n'.join(bl), 'selector': sel,
                           'primary_class': None, 'dedup_key': normalize(sel)})
            continue

        if '{' in stripped:
            bs = i
            bl = [lines[i]]
            bd = stripped.count('{') - stripped.count('}')
            i += 1
            while i < len(lines) and bd > 0:
                bl.append(lines[i])
                bd += lines[i].count('{') - lines[i].count('}')
                i += 1
            sel = stripped.split('{')[0].strip()
            pc = extract_primary_class(sel)
            blocks.append({'type': 'rule', 'start': bs, 'end': i-1,
                           'content': '\n'.join(bl), 'selector': sel,
                           'primary_class': pc, 'dedup_key': normalize(sel)})
            continue

        blocks.append({'type': 'standalone', 'start': i, 'end': i,
                       'content': lines[i], 'selector': stripped,
                       'primary_class': extract_primary_class(stripped),
                       'dedup_key': normalize(stripped) if stripped else None})
        i += 1

    return blocks


def find_definition_groups(blocks):
    """
    Group consecutive blocks by their primary class.
    A group is a maximal contiguous run of blocks where:
    - Each block either has the same primary_class, or is a comment/blank
    - At least one block in the group has the primary_class
    
    Returns: dict mapping primary_class -> list of (start_idx, end_idx) group tuples
    """
    # For at-rule blocks (keyframes, media, property), group by dedup_key
    groups = defaultdict(list)
    
    i = 0
    while i < len(blocks):
        b = blocks[i]
        
        # For at-rule blocks with dedup_key, each is its own "group"
        if b['type'].startswith('at-') and b['dedup_key']:
            groups[('atrule', b['dedup_key'])].append((i, i))
            i += 1
            continue
        
        # For rules with a primary class, find the contiguous group
        if b.get('primary_class'):
            pc = b['primary_class']
            group_start = i
            group_end = i
            
            # Walk forward: include subsequent blocks with same primary class,
            # comments, or blanks
            j = i + 1
            while j < len(blocks):
                bj = blocks[j]
                if bj.get('primary_class') == pc:
                    group_end = j
                    j += 1
                elif bj['type'] in ('comment', 'blank'):
                    # Only include comment/blank if followed by more of the same class
                    k = j + 1
                    while k < len(blocks) and blocks[k]['type'] in ('comment', 'blank'):
                        k += 1
                    if k < len(blocks) and blocks[k].get('primary_class') == pc:
                        group_end = k
                        j = k + 1
                    else:
                        break
                else:
                    break
            
            groups[('class', pc)].append((group_start, group_end))
            i = group_end + 1
            continue
        
        i += 1
    
    return groups


def deduplicate(blocks):
    """Remove earlier definition groups, keeping only the last for each identifier."""
    
    groups = find_definition_groups(blocks)
    
    # Find identifiers with multiple groups
    multi_groups = {k: gs for k, gs in groups.items() if len(gs) > 1}
    
    print(f"Found {len(multi_groups)} identifiers with multiple definition groups")
    
    # Show top ones
    sorted_mg = sorted(multi_groups.items(), key=lambda x: -len(x[1]))[:25]
    print(f"\nTop duplicated identifiers:")
    for key, gs in sorted_mg:
        label = key[1][:70] + ('...' if len(key[1]) > 70 else '')
        print(f"  [{len(gs)} groups] {key[0]}: {label}")
    
    # Mark blocks for removal: for each multi-group identifier,
    # remove all groups except the last
    blocks_to_remove = set()
    total_groups_removed = 0
    
    for key, gs in multi_groups:
        # Keep only the last group
        for item in gs[:-1]:
            if isinstance(item, tuple) and len(item) == 2:
                start, end = item
            else:
                print(f"  WARNING: unexpected group item for {key}: {item} (type={type(item).__name__})")
                continue
            for idx in range(start, end + 1):
                blocks_to_remove.add(idx)
            total_groups_removed += 1
    
    # Also deduplicate at-rule blocks that were stored as individual groups
    # (each at-rule block is its own group of size 1 in find_definition_groups)
    # The multi_groups dict already has them, so we just need to handle them
    # Note: groups are stored as (start, end) tuples
    
    print(f"\nTotal blocks to remove: {len(blocks_to_remove)}")
    print(f"Total definition groups removed: {total_groups_removed}")
    
    new_blocks = [b for i, b in enumerate(blocks) if i not in blocks_to_remove]
    return new_blocks


def collapse_blanks(blocks):
    """Collapse consecutive blank blocks into at most 1."""
    result = []
    blanks = 0
    for b in blocks:
        if b['type'] == 'blank':
            blanks += 1
            if blanks <= 1:
                result.append(b)
        else:
            blanks = 0
            result.append(b)
    while result and result[0]['type'] == 'blank':
        result.pop(0)
    while result and result[-1]['type'] == 'blank':
        result.pop()
    return result


def rebuild(blocks):
    parts = [b['content'] for b in blocks]
    return '\n'.join(parts).rstrip('\n') + '\n'


def main():
    print(f"Reading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r') as f:
        content = f.read()
    
    orig = content.count('\n')
    print(f"Original: {orig} lines\n")
    
    blocks = parse_blocks(content)
    print(f"Parsed {len(blocks)} blocks\n")
    
    deduped = deduplicate(blocks)
    deduped = collapse_blanks(deduped)
    
    new_content = rebuild(deduped)
    new = new_content.count('\n')
    saved = orig - new
    pct = (saved / orig * 100) if orig else 0
    
    print(f"\nResults:")
    print(f"  Before: {orig} lines")
    print(f"  After:  {new} lines")
    print(f"  Saved:  {saved} lines ({pct:.1f}%)")
    
    with open(OUTPUT_FILE, 'w') as f:
        f.write(new_content)
    print(f"\nWritten to {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
