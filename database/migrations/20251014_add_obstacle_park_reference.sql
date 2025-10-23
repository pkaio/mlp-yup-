-- Associate obstacles with parks
ALTER TABLE obstacles
  ADD COLUMN IF NOT EXISTS park_id UUID REFERENCES parks(id) ON DELETE SET NULL;
