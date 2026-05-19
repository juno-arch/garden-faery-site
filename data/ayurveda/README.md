# Ayurveda data

## herbs.json — Amidha Herb Database

**Source.** `sciencewithsaucee-sudo/herb-database`, vendored from pinned commit
[`9ff8f3557fa3df97e3c4874eb5542dcbc5b375c4`](https://github.com/sciencewithsaucee-sudo/herb-database/tree/9ff8f3557fa3df97e3c4874eb5542dcbc5b375c4)
(2026-01-14).

**Author.** Sparsh Varshney, BAMS, founder of Amidha Ayurveda
(<https://www.amidhaayurveda.com>).

**License.** Creative Commons Attribution 4.0 International (CC-BY-4.0). Full
text in [`LICENSE-amidha-herb-database.txt`](./LICENSE-amidha-herb-database.txt).

**Citation.** "Amidha Ayurveda Herb Database: A Curated JSON Dataset of 700
Ayurvedic Herbs." Zenodo DOI
[10.5281/zenodo.17475352](https://zenodo.org/records/17475352).

**Provenance.** Per the upstream README, herb entries are cross-referenced
against:
- *Charaka Samhita*
- *Sushruta Samhita*
- *Bhavaprakasha Nighantu*
- *Ayurvedic Pharmacopoeia of India*

**Modifications.** None. The JSON file is byte-identical to the upstream
commit. If we ever transform it (filter, restructure, translate fields), we
must note the change here to satisfy CC-BY-4.0 §3(a)(1)(B).

**Schema.** Array of 704 objects with keys:
- `name` — common Sanskrit / Hindi name
- `link` — canonical Amidha page for this herb
- `preview` — short prose description
- `pacify` — array of doshas this herb soothes (subset of `Vata` / `Pitta` /
  `Kapha`)
- `aggravate` — array of doshas it can increase
- `tridosha` — boolean, true if it balances all three
- `rasa` — array of tastes (madhura / amla / lavana / katu / tikta / kashaya)
- `guna` — array of qualities (snigdha, ruksha, etc.)
- `virya` — potency (ushna = heating / shita = cooling)
- `vipaka` — post-digestive effect (madhura / amla / katu)
- `prabhav` — array of specific actions / indications

**Why this is here.** We surface herb chips on the inner-season cards
(`PHASE_HERBS` in `moon.html`) and want to expand that lookup to a properly
sourced dataset rather than the small hand-picked subset we started with.

**How to refresh.** If you want to pull a newer commit, replace the file and
update the pinned hash above. Verify the upstream `LICENSE` hasn't changed and
that the schema still matches.
