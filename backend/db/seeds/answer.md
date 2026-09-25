# Entity Resolution Answer Key

This file records the known duplicate and non-duplicate entities in the synthetic CRM seed data. It is intended to be used to evaluate the company/person matcher and later measure precision and recall.

## 1. Should match

### ORG-001 — Red Cedar Motor Company / ORG-018 — Red Cedar Motors

These are the same company. `Red Cedar Motors` is just a shorter version of `Red Cedar Motor Company`.

### ORG-002 — Grand River Automotive / ORG-019 — GRA Inc.

These are the same company. `GRA` is an acronym for `Grand River Automotive`.

### PER-0161 — Sean Gilchrist / PER-0169 — S. Gilchrist

These are the same person. Both records are in Grand Rapids, have a BS in Electrical Engineering from 2011, and are affiliated with the same employer, Circle Drive Medical (`ORG-009`). The name alone is not enough to prove the match because Samira Gilchrist is a different person whose name also begins with `S`.

## 2. Should not match

### ORG-017 — UM Digital LLC / ORG-010 — Union Mercantile

These are different organizations. `UM Digital LLC` is a subsidiary of `Union Mercantile`, and its parent is recorded as `ORG-010`.

### ORG-007 — Spartan Helm Aerospace / ORG-015 — Spartan Stack Technologies

These are different organizations. They share the word `Spartan`, but have different names and represent different companies.

### ORG-003 — Green Current Motors / ORG-014 — Go Green Power & Light

These are different organizations. They only share the word `Green` and that does not indicate a duplicate.

### ORG-003 — Green Current Motors / ORG-013 — Greene & Whyte Materials

These are different organizations. `Green` and `Greene` are similar, but the companies are not related.

### ORG-014 — Go Green Power & Light / ORG-013 — Greene & Whyte Materials

These are different organizations. Their names contain the similiar Green and Greene wording as above, but they are separate companies.

### PER-0169 — S. Gilchrist / PER-0007 — Samira Gilchrist

These are different people. The first initial and last name match, but Samira Gilchrist is a separate person. `S. Gilchrist` matches Sean only when the city, degree, class year, and employer evidence is considered.

## 3. Open items

### Stale employer

The CRM seed data contains one intentionally stale employer relationship, but the specific record has not yet been identified in this key.

Source: Bob's `README.md`, **Known data issues**.