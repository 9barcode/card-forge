-- Start the one-minute pack cooldown when the rewarded-ad button is pressed.
-- The existing daily limit of 20 and storage capacity of 5 are unchanged.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pack_ad_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pack_ad_request_id text;

COMMENT ON COLUMN public.users.pack_ad_started_at IS
  'Server-recorded start time of the latest rewarded ad for card-pack cooldown.';
COMMENT ON COLUMN public.users.pack_ad_request_id IS
  'Request ID linking the latest rewarded ad reservation to its pack opening.';

CREATE OR REPLACE FUNCTION public.reserve_game_pack_ad(
  p_user_id bigint,
  p_request_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user public.users%ROWTYPE;
  v_owned_count integer;
  v_started_at timestamptz;
BEGIN
  IF p_request_id !~ '^[A-Za-z0-9._:-]{8,100}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  IF v_user.pack_ad_request_id = p_request_id
     AND v_user.pack_ad_started_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'startedAt', v_user.pack_ad_started_at,
      'nextAvailableAt', v_user.pack_ad_started_at + interval '1 minute',
      'replayed', true
    );
  END IF;

  IF v_user.pack_ad_started_at IS NOT NULL
     AND now() < v_user.pack_ad_started_at + interval '1 minute' THEN
    RAISE EXCEPTION 'PACK_OPEN_COOLDOWN_ACTIVE';
  END IF;

  IF v_user.pack_opened_on = current_date
     AND v_user.pack_open_count >= 20 THEN
    RAISE EXCEPTION 'DAILY_PACK_LIMIT_REACHED';
  END IF;

  SELECT count(*)::integer INTO v_owned_count
  FROM public.user_cards
  WHERE user_id = p_user_id;
  IF v_owned_count >= 5 THEN RAISE EXCEPTION 'CARD_STORAGE_FULL'; END IF;

  v_started_at := now();
  UPDATE public.users
  SET pack_ad_started_at = v_started_at,
      pack_ad_request_id = p_request_id
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'startedAt', v_started_at,
    'nextAvailableAt', v_started_at + interval '1 minute',
    'replayed', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_game_pack_ad(bigint, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_game_pack_ad(bigint, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.open_game_pack(
  p_user_id bigint,
  p_request_id text,
  p_card_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user public.users%ROWTYPE;
  v_card public.cards%ROWTYPE;
  v_owned_count integer;
  v_user_card_id bigint;
  v_result jsonb;
BEGIN
  IF p_request_id !~ '^[A-Za-z0-9._:-]{8,100}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  IF v_user.pack_opened_on IS DISTINCT FROM current_date THEN
    UPDATE public.users
    SET pack_opened_on = current_date,
        pack_open_count = 0,
        pack_request_receipts = '{}'::jsonb
    WHERE id = p_user_id
    RETURNING * INTO v_user;
  END IF;

  IF v_user.pack_request_receipts ? p_request_id THEN
    RETURN (v_user.pack_request_receipts -> p_request_id)
      || jsonb_build_object('replayed', true);
  END IF;

  IF v_user.pack_ad_request_id IS DISTINCT FROM p_request_id
     OR v_user.pack_ad_started_at IS NULL THEN
    RAISE EXCEPTION 'PACK_AD_RESERVATION_REQUIRED';
  END IF;

  IF now() >= v_user.pack_ad_started_at + interval '10 minutes' THEN
    RAISE EXCEPTION 'PACK_AD_RESERVATION_EXPIRED';
  END IF;

  IF v_user.pack_open_count >= 20 THEN
    RAISE EXCEPTION 'DAILY_PACK_LIMIT_REACHED';
  END IF;

  SELECT count(*)::integer INTO v_owned_count
  FROM public.user_cards
  WHERE user_id = p_user_id;
  IF v_owned_count >= 5 THEN RAISE EXCEPTION 'CARD_STORAGE_FULL'; END IF;

  SELECT * INTO v_card FROM public.cards WHERE id = p_card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_TEMPLATE_NOT_FOUND'; END IF;

  INSERT INTO public.user_cards (user_id, card_id, enhancement_level)
  VALUES (p_user_id, p_card_id, 1)
  RETURNING id INTO v_user_card_id;

  v_owned_count := v_owned_count + 1;
  v_result := jsonb_build_object(
    'card', jsonb_build_object(
      'cardId', v_user_card_id::text,
      'templateId', v_card.id::text,
      'name', v_card.name,
      'element', v_card.element,
      'grade', v_card.rarity,
      'imageKey', COALESCE(v_card.image_path, ''),
      'enhancementLevel', 1,
      'status', 'ENHANCEABLE',
      'acquiredAt', now()::text
    ),
    'packAvailability', jsonb_build_object(
      'packType', 'AD',
      'dailyLimit', 20,
      'usedToday', v_user.pack_open_count + 1,
      'remainingToday', 20 - (v_user.pack_open_count + 1),
      'ownedCardCount', v_owned_count,
      'storageCapacity', 5,
      'storageFull', v_owned_count >= 5,
      'nextResetAt', ((current_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')::text
    ),
    'replayed', false
  );

  UPDATE public.users
  SET pack_open_count = pack_open_count + 1,
      pack_last_opened_at = now(),
      pack_ad_request_id = NULL,
      pack_request_receipts =
        pack_request_receipts || jsonb_build_object(p_request_id, v_result)
  WHERE id = p_user_id;

  RETURN v_result;
END;
$function$;
