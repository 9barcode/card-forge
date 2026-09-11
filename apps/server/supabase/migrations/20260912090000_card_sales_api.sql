-- Sell 1-5 owned cards atomically while preserving the documented three-table model.
ALTER TABLE public.users
  ADD COLUMN card_sale_request_receipts jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(card_sale_request_receipts) = 'object');

CREATE OR REPLACE FUNCTION public.sell_game_cards(
  p_user_id bigint,
  p_request_id text,
  p_user_card_ids bigint[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_requested_count integer;
  v_owned_count integer;
  v_remaining_count integer;
  v_reward bigint;
  v_result jsonb;
  v_used_today integer;
BEGIN
  IF p_request_id !~ '^[A-Za-z0-9._:-]{8,100}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  v_requested_count := COALESCE(array_length(p_user_card_ids, 1), 0);
  IF v_requested_count < 1 OR v_requested_count > 5 THEN
    RAISE EXCEPTION 'INVALID_CARD_IDS';
  END IF;
  IF (SELECT count(DISTINCT id) FROM unnest(p_user_card_ids) AS selected(id))
      <> v_requested_count THEN
    RAISE EXCEPTION 'INVALID_CARD_IDS';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  IF v_user.card_sale_request_receipts ? p_request_id THEN
    RETURN (v_user.card_sale_request_receipts -> p_request_id)
      || jsonb_build_object('replayed', true);
  END IF;

  PERFORM 1
  FROM public.user_cards
  WHERE user_id = p_user_id AND id = ANY(p_user_card_ids)
  FOR UPDATE;

  SELECT count(*)::integer,
         COALESCE(sum(
           CASE c.rarity
             WHEN 'NORMAL' THEN 10000
             WHEN 'MAGIC' THEN 20000
             WHEN 'RARE' THEN 30000
             WHEN 'SUPER_RARE' THEN 50000
             WHEN 'UNIQUE' THEN 70000
             WHEN 'LEGENDARY' THEN 100000
             ELSE 0
           END * uc.enhancement_level
         ), 0)::bigint
  INTO v_owned_count, v_reward
  FROM public.user_cards AS uc
  JOIN public.cards AS c ON c.id = uc.card_id
  WHERE uc.user_id = p_user_id
    AND uc.id = ANY(p_user_card_ids);

  IF v_owned_count <> v_requested_count THEN RAISE EXCEPTION 'CARD_NOT_FOUND'; END IF;

  DELETE FROM public.user_cards
  WHERE user_id = p_user_id AND id = ANY(p_user_card_ids);

  SELECT count(*)::integer INTO v_remaining_count
  FROM public.user_cards
  WHERE user_id = p_user_id;

  v_used_today := CASE
    WHEN v_user.pack_opened_on = current_date THEN v_user.pack_open_count
    ELSE 0
  END;

  v_result := jsonb_build_object(
    'soldCardIds', to_jsonb(ARRAY(
      SELECT id::text FROM unnest(p_user_card_ids) AS selected(id) ORDER BY id
    )),
    'crystalReward', v_reward::text,
    'crystalBalance', (v_user.crystal_balance + v_reward)::text,
    'packAvailability', jsonb_build_object(
      'packType', 'AD',
      'dailyLimit', 20,
      'usedToday', v_used_today,
      'remainingToday', 20 - v_used_today,
      'ownedCardCount', v_remaining_count,
      'storageCapacity', 5,
      'storageFull', v_remaining_count >= 5,
      'nextResetAt', ((current_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')::text
    ),
    'replayed', false
  );

  UPDATE public.users
  SET crystal_balance = crystal_balance + v_reward,
      total_crystals_earned = total_crystals_earned + v_reward,
      card_sale_request_receipts =
        card_sale_request_receipts || jsonb_build_object(p_request_id, v_result)
  WHERE id = p_user_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.sell_game_cards(bigint, text, bigint[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sell_game_cards(bigint, text, bigint[])
  TO service_role;
