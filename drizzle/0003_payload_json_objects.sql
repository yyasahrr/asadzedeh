-- 0003: repair payload columns that were stored as JSON *strings*.
--
-- The `postgres` driver applies its jsonb serializer to a parameter that
-- PostgreSQL has already typed as jsonb, so passing an already-stringified
-- value produced `"{\"a\":1}"` instead of `{"a":1}`. Every read went through
-- JSON.parse and happened to work, but no jsonb operator (`->`, `||`, `?`)
-- could see inside the value.
--
-- Application code now binds `::text::jsonb`. This migration unwraps any rows
-- written before that fix. It is idempotent: a row that is already an object
-- is left alone.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT c.table_name
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.column_name = 'payload'
       AND c.data_type = 'jsonb'
  LOOP
    EXECUTE format(
      'UPDATE %I SET payload = (payload #>> ''{}'')::jsonb WHERE jsonb_typeof(payload) = ''string''',
      t
    );
  END LOOP;
END $$;
