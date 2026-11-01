# Hikaya SEO tools

Generators for the public SEO pages, kept here so they can be re-run.

- `guides_content.py`: the gift guides (EN + AR). Add a new guide by appending to `GUIDES`.
- `gen_guides.py`: writes `hikaya/guide-*.html`, `hikaya/guides.html`, `guides-i18n.js` and `guide_seo.json`.
- `gen_countries.py`: writes the GCC country pages `hikaya/personalised-books-*.html`, `countries-i18n.js` and `country_seo.json`.
- `register_pages.py`: registers new pages in the SEO layer, both sitemaps and page titles.

Add a guide: append it to `guides_content.py`, then from the repo root run
`python3 tools/seo/gen_guides.py && python3 tools/seo/register_pages.py tools/seo/guide_seo.json`.
Rules: Arabic copy has no full stops; never claim a gift card/tag in the package (there is none);
prices, delivery times and policies must match `region.js` and the FAQs.

The gift landing pages (`hikaya/gift*.html`) were generated once and then edited by hand; edit them directly.
