---
title: HyDraw
permalink: /hydraw/
intro: How figures in leading journals are drawn, one figure at a time. Each entry cites the paper, shows the figure only when its license allows, and comes with code to draw the same kind of figure yourself.
---
{%- assign entries = site.hydraw | sort: "written" | reverse -%}
<div class="hydraw">
  <nav class="hydraw-types" aria-label="Figure types">
    <button type="button" data-type="" aria-pressed="true">All figures <span>{{ entries.size }}</span></button>
    {%- for t in site.data.hydraw_types %}
    {%- assign n = entries | where: "figure_type", t | size %}
    <button type="button" data-type="{{ t }}" aria-pressed="false"{% if n == 0 %} disabled{% endif %}>{{ t }} <span>{{ n }}</span></button>
    {%- endfor %}
  </nav>
  <ul class="hydraw-grid">
    {%- for e in entries %}
    <li class="hydraw-item" data-type="{{ e.figure_type }}">
      <a class="hydraw-card" href="{{ e.url | relative_url }}">
        <img src="{{ e.image | relative_url }}" alt="" loading="lazy" decoding="async">
        <span class="hydraw-info">
          <span class="hydraw-kind">{{ e.figure_type }}</span>
          <span class="hydraw-title">{{ e.title }}</span>
          <span class="hydraw-src">{{ e.source.figure }} · {{ e.source.authors[0] | split: " " | last }} et al. ({{ e.source.year }}), <em>{{ e.source.journal }}</em></span>
        </span>
      </a>
    </li>
    {%- endfor %}
  </ul>
</div>
<script src="{{ '/assets/js/hydraw-filter.js' | relative_url }}" defer></script>
