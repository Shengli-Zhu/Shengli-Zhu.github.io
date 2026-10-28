import os
import re
import shutil
import subprocess
from html.parser import HTMLParser
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'


def build():
    subprocess.run(['bundle', 'exec', 'jekyll', 'build', '--quiet'], cwd=ROOT, env={**os.environ, 'JEKYLL_ENV': 'production'}, check=True)


@pytest.fixture(scope='module', autouse=True)
def site():
    build()
    yield


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def parse(rel):
    p = Links()
    p.feed((SITE / rel).read_text())
    return p.tags


def text(rel):
    return (SITE / rel).read_text()


def test_footer_icons():
    links = [a for t, a in parse('index.html') if t == 'a' and 'contact-link' in a.get('class', '')]
    assert [a['href'] for a in links] == [
        'mailto:shengli.zhu@kaust.edu.sa',
        'https://scholar.google.com/citations?user=sEmk9uMAAAAJ',
        'https://orcid.org/0000-0002-2845-910X',
        'https://www.researchgate.net/profile/Shengli-Zhu-2',
        'https://www.linkedin.com/in/shengli-zhu-699822302',
        'https://x.com/Shengli_Zhu',
    ]
    assert all(a.get('aria-label') and a.get('data-tip') for a in links)
    assert links[0]['data-tip'] == 'shengli.zhu@kaust.edu.sa' and links[-1]['data-tip'] == '@Shengli_Zhu'
    assert 'target' not in links[0] and all(a.get('target') == '_blank' for a in links[1:])


def test_only_the_two_site_fonts():
    css = (SITE / 'assets' / 'css' / 'site.css').read_text()
    assert re.search(r'--display:\s*"Big Shoulders Display"', css) and re.search(r'--text:\s*"Schibsted Grotesk"', css)
    assert set(re.findall(r'font-family\s*:\s*([^;}]+)', css)) <= {'var(--display)', 'var(--text)'}
    loaded = set()
    for p in SITE.rglob('*.html'):
        html = p.read_text()
        loaded |= set(re.findall(r'family=([A-Za-z+]+)', ' '.join(re.findall(r'fonts\.googleapis\.com/css2\?[^"]+', html))))
        assert 'font-family' not in html, p
    assert loaded == {'Big+Shoulders+Display', 'Schibsted+Grotesk'}


def test_home_sections():
    html = text('index.html')
    order = [html.index(f'id="{h}"') for h in ('about-h', 'news-h', 'pubs-h', 'digest-h', 'writing-h')]
    assert order == sorted(order)
    assert '朱胜利' in html and 'Victor' in html
    about = html[html.index('id="about-h"'):html.index('id="news-h"')]
    assert about.count('<li>') >= 6 + 3
    data = ROOT / '_data'
    news = html[html.index('id="news-h"'):html.index('id="pubs-h"')]
    assert news.count('class="row"') == len(yaml.safe_load((data / 'news.yml').read_text()))
    pubs = html[html.index('id="pubs-h"'):html.index('id="digest-h"')]
    assert pubs.count('class="row"') == sum(1 for p in yaml.safe_load((data / 'publications.yml').read_text()) if p.get('selected'))
    digest = html[html.index('id="digest-h"'):html.index('id="writing-h"')]
    assert digest.count('class="row"') <= 5
    assert 'Reading note' not in html
    assert 'Reading Notes' not in html


def test_publications_page():
    html = text('publications/index.html')
    n = len(yaml.safe_load((ROOT / '_data' / 'publications.yml').read_text()))
    assert html.count('class="row"') == n
    assert html.count('<span class="me">Shengli Zhu</span>') == n
    for doi in ('10.1007/s00382-024-07237-8', '10.1016/j.uclim.2023.101683', '10.4209/aaqr.220393'):
        assert f'https://doi.org/{doi}' in html


POSTS = ['2023/06/blog-post-1', '2023/06/blog-post-2', '2023/06/blog-post-3', '2023/06/blog-post-4', '2023/07/blog-post-5',
         '2024/05/blog-post-6', '2025/05/blog-post-7', '2025/05/blog-post-8', '2026/04/blog-post-9']


def test_blog_permalinks():
    for slug in POSTS:
        assert (SITE / 'blogs' / slug / 'index.html').exists(), slug
    blog = text('blog/index.html')
    assert all(f'/blogs/{s}/' in blog for s in POSTS)


def test_blog_images_small():
    for slug in POSTS:
        for t, a in parse(f'blogs/{slug}/index.html'):
            if t == 'img':
                assert a.get('width') and a.get('height'), (slug, a)
                assert a.get('loading') == 'lazy' or a.get('class') == 'cover-img', (slug, a)
                f = SITE / a['src'].lstrip('/')
                assert f.exists() and f.stat().st_size <= 600 * 1024, f
    assert not any('images/b-photo' in p.read_text() for p in SITE.rglob('*.html'))


def test_legacy_urls():
    for rel, target in [('about/index.html', '/'), ('year-archive/index.html', '/blog/'), ('resume/index.html', '/cv/')]:
        assert (SITE / rel).exists(), rel
        assert target in text(rel)
    cv = re.search(r'href="(/files/[^"]+\.pdf)"', text('cv/index.html')).group(1)
    assert (SITE / cv.lstrip('/')).exists(), cv
    assert (SITE / '404.html').exists()


def test_reading_notes_hidden_when_empty():
    nav_hrefs = [a['href'] for t, a in parse('blog/index.html') if t == 'a' and a.get('href', '').startswith('/') and 'nav' not in a.get('class', '')]
    assert '/reading-notes/' not in nav_hrefs


def test_reading_notes_shown_with_note():
    note = ROOT / '_reading_notes' / 'test-sample-note.md'
    shutil.copy(ROOT / 'tests' / 'fixtures' / 'sample_note.md', note)
    try:
        build()
        nav_hrefs = [a['href'] for t, a in parse('blog/index.html') if t == 'a']
        assert '/reading-notes/' in nav_hrefs
        assert (SITE / 'reading-notes' / 'test-sample-note' / 'index.html').exists()
        assert 'Reading note' in text('index.html')
    finally:
        note.unlink()
        build()


HYDRAW_KEYS = ('authors', 'year', 'title', 'journal', 'doi', 'figure', 'license', 'license_url')


def hydraw_entries():
    import yaml
    out = []
    for f in sorted((ROOT / '_hydraw').glob('*.md')):
        meta = yaml.safe_load(f.read_text().split('---')[1])
        out.append((f.stem, meta))
    return out


def test_hydraw_entries_cite_license_and_code():
    import yaml
    types = yaml.safe_load((ROOT / '_data' / 'hydraw_types.yml').read_text())
    entries = hydraw_entries()
    assert entries
    for slug, meta in entries:
        src = meta['source']
        assert all(src.get(k) for k in HYDRAW_KEYS), (slug, [k for k in HYDRAW_KEYS if not src.get(k)])
        assert meta['figure_type'] in types, slug
        assert (ROOT / meta['image'].lstrip('/')).exists() and (ROOT / meta['recreation'].lstrip('/')).exists(), slug
        code = (ROOT / '_hydraw' / 'code' / meta['code']).read_text()
        assert '{{' not in code and '{%' not in code, slug
        page = text(f'hydraw/{slug}/index.html')
        assert f'https://doi.org/{src["doi"]}' in page and src['license_url'] in page, slug
        assert 'language-python' in page and 'savefig' in page, slug
        assert (SITE / 'hydraw' / 'code' / meta['code']).read_text() == code, slug
    listing = text('hydraw/index.html')
    assert all(f'/hydraw/{slug}/' in listing for slug, _ in entries)
    nav = [a['href'] for t, a in parse('blog/index.html') if t == 'a']
    assert nav.index('/hydro-digest/') < nav.index('/hydraw/') < nav.index('/blog/')


def test_hydro_digest_topic_pages():
    import json
    import sys
    sys.path.insert(0, str(ROOT / 'tools' / 'hydro_digest'))
    from rules import TOPICS
    topics = sorted((yaml.safe_load(p.read_text().split('---')[1]) | {'slug': p.stem} for p in (ROOT / '_digest_topics').glob('*.md')), key=lambda t: t['order'])
    assert [t['title'] for t in topics] == list(TOPICS)
    papers = json.loads((ROOT / '_data' / 'hydro_digest.json').read_text())['papers']
    landing = [a['href'] for t, a in parse('hydro-digest/index.html') if t == 'a' and a.get('class') == 'topic-link']
    assert landing == [f"/hydro-digest/{t['slug']}/" for t in topics]
    for t in topics:
        html = text(f"hydro-digest/{t['slug']}/index.html")
        assert html.count('<li class="row"') == sum(t['title'] in p['topics'] for p in papers), t['title']
        buttons = [a for tag, a in parse(f"hydro-digest/{t['slug']}/index.html") if tag == 'a' and a.get('class') == 'topic-btn']
        assert len(buttons) == len(topics) and [a.get('aria-current') for a in buttons].count('page') == 1
        assert 'href="/hydro-digest/"' in html.split('band-title', 1)[1].split('</header>')[0]
    latest = text('hydro-digest/index.html').split('id="latest-h"')[1]
    days = sorted({p['date'] for p in papers}, reverse=True)[:3]
    assert latest.count('class="latest-day"') == len(days)
    assert latest.count('<li class="row"') == sum(p['date'] in days for p in papers)
