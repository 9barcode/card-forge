-- image_path stores an object key inside the public `game-assets` Storage bucket.
UPDATE public.cards
SET image_path = ltrim(image_path, '/')
WHERE image_path LIKE '/%';

ALTER TABLE public.cards
  ADD CONSTRAINT cards_image_path_storage_key_check
  CHECK (
    image_path IS NULL
    OR (
      image_path LIKE 'cards/%'
      AND image_path NOT LIKE '/%'
      AND image_path NOT LIKE '%..%'
    )
  );

COMMENT ON COLUMN public.cards.image_path IS
  'Object key in the public Supabase Storage bucket game-assets, for example cards/flame_knight.png';
