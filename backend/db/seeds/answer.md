# Entity Resolution Answer Key

This file records the known duplicate and non-duplicate entities in the synthetic Salesforce and Handshake data. It is intended to be used to evaluate the company/person matcher and later measure precision and recall.

## 1. Companies

### Should match

#### ORG-001 — Red Cedar Motor Company / ORG-018 — Red Cedar Motors

These are the same company. `Red Cedar Motors` is just a shorter version of `Red Cedar Motor Company`.

#### ORG-002 — Grand River Automotive / ORG-019 — GRA Inc.

These are the same company. `GRA` is an acronym for `Grand River Automotive`.

### Should not match

#### ORG-017 — UM Digital LLC / ORG-010 — Union Mercantile

These are different organizations. `UM Digital LLC` is a subsidiary of `Union Mercantile`, and its parent is recorded as `ORG-010`. The matcher now skips this pair with the parent/child rule.

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

Same reason as above example.

## 3. Cross-Source Matches

### Companies: should match

#### Same-name Handshake / Salesforce pairs

These are the same organizations in Handshake and Salesforce as their names match exactly so the matcher auto-accepts them.

- 480102 — Grand River Automotive / ORG-002 — Grand River Automotive
- 480103 — Green Current Motors / ORG-003 — Green Current Motors
- 480104 — Beaumont Precision Components / ORG-004 — Beaumont Precision Components
- 480105 — Tailgate Drive Systems / ORG-005 — Tailgate Drive Systems
- 480106 — Laconia Defense Technologies / ORG-006 — Laconia Defense Technologies
- 480107 — Spartan Helm Aerospace / ORG-007 — Spartan Helm Aerospace
- 480108 — Hoplite Mission Systems / ORG-008 — Hoplite Mission Systems
- 480109 — Circle Drive Medical / ORG-009 — Circle Drive Medical
- 480110 — Union Mercantile / ORG-010 — Union Mercantile
- 480111 — Wells Hall Energy / ORG-011 — Wells Hall Energy
- 480112 — Farm Lane Consumer Brands / ORG-012 — Farm Lane Consumer Brands
- 480113 — Greene & Whyte Materials / ORG-013 — Greene & Whyte Materials
- 480114 — Go Green Power & Light / ORG-014 — Go Green Power & Light
- 480115 — Spartan Stack Technologies / ORG-015 — Spartan Stack Technologies
- 480116 — UM Digital LLC / ORG-017 — UM Digital LLC

#### 480101 — Red Cedar Motor Company / 480119 — Red Cedar Motor Co. / ORG-001 — Red Cedar Motor Company / ORG-018 — Red Cedar Motors

All four records are the same company. The Handshake records and `ORG-018` should merge into `ORG-001` which is the Salesforce record that should survive.

#### 480120 — Spartan Helm Aerospace & Defense / 480107 — Spartan Helm Aerospace / ORG-007 — Spartan Helm Aerospace

These are the same employer. `Spartan Helm Aerospace & Defense` is another Handshake version of Spartan Helm Aerospace so all three records should represent one organization.

### Companies: should not match

#### 480117 — Wells Hall Energy - New Energy Ventures / ORG-011 — Wells Hall Energy

These are related but separate organizations as New Energy Ventures is a division with its own parent ID so it should not be merged into Wells Hall Energy.

#### 480118 — Ostwald Mobility - Tailgate / ORG-016 — Ostwald Mobility Group

These may be related, but the data does not give enough information to merge them automatically. This will go to the queue.
#### ORG-017 — UM Digital LLC / ORG-010 — Union Mercantile

These are a parent and subsidiary, not duplicates so the matcher skips this comparison using the parent/child rule.

#### Green Current Motors / Red Cedar Motors

The following pairs are not matches:

- 480103 — Green Current Motors / ORG-018 — Red Cedar Motors
- ORG-003 — Green Current Motors / ORG-018 — Red Cedar Motors

Green Current Motors and Red Cedar Motors are separate companies. Their name similarity is not enough to make them duplicates.

#### Laconia Defense Technologies / Spartan Stack Technologies

The following pairs are not matches:

- 480106 — Laconia Defense Technologies / ORG-015 — Spartan Stack Technologies
- 480106 — Laconia Defense Technologies / 480115 — Spartan Stack Technologies
- 480115 — Spartan Stack Technologies / ORG-006 — Laconia Defense Technologies
- ORG-006 — Laconia Defense Technologies / ORG-015 — Spartan Stack Technologies

These are separate companies as their similarity score is high enough to reach the queue but they should not be merged.

### People: should match

#### Same-email Handshake / Salesforce pairs

These are the same people across Handshake and Salesforce. Their names and normalized emails match so the matcher auto-accepts them.

- 7100039 — Kevin Bogue / PER-0004 — Kevin Bogue
- 7100416 — Tyrone Bogue / PER-0128 — Tyrone Bogue
- 7100052 — Jordan McDonel / PER-0008 — Jordan McDonel
- 7100533 — Todd McDonel / PER-0209 — Todd McDonel
- 7100559 — Todd McDonel / PER-0209 — Todd McDonel
- 7100117 — Aisha Trowbridge / PER-0025 — Aisha Trowbridge
- 7100143 — Nicole Williamston / PER-0041 — Nicole Williamston
- 7100676 — Kiara Eaton / PER-0267 — Kiara Eaton
- 7100741 — Marco Eaton / PER-0287 — Marco Eaton
- 7100182 — Ethan Fee / PER-0042 — Ethan Fee
- 7100195 — Tyler Owen / PER-0044 — Tyler Owen
- 7100208 — Kevin Cole / PER-0047 — Kevin Cole
- 7100221 — Rick Campbell / PER-0060 — Rick Campbell
- 7100689 — Jorge Campbell / PER-0264 — Jorge Campbell
- 7100624 — Dale Perry / PER-0243 — Dale Perry
- 7100247 — Jake Wilson / PER-0063 — Jake Wilson
- 7100260 — Craig Williams / PER-0081 — Craig Williams
- 7100273 — Alyssa Kobs / PER-0084 — Alyssa Kobs
- 7100312 — Ian Chestnut / PER-0103 — Ian Chestnut
- 7100325 — Michelle Pasant / PER-0120 — Michelle Pasant
- 7100715 — Arjun Baker / PER-0282 — Arjun Baker
- 7100403 — David Haslett / PER-0121 — David Haslett
- 7100442 — Jamal Yakeley / PER-0144 — Jamal Yakeley
- 7100637 — Ana Yakeley / PER-0246 — Ana Yakeley
- 7100468 — Tessa Wills / PER-0163 — Tessa Wills
- 7100481 — Deon Eppley / PER-0167 — Deon Eppley
- 7100728 — Zach Holt / PER-0284 — Zach Holt
- 7100546 — Kenji Armstrong / PER-0203 — Kenji Armstrong
- 7100650 — Gavin Armstrong / PER-0244 — Gavin Armstrong
- 7100572 — Jalen Rather / PER-0206 — Jalen Rather
- 7100598 — Felix Cowles / PER-0226 — Felix Cowles
- 7100611 — Maya Hubbard / PER-0227 — Maya Hubbard
- 7100663 — Priscilla Hagadorn / PER-0262 — Priscilla Hagadorn

#### 7100507 — Brandon Cole / PER-0180 — Brandon Cole

These are the same person as their emails use different company domains but their names and class years match so the matcher sends the pair to review.

#### 7100520 — Colin Abbot / PER-0185 — Colin Abbot

These are the same person as their emails use different company domains but their names and class years match so the matcher sends the pair to review.

#### 7100533 — Todd McDonel / 7100559 — Todd McDonel / PER-0209 — Todd McDonel

All three records are the same person. Handshake contains the same recruiter twice and both Handshake records also match the Salesforce record.

### Known miss

#### 7100013 — Tom Berkey / 7100091 — Tom Berkey

These are probably the same person who moved companies. Their names match but their email addresses differ,so the matcher currently rejects the pair. A planned improvement is to compare the part of the email before the `@`.

## 4. Open items

### Stale employer

#### 7100273 — Alyssa Kobs / PER-0084 — Alyssa Kobs

These are the same person and the matcher correctly matches them. Alyssa's TDS employer information is out of date so the duplicate is correct even though the employer data is stale.

### GRA Inc. / Grand River Automotive

#### 480102 — Grand River Automotive / ORG-002 — Grand River Automotive / ORG-019 — GRA Inc.

These records represent the same company. `GRA` is an acronym for `Grand River Automotive`, but the acronym match is intentionally left in the queue for a person to review. Both `480102 / ORG-019` and `ORG-002 / ORG-019` are waiting for that decision.

Source: Bob's `README.md`, **Known data issues**.