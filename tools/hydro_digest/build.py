import argparse
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from rules import TOPICS, classify

HERE = Path(__file__).resolve().parent
USER_AGENT = 'hydro-digest (https://shengli-zhu.github.io/hydro-digest/)'
SNIPPET_CHARS = 320
ABSTRACT_CHARS = 2400
MAX_AUTHORS = 3


class FetchError(Exception):
    pass


def clean_text(s):
    s = re.sub(r'<[^>]+>', '', s or '')
    s = html.unescape(html.unescape(s))
    return re.sub(r'\s+', ' ', s).strip()


def abstract_text(abstract):
    return re.sub(r'^(abstract|summary)\b[\s.:]*', '', clean_text(abstract), flags=re.I)


def snippet(abstract, limit=SNIPPET_CHARS):
    text = abstract_text(abstract)
    if not text:
        return ''
    out = ''
    for sentence in re.split(r'(?<=[.!?])\s+', text):
        candidate = f'{out} {sentence}'.strip()
        if len(candidate) > limit:
            break
        out = candidate
    if not out:
        out = text[:limit - 1].rsplit(' ', 1)[0] + '…'
    return out


def pub_date(item):
    # Some publishers give only the issue month; the DOI registration date stands in for the day.
    for key in ('published-online', 'published', 'issued', 'created'):
        parts = (item.get(key) or {}).get('date-parts') or [[]]
        if parts[0] and len(parts[0]) == 3:
            return date(*parts[0])
    return None


def record(item, journal, today, days):
    d = pub_date(item)
    if d is None or d > today or d < today - timedelta(days=days):
        return None
    title = clean_text(' '.join(item.get('title') or []))
    abstract = clean_text(item.get('abstract'))
    topics = classify(title, abstract, journal, item.get('DOI'))
    if not title or not topics:
        return None
    people = [clean_text(f"{a.get('given', '')} {a.get('family', '')}") or clean_text(a.get('name')) for a in item.get('author') or []]
    people = [p for p in people if p]
    short, full = snippet(abstract), abstract_text(abstract)
    if len(full) > ABSTRACT_CHARS:
        full = full[:ABSTRACT_CHARS - 1].rsplit(' ', 1)[0] + '…'
    return {'doi': item['DOI'], 'url': f"https://doi.org/{item['DOI']}", 'title': title,
            'authors': people[:MAX_AUTHORS], 'more_authors': len(people) > MAX_AUTHORS,
            'journal': journal, 'date': d.isoformat(), 'topics': topics, 'snippet': short,
            'abstract': full if len(full) > len(short) else ''}


def crossref_fetch(issns, start, end):
    items, cursor = [], '*'
    while cursor:
        q = urllib.parse.urlencode({
            'filter': ','.join(f'issn:{i}' for i in issns) + f',from-pub-date:{start},until-pub-date:{end},type:journal-article',
            'select': 'DOI,title,abstract,author,published,published-online,issued,created',
            'rows': 1000, 'cursor': cursor})
        req = urllib.request.Request(f'https://api.crossref.org/works?{q}', headers={'User-Agent': USER_AGENT})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    msg = json.load(r)['message']
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(3 * (attempt + 1))
        items += msg['items']
        cursor = msg.get('next-cursor') if msg['items'] else None
    return items


def collect(journals, today, days, fetch=crossref_fetch):
    start = today - timedelta(days=days)
    papers, seen, failed = [], set(), []
    for j in journals:
        try:
            items = fetch(j['issns'], start, today)
        except Exception as e:
            failed.append(j['name'])
            print(f"fetch failed for {j['name']}: {e}", file=sys.stderr)
            continue
        for it in items:
            rec = record(it, j['name'], today, days)
            if rec and rec['doi'] not in seen:
                seen.add(rec['doi'])
                rec['journal_short'] = j.get('short', j['name'])
                papers.append(rec)
    if len(failed) == len(journals):
        raise FetchError('all journals failed')
    papers.sort(key=lambda p: (p['date'], p['journal']), reverse=True)
    return papers


def run(journals, today, days, fetch, fetch_live, snapshot):
    meta = {'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'window_days': days, 'topics': list(TOPICS)}
    try:
        return {**meta, 'source': 'crossref', 'papers': collect(journals, today, days, fetch)}
    except FetchError:
        pass
    try:
        live = fetch_live()
        return {**live, 'source': 'fallback-live'}
    except Exception as e:
        print(f'live fallback failed: {e}', file=sys.stderr)
    try:
        snap = json.loads(Path(snapshot).read_text())
        return {**snap, 'source': 'fallback-snapshot'}
    except Exception as e:
        print(f'snapshot fallback failed: {e}', file=sys.stderr)
    return {**meta, 'source': 'empty', 'papers': []}


def main(argv=None):
    ap = argparse.ArgumentParser(description='Build the Hydro Digest list from Crossref.')
    ap.add_argument('--days', type=int, default=30)
    ap.add_argument('--out', required=True)
    ap.add_argument('--public')
    ap.add_argument('--fallback-url')
    ap.add_argument('--snapshot', default=str(HERE / 'snapshot.json'))
    args = ap.parse_args(argv)
    journals = json.loads((HERE / 'journals.json').read_text())

    def fetch_live():
        if not args.fallback_url:
            raise OSError('no fallback url')
        req = urllib.request.Request(args.fallback_url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)

    payload = run(journals, date.today(), args.days, crossref_fetch, fetch_live, args.snapshot)
    text = json.dumps(payload, ensure_ascii=False, indent=1)
    for path in filter(None, [args.out, args.public]):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(text)
    print(f"hydro digest: {len(payload['papers'])} papers, source={payload['source']}")


if __name__ == '__main__':
    main()
