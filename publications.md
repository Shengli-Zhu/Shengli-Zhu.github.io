---
title: Publications
permalink: /publications/
---
<section class="section" aria-labelledby="journal-h">
  <h2 class="section-h" id="journal-h">Journal articles</h2>
  <ul class="section-body rows">{% for pub in site.data.publications %}{% if pub.kind == "journal" %}{% include pub.html pub=pub %}{% endif %}{% endfor %}</ul>
</section>
<section class="section" aria-labelledby="early-h">
  <h2 class="section-h" id="early-h">Early work</h2>
  <ul class="section-body rows">{% for pub in site.data.publications %}{% if pub.kind == "early" %}{% include pub.html pub=pub %}{% endif %}{% endfor %}</ul>
</section>
