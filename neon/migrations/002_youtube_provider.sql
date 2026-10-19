-- ------------------------------------------------------------------------------
-- 002_youtube_provider.sql: Update provider constraints for YouTube
-- ------------------------------------------------------------------------------

-- Update playback_state provider_id check constraint
ALTER TABLE public.playback_state 
  DROP CONSTRAINT IF EXISTS playback_state_provider_id_check;

ALTER TABLE public.playback_state 
  ADD CONSTRAINT playback_state_provider_id_check 
  CHECK (provider_id IN ('audius', 'youtube'));

-- Update queue_items provider_id check constraint
ALTER TABLE public.queue_items 
  DROP CONSTRAINT IF EXISTS queue_items_provider_id_check;

ALTER TABLE public.queue_items 
  ADD CONSTRAINT queue_items_provider_id_check 
  CHECK (provider_id IN ('audius', 'youtube'));
