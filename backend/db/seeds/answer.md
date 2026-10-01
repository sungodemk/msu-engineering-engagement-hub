# Entity Resolution Answer Key

This file records the known duplicate and non-duplicate entities in the synthetic CRM seed data. It is intended to be used to evaluate the company/person matcher and later measure precision and recall.

## 1. Companies

### Should match

#### ORG-001 — Red Cedar Motor Company / ORG-018 — Red Cedar Motors

These are the same company. `Red Cedar Motors` is just a shorter version of `Red Cedar Motor Company`.

#### ORG-002 — Grand River Automotive / ORG-019 — GRA Inc.

These are the same company. `GRA` is an acronym for `Grand River Automotive`.

### Should not match

#### ORG-017 — UM Digital LLC / ORG-010 — Union Mercantile

These are different organizations. `UM Digital LLC` is a subsidiary of `Union Mercantile`, and its parent is recorded as `ORG-010`.

#### ORG-007 — Spartan Helm Aerospace / ORG-015 — Spartan Stack Technologies

These are different organizations. They share the word `Spartan`, but have different names and represent different companies.

#### ORG-003 — Green Current Motors / ORG-014 — Go Green Power & Light

These are different organizations. They only share the word `Green` and that does not indicate a duplicate.

#### ORG-003 — Green Current Motors / ORG-013 — Greene & Whyte Materials

These are different organizations. `Green` and `Greene` are similar, but the companies are not related.

#### ORG-014 — Go Green Power & Light / ORG-013 — Greene & Whyte Materials

These are different organizations. Their names have the similar `Green` and `Greene` wording, but are separate companies.

## 2. People

### Should match

#### PER-0161 — Sean Gilchrist / PER-0169 — S. Gilchrist

These are the same people. Both records are in Grand Rapids, have a BS in Electrical Engineering from 2011, and are affiliated with Circle Drive Medical (`ORG-009`). `S. Gilchrist` also uses a personal email (`sgilchrist11@mail.example.com`), which is consistent with the record coming from the company and the other from the alumni update.

### Should not match

#### PER-0169 — S. Gilchrist / PER-0007 — Samira Gilchrist

These are different people. The first initial and last name match, but their city, degree, and employer differ, making Samira Gilchrist the trap case for name-only matching.

#### PER-0161 — Sean Gilchrist / PER-0086 — Lauren Gilchrist

These are different people. They share the last name `Gilchrist`, but have different first names and represent unrelated people.

#### PER-0161 — Sean Gilchrist / PER-0247 — Brett Gilchrist

Same reason as above example

## 3. Open items

### Stale employer

The CRM seed data contains one intentionally planted stale employer relationship, but the specific record has not yet been identified yet. Might only become identifiable once Handshake or board data is loaded.

Source: Bob's `README.md`, **Known data issues**.