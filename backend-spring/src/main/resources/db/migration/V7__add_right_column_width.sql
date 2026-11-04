-- Shared pixel width of the history, log, and search column.
ALTER TABLE application_state
    ADD COLUMN IF NOT EXISTS right_column_width DOUBLE PRECISION NOT NULL DEFAULT 350;
