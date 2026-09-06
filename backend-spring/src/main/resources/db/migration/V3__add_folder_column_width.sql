-- Persist the home-screen folder-column ResizablePanel size (percent of the group).
ALTER TABLE application_state
    ADD COLUMN IF NOT EXISTS folder_column_width DOUBLE PRECISION NOT NULL DEFAULT 20;
