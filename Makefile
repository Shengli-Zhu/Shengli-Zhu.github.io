.PHONY: digest build serve test

digest:
	python3 tools/hydro_digest/build.py --days 90 --out _data/hydro_digest.json --public assets/data/hydro-digest.json --fallback-url https://shengli-zhu.github.io/assets/data/hydro-digest.json

build:
	JEKYLL_ENV=production bundle exec jekyll build --quiet

serve:
	bundle exec jekyll serve --host 127.0.0.1 --port 4000

test:
	python3 -m pytest -q tests
