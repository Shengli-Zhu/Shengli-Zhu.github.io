# shengli-zhu.github.io

Personal academic website of Shengli Zhu, PhD student in hydrology at KAUST. Built with Jekyll and deployed to GitHub Pages by GitHub Actions.

## Updating the content

| What | Where |
|---|---|
| About text, education (supervisors, school logos), research interests | `_data/profile.yml` |
| News | `_data/news.yml` (newest first) |
| Publications | `_data/publications.yml` (`selected: true` puts a paper on the home page) |
| Contact icons (under the name on the home page, in the top bar elsewhere) | `_data/social.yml` |
| Blog posts | `_posts/YYYY-MM-DD-title.md`; photos with `{% include photo.html src="b-N/1" alt="…" %}`. To add photos, put the originals in a folder such as `new/b-10/` and run `python3 tools/compress_photos.py new`; it writes two sizes to `assets/img/blog/` and adds their dimensions to `_data/photos.yml` |
| HyDraw | one Markdown file per figure in `_hydraw/` (source paper, figure, licence, `figure_type` from `_data/hydraw_types.yml`), its script in `_hydraw/code/`, images in `assets/img/hydraw/` |
| Reading Notes | one Markdown file per note in `_reading_notes/` with `paper_title`, `paper_authors`, `paper_year`, `paper_venue`, `paper_doi`, `takeaway`, `written`. The section appears in the menu once the first note exists |
| CV | replace the PDF in `files/` and update the path in `cv.md` |
| Portrait | `assets/img/profile.jpg` (4:5 portrait, 720 × 900 px) |

## Hydro Digest

`tools/hydro_digest/build.py` collects papers from the last 90 days from Crossref for 16 journals (`journals.json`) and keeps those that match the topics in `rules.py`. The workflow runs it before every build, on every push and daily at 02:00 UTC. The list itself is not committed: if Crossref fails, the build reuses the list from the live site, then `snapshot.json`.

## Home page

The hero animation (`assets/js/hero.js`) uses three.js 0.160.0, kept in `assets/vendor/`. The globe texture in `assets/hero/` carries the HydroRIVERS v1.0 river network (Lehner & Grill, 2013).

## Local build

Needs Ruby with Bundler and Python 3 with PyYAML (Pillow for the photo script).

```bash
make digest   # fetch Hydro Digest data
make build    # build the site into _site/
make serve    # preview at http://127.0.0.1:4000
make test     # run the checks in tests/
```
