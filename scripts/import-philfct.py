#!/usr/bin/env python3
"""Imports the DOST-FNRI PhilFCT food table into data/foods.ph.json.

  python scripts/import-philfct.py fetch   # download report PDFs into a temp cache (parallel)
  python scripts/import-philfct.py build   # parse the cache and write data/foods.ph.json

Every energy and macro value is copied from a PhilFCT report (per 100 g edible portion); nothing
is invented. Portions are team ESTIMATES from data/portions.estimates.json and are flagged.
Rows whose energy disagrees badly with their macros (kcal vs 4P+9F+4C) go to
data/foods.flagged.json for review instead of the app. Valid report ids are 2963-5013.
"""
import json
import os
import re
import sys
import tempfile
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from multiprocessing import Pool

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(tempfile.gettempdir(), 'vox-philfct')
FIRST, LAST = 2963, 5013
URL = 'https://i.fnri.dost.gov.ph/fct/library/report/{}'
ACCESSED = time.strftime('%Y-%m-%d')

GROUPS = {
    'A': 'grains', 'B': 'roots', 'C': 'legumes', 'D': 'vegetables', 'E': 'fruits', 'F': 'meat',
    'G': 'fish', 'H': 'eggs', 'J': 'milk', 'Q': 'beverages', 'R': 'dishes',
}


def fetch_one(n):
    path = os.path.join(CACHE, f'{n}.pdf')
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return n, True
    for attempt in range(4):
        try:
            data = urllib.request.urlopen(URL.format(n), timeout=60).read()
            with open(path, 'wb') as f:
                f.write(data)
            return n, True
        except Exception:
            time.sleep(1 + attempt)
    return n, False


def fetch():
    os.makedirs(CACHE, exist_ok=True)
    ids = list(range(FIRST, LAST + 1))
    failed = []
    done = 0
    with ThreadPoolExecutor(max_workers=16) as pool:
        for n, ok in pool.map(fetch_one, ids):
            done += 1
            if not ok:
                failed.append(n)
            if done % 200 == 0:
                print(f'fetched {done}/{len(ids)}', flush=True)
    print(f'fetch done, {len(failed)} failed: {failed[:20]}')


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def field(text, label):
    m = re.search(re.escape(label) + r'\s*(?:\(\w+\))?\s*([\d.]+|-)', text)
    return num(m.group(1)) if m else None


def parse_one(n):
    path = os.path.join(CACHE, f'{n}.pdf')
    if not os.path.exists(path) or os.path.getsize(path) < 30_000:
        return None  # missing or an empty placeholder report
    try:
        from pypdf import PdfReader
        text = PdfReader(path).pages[0].extract_text()
    except Exception:
        return None
    fid = re.search(r'Food ID:\s*([A-Z]\d{3})', text)
    name = re.search(r'Food name and Description:\s*(.+)', text)
    if not fid or not name:
        return None
    alt = re.search(r'Alternate/Common name\(s\):\s*(.*)', text)
    kcal = re.search(r'Energy, calculated \(kcal\)\s*([\d.]+)', text)
    if not kcal:
        return None
    return {
        'report': n,
        'id': fid.group(1),
        'name': name.group(1).strip(),
        'alt': (alt.group(1).strip() if alt else ''),
        'kcal': num(kcal.group(1)),
        'protein': field(text, 'Protein'),
        'fat': field(text, 'Total Fat'),
        'carb': field(text, 'Carbohydrate, total'),
        'fiber': field(text, 'Fiber, total dietary'),
    }


def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', s.lower())).strip()


def aliases_for(row):
    out = []
    for piece in re.split(r'/', row['alt']):
        piece = piece.strip()
        if not piece or piece.upper() == 'N/A' or piece.lower().startswith('edible portion'):
            continue
        out.append(norm(piece))
    out.append(norm(row['name']))
    seen = []
    for a in out:
        if a and a not in seen:
            seen.append(a)
    return seen


def estimate_portions(row, rules):
    for rule in rules:
        if re.search(rule['match'], row['name'], re.I) and row['id'][0] in rule.get('groups', row['id'][0]):
            return rule['portions'], rule['default'], rule['note']
    return {'serving': 100}, 'serving', 'default 100 g serving'


def build():
    with open(os.path.join(ROOT, 'data', 'portions.estimates.json'), encoding='utf8') as f:
        rules = json.load(f)
    with open(os.path.join(ROOT, 'data', 'aliases.tl.json'), encoding='utf8') as f:
        curated = json.load(f)
    ids = list(range(FIRST, LAST + 1))
    with Pool(6) as pool:
        parsed = [r for r in pool.map(parse_one, ids, chunksize=20) if r]
    parsed.sort(key=lambda r: r['id'])
    foods, flagged = [], []
    for r in parsed:
        p, f, c = r['protein'], r['fat'], r['carb']
        est = 4 * (p or 0) + 9 * (f or 0) + 4 * (c or 0)
        bad = p is not None and f is not None and c is not None and abs(r['kcal'] - est) > max(45, 0.35 * r['kcal'])
        portions, default_unit, note = estimate_portions(r, rules)
        row = {
            'id': r['id'].lower(),
            'name': r['name'],
            'aliases': aliases_for(r),
            'kcalPer100g': r['kcal'],
            **({'proteinG': p} if p is not None else {}),
            **({'fatG': f} if f is not None else {}),
            **({'carbG': c} if c is not None else {}),
            **({'fiberG': r['fiber']} if r['fiber'] is not None else {}),
            'portions': portions,
            'defaultUnit': default_unit,
            'foodGroup': GROUPS.get(r['id'][0], 'other'),
            'source': f'PhilFCT (DOST-FNRI, Release 1 December 2019), {r["id"]} "{r["name"]}", {URL.format(r["report"])}, accessed {ACCESSED}',
            'portionSource': f'Team estimate: {note}',
            'portionEstimated': True,
        }
        (flagged if bad else foods).append(row)
    # curated Taglish names win over the automatic ones and are removed from every other row
    by_id = {r['id']: r for r in foods}
    missing = []
    for ref, names in curated.items():
        if ref not in by_id:
            missing.append(ref)
            continue
        wanted = {norm(n) for n in names}
        for r in foods:
            if r['id'] != ref:
                r['aliases'] = [a for a in r['aliases'] if a not in wanted]
        by_id[ref]['aliases'] = list(dict.fromkeys([norm(n) for n in names] + by_id[ref]['aliases']))
    # every remaining alias belongs to one row only (the first), so a word never means two foods
    owner = {}
    for r in foods:
        keep = []
        for a in r['aliases']:
            if a not in owner:
                owner[a] = r['id']
                keep.append(a)
        r['aliases'] = keep
    foods = [r for r in foods if r['aliases']]
    with open(os.path.join(ROOT, 'data', 'foods.ph.json'), 'w', encoding='utf8', newline='\n') as f:
        json.dump(foods, f, indent=1, ensure_ascii=False)
        f.write('\n')
    with open(os.path.join(ROOT, 'data', 'foods.flagged.json'), 'w', encoding='utf8', newline='\n') as f:
        json.dump(flagged, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print(f'parsed {len(parsed)}, wrote {len(foods)} foods, flagged {len(flagged)}, '
          f'curated refs missing: {missing}')


if __name__ == '__main__':
    {'fetch': fetch, 'build': build}[sys.argv[1]]()
