
ALTER TABLE public.cerdas_config
  DROP COLUMN IF EXISTS cap_tier_1,
  DROP COLUMN IF EXISTS cap_tier_2,
  DROP COLUMN IF EXISTS cap_tier_3,
  DROP COLUMN IF EXISTS plafon_tier_1_max,
  DROP COLUMN IF EXISTS plafon_tier_2_max,
  DROP COLUMN IF EXISTS plafon_tier_3_max;

ALTER TABLE public.cerdas_config
  ADD COLUMN plafon_tier_1_max bigint NOT NULL DEFAULT 75000000,
  ADD COLUMN plafon_tier_2_max bigint NOT NULL DEFAULT 150000000,
  ADD COLUMN plafon_tier_3_max bigint NOT NULL DEFAULT 300000000,
  ADD COLUMN cap_tier_1_baru bigint NOT NULL DEFAULT 1400000,
  ADD COLUMN cap_tier_2_baru bigint NOT NULL DEFAULT 2300000,
  ADD COLUMN cap_tier_3_baru bigint NOT NULL DEFAULT 5000000,
  ADD COLUMN cap_tier_4_baru bigint NOT NULL DEFAULT 10000000,
  ADD COLUMN cap_tier_1_takeover bigint NOT NULL DEFAULT 1800000,
  ADD COLUMN cap_tier_2_takeover bigint NOT NULL DEFAULT 3000000,
  ADD COLUMN cap_tier_3_takeover bigint NOT NULL DEFAULT 6500000,
  ADD COLUMN cap_tier_4_takeover bigint NOT NULL DEFAULT 12000000;
