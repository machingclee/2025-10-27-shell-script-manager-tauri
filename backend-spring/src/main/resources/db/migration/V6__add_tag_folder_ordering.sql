-- Stored position for tag folders, matching scripts_folder.ordering.
-- Existing rows keep their current name order.

ALTER TABLE tag_folder ADD COLUMN IF NOT EXISTS ordering INT NOT NULL DEFAULT 0;

UPDATE tag_folder
SET ordering = (
    SELECT COUNT(*)
    FROM tag_folder older
    WHERE LOWER(older.name) < LOWER(tag_folder.name)
       OR (LOWER(older.name) = LOWER(tag_folder.name) AND older.id < tag_folder.id)
);
