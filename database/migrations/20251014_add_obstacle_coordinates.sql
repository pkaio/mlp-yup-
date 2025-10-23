-- Add latitude and longitude to obstacles table
ALTER TABLE obstacles
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
