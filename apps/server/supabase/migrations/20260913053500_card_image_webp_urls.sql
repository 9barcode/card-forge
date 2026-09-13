alter table public.cards
  drop constraint if exists cards_image_path_storage_key_check;

alter table public.cards
  add constraint cards_image_path_storage_key_check
  check (
    image_path is null
    or (
      image_path like 'cards/%'
      and image_path not like '/%'
      and image_path not like '%..%'
    )
    or image_path ~ '^https://nmbdwukrvwfaxpasbppj[.]supabase[.]co/storage/v1/object/public/images/cards/webp/[a-z0-9_]+[.]webp([?]v=[0-9]+)?$'
  );

do $$
declare
  card_count integer;
  updated_count integer;
begin
  select count(*) into card_count from public.cards;
  if card_count <> 36 then
    raise exception 'Expected 36 cards, found %', card_count;
  end if;

  update public.cards
  set image_path =
    'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/webp/' ||
    regexp_replace(
      regexp_replace(split_part(image_path, '?', 1), '^.*/', ''),
      '\.[^.]+$',
      '.webp'
    ) ||
    '?v=3';

  get diagnostics updated_count = row_count;
  if updated_count <> 36 then
    raise exception 'Expected to update 36 cards, updated %', updated_count;
  end if;
end $$;
