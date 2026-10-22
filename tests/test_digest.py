import json
import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools' / 'hydro_digest'))
import build  # noqa: E402
from rules import classify  # noqa: E402

TODAY = date(2026, 10, 21)


def item(title, abstract='', doi='10.1029/2026WR000001', online=(2026, 10, 15), authors=3):
    it = {'DOI': doi, 'title': [title], 'author': [{'given': f'A{i}', 'family': f'B{i}'} for i in range(authors)],
          'published': {'date-parts': [list(online)]}}
    if abstract:
        it['abstract'] = abstract
    return it


def test_rules_exclude_news_and_corrections():
    assert classify('Nepal floods expose funding gaps', 'river flood rainfall', 'Nature', '10.1038/d41586-026-00001-1') == []
    assert classify('Corrigendum to flood paper', 'flood river rainfall', 'Water Resources Research', '10.1029/x') == []
    assert classify('Author Correction: Global river discharge', 'flood river', 'Nature Communications', '10.1038/s41467-x') == []


def test_rules_core_journals_need_one_hydro_term_others_two():
    assert classify('Streamflow response to drought', '', 'Water Resources Research', 'x') != []
    assert classify('Streamflow in a warming world', '', 'Geophysical Research Letters', 'x') == []
    assert classify('Streamflow response to rainfall extremes', '', 'Geophysical Research Letters', 'x') != []


def test_rules_cold_regions_need_water_context():
    assert classify('Permafrost carbon release in Siberia', 'soil carbon microbes permafrost', 'Nature Communications', 'x') == []
    hits = classify('Snowmelt drives runoff in alpine catchments', 'snowmelt runoff river discharge', 'Water Resources Research', 'x')
    assert 'Cold regions' in hits


def test_rules_drop_glacier_ocean_and_tibetan_plateau_papers():
    assert classify('Glacier melt drives runoff in alpine catchments', 'runoff river discharge', 'Water Resources Research', 'x') == []
    assert classify('Streamflow on the Tibetan Plateau', 'runoff river discharge', 'Water Resources Research', 'x') == []
    assert classify('River plumes and coastal rainfall', 'River discharge reaches the ocean. Sea level and rainfall.', 'Water Resources Research', 'x') == []
    kept = classify('Monsoon rainfall and streamflow in river basins', 'Rainfall over land; the Arabian Sea is mentioned once.', 'Water Resources Research', 'x')
    assert kept != [] and 'Hydrological extremes' not in kept


def test_rules_swot_evapotranspiration_and_extremes():
    swot = classify('River discharge from the Surface Water and Ocean Topography (SWOT) mission', 'SWOT river discharge', 'Water Resources Research', 'x')
    assert 'Hydrological remote sensing' in swot
    assert 'Evapotranspiration' in classify('Global evapotranspiration trends', 'catchment water balance', 'Water Resources Research', 'x')
    assert 'Hydrological extremes' in classify('Flash droughts in river basins', 'drought runoff', 'Water Resources Research', 'x')


def test_rules_topic_needs_title_or_repeated_abstract_term():
    abstract = 'We study river discharge. One sentence mentions deep learning once.'
    assert 'AI for hydrology & weather' not in classify('River discharge trends', abstract, 'Water Resources Research', 'x')
    abstract2 = 'Deep learning models of river discharge. We compare deep learning to physics.'
    assert 'AI for hydrology & weather' in classify('River discharge trends', abstract2, 'Water Resources Research', 'x')


def test_clean_text():
    assert build.clean_text('<jats:p>CO<sub>2</sub> &amp; rivers</jats:p>') == 'CO2 & rivers'
    assert build.clean_text('  A\n  title  ') == 'A title'


def test_snippet_cuts_at_sentence_and_limit():
    abstract = 'Abstract First sentence here. ' + 'Second sentence is long. ' * 30
    s = build.snippet(abstract)
    assert s.startswith('First sentence here.')
    assert len(s) <= 320
    assert s.endswith('.') or s.endswith('…')


def test_full_abstract_kept_only_when_longer_than_snippet():
    long_abstract = '<jats:p>Abstract Streamflow in river basins. ' + 'Runoff responds to rainfall. ' * 200 + '</jats:p>'
    rec = build.record(item('Streamflow drought in catchments', abstract=long_abstract), 'Water Resources Research', TODAY, 30)
    assert rec['abstract'].startswith('Streamflow in river basins.')
    assert len(rec['abstract']) <= build.ABSTRACT_CHARS and rec['abstract'].endswith('…')
    short = build.record(item('Streamflow drought in catchments', abstract='Streamflow in river basins.'), 'Water Resources Research', TODAY, 30)
    assert short['snippet'] == 'Streamflow in river basins.' and short['abstract'] == ''


def test_missing_abstract_gives_empty_snippet():
    rec = build.record(item('Flood frequency in arid catchments under warming'), 'Water Resources Research', TODAY, 30)
    assert rec is not None
    assert rec['snippet'] == ''
    assert rec['url'] == 'https://doi.org/10.1029/2026WR000001'
    assert rec['authors'] == ['A0 B0', 'A1 B1', 'A2 B2']
    assert rec['more_authors'] is False


def test_record_rejects_dates_outside_window():
    assert build.record(item('Flood frequency in catchments', online=(2026, 8, 1)), 'Water Resources Research', TODAY, 30) is None
    assert build.record(item('Flood frequency in catchments', online=(2026, 12, 1)), 'Water Resources Research', TODAY, 30) is None


def test_collect_sorts_newest_first_and_dedupes():
    pages = {('0043-1397', '1944-7973'): [item('Flood risk in river basins', doi='a', online=(2026, 10, 2)),
                                          item('Streamflow drought in catchments', doi='b', online=(2026, 10, 18)),
                                          item('Streamflow drought in catchments', doi='b', online=(2026, 10, 18))]}
    journals = [{'name': 'Water Resources Research', 'group': 'core', 'issns': ['0043-1397', '1944-7973']}]
    papers = build.collect(journals, TODAY, 30, fetch=lambda issns, s, e: pages[tuple(issns)])
    assert [p['doi'] for p in papers] == ['b', 'a']
    assert papers[0]['journal_short'] == 'Water Resources Research'
    journals[0]['short'] = 'WRR'
    assert build.collect(journals, TODAY, 30, fetch=lambda issns, s, e: pages[tuple(issns)])[0]['journal_short'] == 'WRR'


def test_fallback_when_crossref_fails(tmp_path):
    snapshot = tmp_path / 'snapshot.json'
    snapshot.write_text(json.dumps({'papers': [{'doi': 'snap'}], 'source': 'crossref'}))

    def broken_fetch(issns, start, end):
        raise OSError('network down')

    journals = [{'name': 'Water Resources Research', 'group': 'core', 'issns': ['0043-1397']}]
    live = {'papers': [{'doi': 'live'}], 'source': 'crossref'}
    payload = build.run(journals, TODAY, 30, fetch=broken_fetch, fetch_live=lambda: live, snapshot=snapshot)
    assert payload['source'] == 'fallback-live' and payload['papers'][0]['doi'] == 'live'

    def no_live():
        raise OSError('site down')

    payload = build.run(journals, TODAY, 30, fetch=broken_fetch, fetch_live=no_live, snapshot=snapshot)
    assert payload['source'] == 'fallback-snapshot' and payload['papers'][0]['doi'] == 'snap'

    payload = build.run(journals, TODAY, 30, fetch=broken_fetch, fetch_live=no_live, snapshot=tmp_path / 'missing.json')
    assert payload['source'] == 'empty' and payload['papers'] == []
