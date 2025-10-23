ALTER TABLE tricks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE tricks
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION set_tricks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'tricks' AND trigger_name = 'tricks_set_updated_at'
  ) THEN
    DROP TRIGGER tricks_set_updated_at ON tricks;
  END IF;
END;
$$;

CREATE TRIGGER tricks_set_updated_at
BEFORE UPDATE ON tricks
FOR EACH ROW
EXECUTE FUNCTION set_tricks_updated_at();
