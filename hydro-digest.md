---
title: Hydro Digest
permalink: /hydro-digest/
intro: Recent papers by other researchers, on topics close to my work. Collected automatically every day from sixteen journals in hydrology and the Earth sciences.
---
{%- assign d = site.data.hydro_digest -%}
{%- if d and d.papers.size > 0 %}
<div class="digest-head">
  <p class="digest-total"><span class="digest-n">{{ d.papers.size }}</span>papers in the last {{ d.window_days }} days<br>updated {{ d.generated_at | date: "%-d %B %Y" }}{% if d.source != "crossref" %} · today's update did not run, so this is the most recent list available{% endif %}</p>
  <figure class="flow" data-end="{{ d.generated_at | date: '%Y-%m-%d' }}" data-days="{{ d.window_days }}"><svg role="img" aria-label="Number of papers per day over the last {{ d.window_days }} days"></svg></figure>
</div>
<div class="digest-facets">
  <div class="digest-search">
    <label class="facet-h" for="digest-q">Search</label>
    <input id="digest-q" type="search" placeholder="Title, author or abstract" autocomplete="off">
    <button class="digest-new" type="button" aria-pressed="false" hidden></button>
    <p class="digest-hint">Select a topic or a journal to filter the list. The counts and the curve above follow your selection.</p>
  </div>
  <details class="facet-panel" open>
  <summary>Topics and journals</summary>
  <div class="facet-groups">
    <div class="facet-group" role="group" aria-labelledby="facet-topic-h">
      <p class="facet-h" id="facet-topic-h">Topics</p>
      {%- for t in d.topics %}
      {%- assign n = 0 -%}{%- for paper in d.papers %}{% if paper.topics contains t %}{% assign n = n | plus: 1 %}{% endif %}{% endfor -%}
      <button class="facet" type="button" data-kind="topic" data-value="{{ t }}" aria-pressed="false"><span class="facet-label">{{ t }}</span><span class="facet-n">{{ n }}</span><span class="facet-bar"></span></button>
      {%- endfor %}
    </div>
    <div class="facet-group" role="group" aria-labelledby="facet-journal-h">
      <p class="facet-h" id="facet-journal-h">Journals</p>
      {%- assign by_journal = d.papers | group_by: "journal" | sort: "size" | reverse -%}
      {%- for j in by_journal %}
      <button class="facet" type="button" data-kind="journal" data-value="{{ j.items[0].journal_short | default: j.name }}" aria-pressed="false" title="{{ j.name }}"><span class="facet-label">{{ j.name }}</span><span class="facet-n">{{ j.size }}</span><span class="facet-bar"></span></button>
      {%- endfor %}
    </div>
  </div>
  </details>
</div>
<div class="digest-tools" aria-live="polite">
  <span class="tools-count">All {{ d.papers.size }} papers</span>
  <span class="tools-active"></span>
  <button class="tools-clear" type="button" hidden>Clear filters</button>
</div>
{%- assign days = d.papers | group_by: "date" -%}
<div class="digest">
{%- for day in days %}
  <section class="digest-group">
    <h2 class="digest-day">{{ day.name | date: "%-d %B %Y" }}</h2>
    <ul class="rows">{% for paper in day.items %}{% include digest-row.html paper=paper snippet=true journal_key=true %}{% endfor %}</ul>
  </section>
{%- endfor %}
</div>
<p class="digest-status digest-empty" hidden>No papers match these filters.</p>
<script src="{{ '/assets/js/digest-filter.js' | relative_url }}" defer></script>
{%- else %}
<p>The list is being prepared and will appear after the next daily update.</p>
{%- endif %}
