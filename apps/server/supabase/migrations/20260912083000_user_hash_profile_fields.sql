-- Rename the stored Toss-derived digest and add lightweight user profile fields.
-- The RPC parameter name is intentionally kept for compatibility with the currently deployed Edge Function.

ALTER TABLE public.users RENAME COLUMN toss_user_id TO hash_id;
ALTER TABLE public.users RENAME CONSTRAINT users_toss_user_id_key TO users_hash_id_key;

ALTER TABLE public.users
  ADD COLUMN nickname text NOT NULL DEFAULT '모험가',
  ADD COLUMN characters_card_id bigint;

ALTER TABLE public.users
  ADD CONSTRAINT users_characters_card_id_fkey
  FOREIGN KEY (characters_card_id)
  REFERENCES public.cards(id)
  ON DELETE SET NULL;

DROP FUNCTION IF EXISTS public.initialize_game_user(text);

CREATE FUNCTION public.initialize_game_user(p_toss_user_digest text)
RETURNS TABLE (user_id bigint, is_new_user boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id bigint;
  v_is_new boolean := false;
BEGIN
  IF length(p_toss_user_digest) <> 64 THEN RAISE EXCEPTION 'INVALID_DIGEST'; END IF;

  INSERT INTO public.users (hash_id)
  VALUES (p_toss_user_digest)
  ON CONFLICT (hash_id) DO NOTHING
  RETURNING id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    v_is_new := true;
  ELSE
    SELECT id INTO v_user_id
    FROM public.users
    WHERE hash_id = p_toss_user_digest;
  END IF;

  RETURN QUERY SELECT v_user_id, v_is_new;
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_game_user(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_game_user(text) TO service_role;
