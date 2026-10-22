---
title: Reading Notes
permalink: /reading-notes/
intro: My notes on classic papers in hydrology. These are papers by other researchers that shaped the field; the notes are my own reading of them.
---
{%- assign notes = site.reading_notes | sort: "paper_year" -%}
{%- if notes.size == 0 %}
<p>Notes will appear here soon.</p>
{%- else %}
<ul class="rows">
  {%- for note in notes %}
  <li class="row"><span class="row-key">{{ note.paper_year }}</span><div class="row-body"><p class="row-title"><a href="{{ note.url | relative_url }}">{{ note.paper_title }}</a></p><p class="row-meta">{{ note.paper_authors }} · <em>{{ note.paper_venue }}</em></p>{% if note.takeaway %}<p class="row-note">{{ note.takeaway }}</p>{% endif %}</div></li>
  {%- endfor %}
</ul>
{%- endif %}
