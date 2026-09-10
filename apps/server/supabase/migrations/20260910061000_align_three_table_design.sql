-- Align with public/docs/데이터베이스_구조.md: only three tables remain.
DROP FUNCTION IF EXISTS public.initialize_user_session(text, text, timestamptz);
DROP FUNCTION IF EXISTS public.find_user_by_session(text);
DROP FUNCTION IF EXISTS public.update_user_display_name(text, text);
DROP FUNCTION IF EXISTS public.revoke_user_session(text);
DROP TABLE IF EXISTS public.user_sessions;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS display_name,
  DROP COLUMN IF EXISTS account_status,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS last_signed_in_at,
  ADD COLUMN IF NOT EXISTS crystal_balance bigint NOT NULL DEFAULT 0
    CHECK (crystal_balance >= 0),
  ADD COLUMN IF NOT EXISTS total_crystals_earned bigint NOT NULL DEFAULT 0
    CHECK (total_crystals_earned >= 0);

CREATE OR REPLACE FUNCTION public.initialize_game_user(p_toss_user_digest text)
RETURNS TABLE (user_id bigint, is_new_user boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id bigint;
  v_is_new boolean := false;
BEGIN
  IF length(p_toss_user_digest) <> 64 THEN RAISE EXCEPTION 'INVALID_DIGEST'; END IF;
  INSERT INTO public.users (toss_user_id) VALUES (p_toss_user_digest)
  ON CONFLICT (toss_user_id) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    v_is_new := true;
  ELSE
    SELECT id INTO v_user_id FROM public.users WHERE toss_user_id = p_toss_user_digest;
  END IF;
  RETURN QUERY SELECT v_user_id, v_is_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_game_user(p_user_id bigint)
RETURNS TABLE (user_id bigint)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT id FROM public.users WHERE id = p_user_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.initialize_game_user(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_game_user(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_game_user(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_game_user(bigint) TO service_role;
