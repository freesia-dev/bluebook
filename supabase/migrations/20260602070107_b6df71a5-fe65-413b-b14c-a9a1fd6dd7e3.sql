CREATE OR REPLACE FUNCTION public._seed_alamin_tarif(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH src AS (
    SELECT (x->>0)::int AS umur, (x->>1)::int AS tenor_bulan, (x->>2)::numeric AS rate
    FROM jsonb_array_elements(payload) x
  ),
  ins AS (
    INSERT INTO public.alamin_tarif (umur, tenor_bulan, rate)
    SELECT umur, tenor_bulan, rate FROM src
    ON CONFLICT (umur, tenor_bulan) DO UPDATE SET rate = EXCLUDED.rate
    RETURNING 1
  )
  SELECT count(*) INTO n FROM ins;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public._seed_alamin_tarif(jsonb) TO authenticated, anon;