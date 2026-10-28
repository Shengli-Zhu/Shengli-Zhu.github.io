---
title: Hydro Digest
permalink: /hydro-digest/
intro: Recent papers by other researchers, on topics close to my work. Collected automatically every three hours from sixteen journals in hydrology and the Earth sciences.
---
{%- assign d = site.data.hydro_digest -%}
{%- if d and d.papers.size > 0 %}
{%- assign end_day = d.generated_at | date: '%Y-%m-%d' -%}
{%- assign since = end_day | append: ' 12:00:00' | date: '%s' | minus: 518400 | date: '%Y-%m-%d' -%}
{%- assign week = d.papers | where_exp: "p", "p.date >= since" -%}
<div class="digest-head">
  <p class="digest-total"><span class="digest-n">{{ d.papers.size }}</span>papers in the last {{ d.window_days }} days<br>{{ week.size }} in the last 7 days<br>updated {{ d.generated_at | date: "%-d %B %Y" }}{% if d.source != "crossref" %} · the latest update did not run, so this is the most recent list available{% endif %}</p>
  <figure class="flow" data-end="{{ end_day }}" data-days="{{ d.window_days }}" data-dates="{{ d.papers | map: 'date' | join: ' ' }}"><svg role="img" aria-label="Number of papers per day over the last {{ d.window_days }} days"></svg></figure>
</div>
<section class="section" aria-labelledby="topics-h">
  <div class="section-side">
    <h2 class="section-h" id="topics-h">Topics</h2>
    <p class="digest-status">A paper is listed under at most two topics. Papers that describe a dataset are also listed under Hydrological datasets.</p>
  </div>
  <ul class="topic-list">
  {%- assign topics = site.digest_topics | sort: "order" -%}
  {%- for t in topics %}
    {%- assign tp = d.papers | where_exp: "p", "p.topics contains t.title" -%}
    {%- assign tw = tp | where_exp: "p", "p.date >= since" %}
    <li><a class="topic-link" href="{{ t.url | relative_url }}">
      <span class="topic-name">{{ t.title }}</span>
      <span class="topic-n">{{ tp.size }}</span>
      <span class="topic-short">{{ t.short }}</span>
      <span class="topic-week{% if tw.size == 0 %} is-zero{% endif %}">+{{ tw.size }} this week</span>
    </a></li>
  {%- endfor %}
  </ul>
</section>
<section class="section" aria-labelledby="latest-h">
  <div class="section-side">
    <h2 class="section-h" id="latest-h">Latest papers</h2>
    <p class="digest-status">The three most recent days with new papers. Earlier papers are on the topic pages.</p>
  </div>
  <div class="section-body digest digest-latest" data-seen="hydro-digest-seen">
  {%- assign days = d.papers | group_by: "date" -%}
  {%- for day in days limit: 3 %}
    <section class="latest-day">
      <h3 class="latest-day-h">{{ day.name | date: "%-d %B %Y" }}<span>{{ day.size }} paper{% if day.size != 1 %}s{% endif %}</span></h3>
      <ul class="rows">{% for paper in day.items %}{% include digest-row.html paper=paper snippet=true journal_key=true %}{% endfor %}</ul>
    </section>
  {%- endfor %}
  </div>
</section>
<script src="{{ '/assets/js/digest-filter.js' | relative_url }}" defer></script>
{%- else %}
<p>The list is being prepared and will appear after the next update.</p>
{%- endif %}
