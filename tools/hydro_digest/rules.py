import re

CORE = {'Water Resources Research', 'Hydrology and Earth System Sciences', 'Journal of Hydrometeorology'}
DATA_JOURNALS = {'Scientific Data', 'Earth System Science Data'}

HYDRO_TERMS = [r'hydrolog', r'streamflow', r'runoff', r'\briver', r'catchment', r'\bbasin',
               r'\bfloods?\b|flood (risk|peak|wave|frequency|forecast|event|hazard|inundation)',
               r'precipitation', r'rainfall', r'drought', r'discharge', r'snowmelt|snowpack|snow water',
               r'water (balance|resource|storage|cycle|availability|supply)', r'groundwater', r'evapotranspiration',
               r'soil moisture', r'rain gauge|gauge network', r'hydrograph']

WATER_CONTEXT = r'runoff|streamflow|discharge|snowmelt|meltwater|water (balance|resource|storage|cycle|supply|availability)|hydrolog|\briver|catchment|\bbasin|precipitation|rainfall'

SAT_PRECIP = r'satellite (precipitation|rainfall)|\bimerg\b|\bgpm\b|\bchirps\b|persiann|cmorph|gsmap'
SWOT = r'\bswot\b|surface water and ocean topography'
HYBRID = r'hybrid (hydrolog\w* )?model|physics.(informed|guided|constrained)|differentiable'

TOPICS = {
    'Precipitation': rf'precipitation|rainfall|\brain ?gauges?|gauge (network|density)|\bmswep\b|radar (rainfall|precipitation)|quantitative precipitation|monsoon|atmospheric rivers?|rain.snow|{SAT_PRECIP}',
    'Hydrological extremes': r'\bfloods?\b|flooding|flash.flood|inundation|\bdroughts?\b|low.flows?\b|extreme (precipitation|rainfall|events?|flows?|hydrolog|weather|wet)|heavy (rain|precipitation)|precipitation extremes|hydrologic(al)? extremes?|compound (events?|extremes?|floods?|droughts?|hazards?)',
    'Computational hydrology': rf'hydrolog\w* model|land surface model|catchment model|rainfall.runoff model|process.based (hydrolog\w* )?model|physically.based|conceptual model|distributed model|model (calibration|structure|parameter|benchmark|intercomparison)|calibrat|regionali[sz]ation|data assimilation|ungauged|large.sample|\bcamels\b|caravan|(streamflow|discharge|runoff|flood) (simulation|prediction|forecast)|hydrological (forecast|prediction|simulation)|\bvic\b|\bswat\b|\bhbv\b|\bgr4j\b|noah.mp|\bmhm\b|wflow|parflow|{HYBRID}',
    'AI for hydrology': rf'\blstm\b|long short.term memory|deep.learning|machine.learning|recurrent|\bgru\b|autoencoder|attention (network|mechanism)|neural (network|operator)|random forest|xgboost|gradient boost|transformer|convolutional|artificial intelligence|\bai\b|graphcast|\baifs\b|pangu|fourcastnet|gencast|foundation model|large language model|data.driven (model|forecast|approach)|emulator|surrogate model|explainable|{HYBRID}',
    'Surface hydrology': rf'surface runoff|peak flows?|water yield|water levels?|runoff (generation|process|mechanism|coefficient|ratio|response)|streamflow (trend|change|decline|increase|regime|seasonality|timing|signature|variability|response|record|observation)|river (discharge|flow|network|channel)|discharge (observation|measurement|estimat|record)|\blakes?\b|wetlands?|floodplain|surface water (extent|area|dynamics)|flow (regime|intermittency)|intermittent (rivers?|streams?)|ephemeral|non.perennial|\bwadis?\b|overland flow|hillslope|recession|evapotranspiration|transpiration|evaporation|evaporative|latent heat|ecohydrolog|vegetation water|plant water|water use efficiency|{SWOT}',
    'Subsurface hydrology': r'soil moisture|soil water|vadose|unsaturated zone|infiltration|groundwater|aquifer|\brecharge(?! oscillator)|hyporheic|baseflow|water table|subsurface (flow|storm|water)|preferential flow|critical zone|karst|piezomet|hydraulic conductivity|root.zone',
    'Hydrological remote sensing': rf'remote(ly)? sens|{SWOT}|\bgrace\b|grace.fo|\bsmap\b|\bsmos\b|satellite|altimetr|sentinel.?[123]|landsat|\bmodis\b|\binsar\b|synthetic aperture|\bsar\b|lidar|microwave|earth observation|gravimetr|{SAT_PRECIP}',
    'Global hydrology & change': r'global (river|runoff|streamflow|discharge|hydrolog|water|land|drylands?)|water cycle|terrestrial water storage|climate change|cmip6?|isimip|future (projection|climate|change)|anthropogenic|human (activit|influence|impact|water)|water (resources?|use|withdrawal|demand|scarcity|security|management|availability|stress|allocation)|reservoirs?|\bdams?\b|irrigat|urban|land.use|land.cover change|deforestation',
    'Cold regions': r'snowmelt|snow cover|snowfall|snowpack|\bsnow\b|rain.snow|snow water equivalent|permafrost|frozen (ground|soil)|freeze.thaw|seasonal(ly)? frozen|river ice|lake ice|active layer|thermokarst',
    'Hydrological datasets': r'\bdata ?sets?\b|\bdatabases?\b|\bproducts?\b|\bbenchmarks?\b',
}
# Titles that only use datasets, rather than describe one.
USES_DATA = r'\b(using|with|from)\b[^:]*\b(data ?sets?|products?)\b'
MAIN_TOPICS = [t for t in TOPICS if t != 'Hydrological datasets']
MAX_TOPICS = 2
NEEDS_WATER = {'Cold regions', 'Global hydrology & change', 'AI for hydrology', 'Hydrological remote sensing'}
NOT_PRECIP = r'rainfall.runoff|(iron|fe|calcite|carbonate|mineral|salt|oxide)s? precipitation|precipitation of (iron|calcite|carbonate|minerals?|salts?)'
# Excluded topics: a paper is dropped when one of these is in its title or repeated in its abstract.
EXCLUDE_TERMS = r'glacier|\bglacial|glaciated|ice sheet|ice shelf|\boceans?\b|oceanic|oceanograph|\bseas?\b|marine|\btibet|qinghai|asian water tower|third pole'
QUALITY_TERMS = r'water quality|nitrate|nitrogen|phosph|nutrient|sediment|turbidity|erosion|contamina|pollut|microplastic|pfas|pesticide|heavy metal|arsenic|dissolved organic|eutrophic|algal bloom|salini|\bsolutes?\b|\bdoc\b|carbon export|riverine export'
EXCLUDE_TITLE = r'^(author correction|publisher correction|correction|corrigendum|retraction|erratum|editorial expression|reply|comment on)\b'
EXCLUDE_DOI = r'10\.1038/d4'


def excluded(rx, title, abstract, repeats=2):
    rx = re.compile(rx)
    return bool(rx.search(title)) or len(rx.findall(abstract)) >= repeats


def classify(title, abstract, journal, doi):
    title_l, abstract_l = title.lower(), abstract.lower()
    if re.search(EXCLUDE_TITLE, title_l) or re.search(EXCLUDE_DOI, (doi or '').lower()):
        return []
    clean_t, clean_a = re.sub(SWOT, 'swot', title_l), re.sub(SWOT, 'swot', abstract_l)
    if excluded(EXCLUDE_TERMS, clean_t, clean_a) or excluded(QUALITY_TERMS, title_l, abstract_l, 3):
        return []
    text = f'{title_l} {abstract_l}'
    n_hydro = sum(bool(re.search(t, text)) for t in HYDRO_TERMS)
    if n_hydro < (1 if journal in CORE else 2):
        return []
    has_water = re.search(WATER_CONTEXT, text)
    ranked = []
    for i, name in enumerate(MAIN_TOPICS):
        rx = TOPICS[name]
        t, a = (re.sub(NOT_PRECIP, '', s) for s in (title_l, abstract_l)) if name == 'Precipitation' else (title_l, abstract_l)
        in_title, n_abstract = bool(re.search(rx, t)), len(re.findall(rx, a))
        if (in_title or n_abstract >= 2) and (name not in NEEDS_WATER or has_water):
            ranked.append((not in_title, -n_abstract, i, name))
    hits = [name for *_, name in sorted(ranked)[:MAX_TOPICS]]
    data_title = re.search(TOPICS['Hydrological datasets'], title_l) and not re.search(USES_DATA, title_l)
    if (journal in DATA_JOURNALS or data_title) and (hits or n_hydro >= 3):
        hits.append('Hydrological datasets')
    return hits
