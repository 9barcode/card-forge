-- Read one user's wallet and owned cards as one consistent database snapshot.
-- Source of truth: public/docs/데이터베이스_구조.md
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
            'enhancementLevel', uc.enhancement_level
          )
          ORDER BY uc.id
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

REVOKE ALL ON FUNCTION public.get_game_inventory(bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_inventory(bigint) TO service_role;
