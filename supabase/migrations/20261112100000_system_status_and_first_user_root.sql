-- Migration: 20261112100000_system_status_and_first_user_root.sql
-- 1. Auto-assign root role to the first registered user
-- 2. Provide get_system_status RPC for template onboarding diagnostics

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_count integer;
  v_role text;
BEGIN
  -- Automatically assign root permissions to the first user in the database
  SELECT count(*) INTO v_admin_count FROM public.profiles WHERE user_type IN ('admin', 'root');
  IF v_admin_count = 0 THEN
    v_role := 'root';
  ELSE
    v_role := 'user';
  END IF;

  INSERT INTO public.profiles (id, username, user_type)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    username = coalesce(EXCLUDED.username, profiles.username)
    WHERE profiles.user_type IS NULL;

  RETURN NEW;
END;
$function$
;

-- Trigger on auth.users for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- System status check for template onboarding
CREATE OR REPLACE FUNCTION public.get_system_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_admin_count integer := 0;
  v_library_count integer := 0;
  v_covers_bucket boolean := false;
  v_audio_bucket boolean := false;
BEGIN
  -- Count active administrators
  SELECT count(*) INTO v_admin_count FROM public.profiles WHERE user_type IN ('admin', 'root');
  -- Count libraries
  SELECT count(*) INTO v_library_count FROM public.libraries;
  -- Check storage buckets
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'covers') INTO v_covers_bucket;
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'audio-files') INTO v_audio_bucket;

  RETURN jsonb_build_object(
    'initialized', true,
    'has_admin', (v_admin_count > 0),
    'admin_count', v_admin_count,
    'library_count', v_library_count,
    'storage_ready', (v_covers_bucket AND v_audio_bucket)
  );
END;
$function$
;

REVOKE ALL ON FUNCTION public.get_system_status() FROM public;
GRANT EXECUTE ON FUNCTION public.get_system_status() TO anon, authenticated, service_role;
