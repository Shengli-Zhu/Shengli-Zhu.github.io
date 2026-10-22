---
title: Bubble and track maps for moving extremes
figure_type: Maps
written: 2026-10-22
source:
  authors: [Amitesh Sabut, Ashok Mishra, Ruby Leung, Dara Entekhabi]
  year: 2026
  title: Global expansion of compound drought–heatwave risk
  journal: Nature Communications
  doi: 10.1038/s41467-026-78045-3
  figure: Fig. 1
  version: Accelerated Article Preview (unedited version)
  license: CC BY-NC-ND 4.0
  license_url: https://creativecommons.org/licenses/by-nc-nd/4.0/
image: /assets/img/hydraw/sabut2026-fig1.jpg
recreation: /assets/img/hydraw/bubble-and-track-maps.png
code: bubble-and-track-maps.py
---
## What works

- Two variables on one marker
- Classes instead of continuous scales
- One colour ramp for both panels
- Legends sit in the ocean
- A rose diagram for direction

## Draw it yourself

The script below rebuilds these techniques with Matplotlib and Cartopy. The events are synthetic, so the picture shows the method, not the paper's results.

<figure class="photo"><img src="{{ page.recreation | relative_url }}" alt="Bubble map and track map drawn with the script below" loading="lazy" decoding="async"><figcaption>Drawn with the script below. The events are synthetic.</figcaption></figure>

```python
{% include_relative code/bubble-and-track-maps.py %}
```
