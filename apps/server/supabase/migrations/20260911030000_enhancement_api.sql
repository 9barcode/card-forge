-- Atomic V2 enhancement while preserving the documented three-table model.
ALTER TABLE public.user_cards
  ADD COLUMN status text NOT NULL DEFAULT 'ENHANCEABLE'
    CHECK (status IN ('ENHANCEABLE', 'ENHANCEMENT_LOCKED', 'MAX_LEVEL')),
  ADD COLUMN enhancement_request_receipts jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(enhancement_request_receipts) = 'object');

UPDATE public.user_cards
SET enhancement_level = 1
WHERE enhancement_level = 0;

UPDATE public.user_cards
SET status = 'MAX_LEVEL'
WHERE enhancement_level >= 10;

ALTER TABLE public.user_cards
  ADD CONSTRAINT user_cards_enhancement_level_v2_check
  CHECK (enhancement_level BETWEEN 1 AND 10);

CREATE OR REPLACE FUNCTION public.enhance_game_card(
  p_user_id bigint,
  p_request_id text,
  p_user_card_id bigint,
  p_expected_level integer,
  p_success boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_card public.user_cards%ROWTYPE;
  v_card public.cards%ROWTYPE;
  v_result jsonb;
  v_result_name text;
BEGIN
  IF p_request_id !~ '^[A-Za-z0-9._:-]{8,100}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  SELECT * INTO v_user_card
  FROM public.user_cards
  WHERE id = p_user_card_id AND user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_NOT_FOUND'; END IF;

  IF v_user_card.enhancement_request_receipts ? p_request_id THEN
    RETURN (v_user_card.enhancement_request_receipts -> p_request_id)
      || jsonb_build_object('replayed', true);
  END IF;
  IF v_user_card.enhancement_level <> p_expected_level THEN
    RAISE EXCEPTION 'ENHANCEMENT_STATE_CHANGED';
  END IF;
  IF v_user_card.status = 'ENHANCEMENT_LOCKED' THEN
    RAISE EXCEPTION 'ENHANCEMENT_PERMANENTLY_LOCKED';
  END IF;
  IF v_user_card.status = 'MAX_LEVEL' OR v_user_card.enhancement_level >= 10 THEN
    RAISE EXCEPTION 'MAX_ENHANCEMENT_LEVEL';
  END IF;

  IF p_success THEN
    UPDATE public.user_cards
    SET enhancement_level = enhancement_level + 1,
        status = CASE
          WHEN enhancement_level + 1 >= 10 THEN 'MAX_LEVEL'
          ELSE 'ENHANCEABLE'
        END
    WHERE id = p_user_card_id
    RETURNING * INTO v_user_card;
    v_result_name := 'SUCCESS';
  ELSE
    UPDATE public.user_cards
    SET status = 'ENHANCEMENT_LOCKED'
    WHERE id = p_user_card_id
    RETURNING * INTO v_user_card;
    v_result_name := 'FAILURE';
  END IF;

  SELECT * INTO v_card FROM public.cards WHERE id = v_user_card.card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_TEMPLATE_NOT_FOUND'; END IF;

  v_result := jsonb_build_object(
    'card', jsonb_build_object(
      'cardId', v_user_card.id::text,
      'templateId', v_card.id::text,
      'name', v_card.name,
      'element', v_card.element,
      'grade', v_card.rarity,
      'imageKey', COALESCE(v_card.image_path, ''),
      'enhancementLevel', v_user_card.enhancement_level,
      'status', v_user_card.status,
      'acquiredAt', ''
    ),
    'result', v_result_name,
    'replayed', false
  );

  UPDATE public.user_cards
  SET enhancement_request_receipts =
    enhancement_request_receipts || jsonb_build_object(p_request_id, v_result)
  WHERE id = p_user_card_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_game_inventory(p_user_id bigint)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'userId', u.id::text,
    'crystalBalance', u.crystal_balance::text,
    'totalCrystalsEarned', u.total_crystals_earned::text,
    'cards', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'cardId', uc.id::text,
            'templateId', c.id::text,
            'name', c.name,
            'element', c.element,
            'grade', c.rarity,
            'imageKey', COALESCE(c.image_path, ''),
            'enhancementLevel', uc.enhancement_level,
            'status', uc.status
          ) ORDER BY uc.id
        )
        FROM public.user_cards AS uc
        JOIN public.cards AS c ON c.id = uc.card_id
        WHERE uc.user_id = u.id
      ),
      '[]'::jsonb
    )
  )
  FROM public.users AS u
  WHERE u.id = p_user_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.enhance_game_card(bigint, text, bigint, integer, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enhance_game_card(bigint, text, bigint, integer, boolean)
  TO service_role;
