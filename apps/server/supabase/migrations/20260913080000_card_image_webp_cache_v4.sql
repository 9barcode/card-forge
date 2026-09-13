do $$
declare
  eligible_count integer;
  updated_count integer;
begin
  select count(*) into eligible_count
  from public.cards
  where image_path ~ '^https://nmbdwukrvwfaxpasbppj[.]supabase[.]co/storage/v1/object/public/images/cards/webp/[a-z0-9_]+[.]webp([?]v=[0-9]+)?$';

  if eligible_count <> 36 then
    raise exception 'Expected 36 valid WebP card URLs, found %', eligible_count;
  end if;

  update public.cards
  set image_path =
    regexp_replace(image_path, '[?]v=[0-9]+$', '') || '?v=4'
  where image_path ~ '^https://nmbdwukrvwfaxpasbppj[.]supabase[.]co/storage/v1/object/public/images/cards/webp/[a-z0-9_]+[.]webp([?]v=[0-9]+)?$';

  get diagnostics updated_count = row_count;
  if updated_count <> 36 then
    raise exception 'Expected to update 36 card URLs, updated %', updated_count;
  end if;
end $$;
