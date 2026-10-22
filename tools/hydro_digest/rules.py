import re

CORE = {'Water Resources Research', 'Hydrology and Earth System Sciences', 'Journal of Hydrometeorology'}

HYDRO_TERMS = [r'hydrolog', r'streamflow', r'runoff', r'\briver', r'catchment', r'\bbasin',
               r'\bfloods?\b|flood (risk|peak|wave|frequency|forecast|event|hazard|inundation)',
               r'precipitation', r'rainfall', r'drought', r'discharge', r'snowmelt|snowpack|snow water',
               r'water (balance|resource|storage|cycle|availability|supply)', r'groundwater', r'evapotranspiration',
               r'soil moisture', r'rain gauge|gauge network', r'hydrograph']

WATER_CONTEXT = r'runoff|streamflow|discharge|snowmelt|meltwater|water (balance|resource|storage|cycle|supply|availability)|hydrolog|\briver|catchment|\bbasin|precipitation|rainfall'

TOPICS = {
    'Precipitation observation': r'satellite precipitation|precipitation product|precipitation estimat|rain ?gauge|gauge network|gauge density|imerg|chirps|\bgpm\b|mswep|merged precipitation|radar rainfall|quantitative precipitation estimat',
    'Hydrological extremes': r'extreme precipitation|extreme rainfall|heavy rainfall|heavy precipitation|precipitation extremes|rainfall intensit|hydrologic(al)? extremes?|extreme (hydrolog|event|flow)|\bdroughts?\b|low flows?\b|compound (event|extreme|flood|drought)',
    'Rainfall–runoff & streamflow': r'rainfall.runoff|streamflow|hydrological model|catchment model|model calibration|ungauged|large.sample hydrolog|camels|caravan|discharge (simulation|prediction|forecast)',
    'Evapotranspiration': r'evapotranspiration|transpiration|evaporation|evaporative (demand|fraction|stress)|latent heat flux',
    'Hydrological remote sensing': r'remote sensing|remotely sensed|\bswot\b|surface water and ocean topography|\bgrace\b|grace.fo|terrestrial water storage|\bsmap\b|\bsmos\b|satellite (altimetry|soil moisture|gravimetry|observation|retriev|imag|data)|altimetr|sentinel.[12]|landsat|\bmodis\b|\binsar\b',
    'AI for hydrology & weather': r'\blstm\b|deep learning|machine learning|neural network|differentiable|ai weather|graphcast|aifs|foundation model|data.driven (model|forecast)',
    'Floods & flash floods': r'\bfloods?\b|flash flood|flood (risk|peak|wave|frequency|forecast|event|hazard|damage|susceptibility)|inundation|\bwadi|ephemeral (river|stream|channel)',
    'Global hydrology & change': r'global (river|runoff|streamflow|discharge|hydrolog|water cycle|water availability)|flow regime|streamflow seasonality|cmip6|isimip|terrestrial water storage',
    'Cold regions': r'snowmelt|snow cover|snowfall|snowpack|rain.snow|snow water equivalent|permafrost|frozen (ground|soil)',
}
NEEDS_WATER = {'Cold regions', 'Global hydrology & change', 'AI for hydrology & weather', 'Hydrological remote sensing'}
# Excluded topics: a paper is dropped when one of these is in its title or twice in its abstract.
EXCLUDE_TERMS = r'glacier|\bglacial|glaciated|ice sheet|ice shelf|\boceans?\b|oceanic|oceanograph|\bseas?\b|marine|tibetan plateau|qinghai.tibet|third pole'
SWOT = r'surface water and ocean topography'
EXCLUDE_TITLE = r'^(author correction|publisher correction|correction|corrigendum|retraction|erratum|editorial expression|reply|comment on)\b'
EXCLUDE_DOI = r'10\.1038/d4'


def classify(title, abstract, journal, doi):
    title_l, abstract_l = title.lower(), abstract.lower()
    if re.search(EXCLUDE_TITLE, title_l) or re.search(EXCLUDE_DOI, (doi or '').lower()):
        return []
    unwanted = re.compile(EXCLUDE_TERMS)
    if unwanted.search(re.sub(SWOT, '', title_l)) or len(unwanted.findall(re.sub(SWOT, '', abstract_l))) >= 2:
        return []
    text = f'{title_l} {abstract_l}'
    n_hydro = sum(bool(re.search(t, text)) for t in HYDRO_TERMS)
    if n_hydro < (1 if journal in CORE else 2):
        return []
    hits = []
    for name, rx in TOPICS.items():
        strong = re.search(rx, title_l) or len(re.findall(rx, abstract_l)) >= 2
        if strong and (name not in NEEDS_WATER or re.search(WATER_CONTEXT, text)):
            hits.append(name)
    return hits
