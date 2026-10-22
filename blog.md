---
title: Blog
permalink: /blog/
redirect_from:
  - /year-archive/
  - /wordpress/blog-posts/
---
{%- assign years = site.posts | group_by_exp: "p", "p.date | date: '%Y'" -%}
{%- for y in years %}
<section class="section" aria-labelledby="y{{ y.name }}">
  <h2 class="section-h" id="y{{ y.name }}">{{ y.name }}</h2>
  <ul class="section-body rows">
    {%- for post in y.items %}
    <li class="row post-row"><span class="row-key">{{ post.date | date: "%-d %b" }}</span><div class="row-body"><p class="row-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></p>{% if post.tags.size > 0 %}<p class="row-meta">{{ post.tags | join: " · " }}</p>{% endif %}</div>{% if post.cover %}<a class="post-thumb" href="{{ post.url | relative_url }}" tabindex="-1" aria-hidden="true"><img src="{{ '/assets/img/blog/' | append: post.cover | append: '-800.jpg' | relative_url }}" width="800" height="533" loading="lazy" decoding="async" alt=""{% if post.cover_pos %} style="object-position: {{ post.cover_pos }}"{% endif %}></a>{% endif %}</li>
    {%- endfor %}
  </ul>
</section>
{%- endfor %}
