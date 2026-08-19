CREATE OR REPLACE FUNCTION public.get_database_usage()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  c bigint;
  items jsonb := '[]'::jsonb;
  total_rows bigint := 0;
  total_bytes bigint := 0;
  db_bytes bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  FOR r IN
    SELECT c.relname AS tbl, pg_total_relation_size(c.oid) AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.tbl) INTO c;
    total_rows := total_rows + c;
    total_bytes := total_bytes + r.bytes;
    items := items || jsonb_build_object('table', r.tbl, 'rows', c, 'bytes', r.bytes);
  END LOOP;

  SELECT pg_database_size(current_database()) INTO db_bytes;

  RETURN jsonb_build_object(
    'tables', items,
    'total_rows', total_rows,
    'total_table_bytes', total_bytes,
    'database_bytes', db_bytes,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_database_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_database_usage() TO authenticated;