ALTER TABLE public.users
  ADD COLUMN crystal_balance bigint NOT NULL DEFAULT 0 CONSTRAINT users_crystal_balance_nonnegative CHECK (crystal_balance >= 0),
  ADD COLUMN total_crystals_earned bigint NOT NULL DEFAULT 0 CONSTRAINT users_total_crystals_earned_nonnegative CHECK (total_crystals_earned >= 0);
COMMENT ON COLUMN public.users.crystal_balance IS '현재 보유 결정 수. 획득 시 증가하고 사용 시 감소한다.';
COMMENT ON COLUMN public.users.total_crystals_earned IS '가입 이후 누적 획득 결정 수. 결정 사용 시 감소하지 않는다.';;
