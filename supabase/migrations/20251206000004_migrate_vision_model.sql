-- Migrate vision_model to settings if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dida_master_user_config' AND column_name = 'vision_model') THEN
        UPDATE public.dida_master_user_config
        SET settings = settings || jsonb_build_object('vision_model', vision_model)
        WHERE vision_model IS NOT NULL;
    END IF;
END $$;

-- Drop the vision_model column
ALTER TABLE public.dida_master_user_config
DROP COLUMN IF EXISTS vision_model;
