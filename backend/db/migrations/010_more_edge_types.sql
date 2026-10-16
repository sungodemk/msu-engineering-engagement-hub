-- migrate:up
ALTER TABLE edges DROP CONSTRAINT chk_edge_type;
ALTER TABLE edges ADD CONSTRAINT chk_edge_type
    CHECK (edge_type IN (
        'employed_by',
        'relationship_owner',
        'part_of',
        'works_with',
        'partner_of'
    ));

-- migrate:down
DELETE FROM edges WHERE edge_type IN ('part_of', 'works_with', 'partner_of');
ALTER TABLE edges DROP CONSTRAINT chk_edge_type;
ALTER TABLE edges ADD CONSTRAINT chk_edge_type
    CHECK (edge_type IN ('employed_by','relationship_owner'));
