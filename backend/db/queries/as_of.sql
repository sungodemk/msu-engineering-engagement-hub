-- People employed at Halverson Motor Company on 2021-06-01
SELECT
    person.display_name,
    e.edge_role,
    e.valid_from,
    e.valid_to
FROM edges e
JOIN entities person
    ON person.id = e.from_entity_id
JOIN entities company
    ON company.id = e.to_entity_id
WHERE e.edge_type = 'employed_by'
  AND company.display_name = 'Halverson Motor Company'
  AND e.valid_from <= DATE '2021-06-01'
  AND (e.valid_to IS NULL OR e.valid_to > DATE '2021-06-01')
ORDER BY person.display_name;


-- People employed at Halverson Motor Company on 2026-01-01
SELECT
    person.display_name,
    e.edge_role,
    e.valid_from,
    e.valid_to
FROM edges e
JOIN entities person
    ON person.id = e.from_entity_id
JOIN entities company
    ON company.id = e.to_entity_id
WHERE e.edge_type = 'employed_by'
  AND company.display_name = 'Halverson Motor Company'
  AND e.valid_from <= DATE '2026-01-01'
  AND (e.valid_to IS NULL OR e.valid_to > DATE '2026-01-01')
ORDER BY person.display_name;