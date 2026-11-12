-- =============================================================================
-- Audiobookphile — Supabase Database Schema (Complete Template Bootstrap)
-- =============================================================================

-- --- SECTION: 01_extensions.sql ---

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;



-- --- SECTION: 02_schema.sql ---

-- Table DDL for public schema
SET check_function_bodies = false;

CREATE TABLE IF NOT EXISTS public."_backup_books_v1" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "published_year" TEXT,
    "published_date" TEXT,
    "publisher" TEXT,
    "description" TEXT,
    "isbn" TEXT,
    "asin" TEXT,
    "language" TEXT,
    "explicit" BOOLEAN DEFAULT false,
    "abridged" BOOLEAN DEFAULT false,
    "cover_path" TEXT,
    "narrators" JSONB DEFAULT '[]'::jsonb,
    "audio_files" JSONB DEFAULT '[]'::jsonb,
    "ebook_file" JSONB,
    "chapters" JSONB DEFAULT '[]'::jsonb,
    "tags" JSONB DEFAULT '[]'::jsonb,
    "genres" JSONB DEFAULT '[]'::jsonb,
    "duration" DOUBLE PRECISION DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "_backup_books_v1_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."authors" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "last_first" TEXT,
    "asin" TEXT,
    "description" TEXT,
    "image_path" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "library_id" UUID,
    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."book_authors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "library_item_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT "book_authors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."book_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "book_id" TEXT NOT NULL,
    "book_title" TEXT NOT NULL,
    "book_author" TEXT,
    "summary" TEXT NOT NULL,
    "key_takeaways" text[] NOT NULL DEFAULT '{}'::text[],
    "mood" TEXT NOT NULL DEFAULT 'Reflective'::text,
    "themes" text[] NOT NULL DEFAULT '{}'::text[],
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "book_insights_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."book_series" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence" TEXT,
    "library_item_id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT "book_series_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."collection_items" (
    "id" UUID NOT NULL,
    "order" INTEGER,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "library_item_id" UUID,
    "collection_id" UUID,
    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."collections" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "library_id" UUID,
    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."custom_metadata_providers" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "media_type" TEXT,
    "url" TEXT,
    "auth_header_value" TEXT,
    "extra_data" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "custom_metadata_providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."devices" (
    "id" UUID NOT NULL,
    "device_id" TEXT,
    "client_name" TEXT,
    "client_version" TEXT,
    "ip_address" TEXT,
    "device_name" TEXT,
    "device_version" TEXT,
    "extra_data" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" UUID,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."feed_episodes" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "description" TEXT,
    "site_url" TEXT,
    "enclosure_url" TEXT,
    "enclosure_type" TEXT,
    "enclosure_size" BIGINT,
    "pub_date" TEXT,
    "season" TEXT,
    "episode" TEXT,
    "episode_type" TEXT,
    "duration" DOUBLE PRECISION,
    "file_path" TEXT,
    "explicit" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "feed_id" UUID,
    CONSTRAINT "feed_episodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."feeds" (
    "id" UUID NOT NULL,
    "slug" TEXT,
    "entity_type" TEXT,
    "entity_id" UUID,
    "entity_updated_at" TIMESTAMP WITH TIME ZONE,
    "server_address" TEXT,
    "feed_url" TEXT,
    "image_url" TEXT,
    "site_url" TEXT,
    "title" TEXT,
    "description" TEXT,
    "author" TEXT,
    "podcast_type" TEXT,
    "language" TEXT,
    "owner_name" TEXT,
    "owner_email" TEXT,
    "explicit" BOOLEAN DEFAULT false,
    "prevent_indexing" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" UUID,
    "cover_path" TEXT,
    CONSTRAINT "feeds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."legacy_users" (
    "id" UUID NOT NULL,
    "username" TEXT,
    "user_type" TEXT DEFAULT 'user'::text,
    "is_active" BOOLEAN DEFAULT true,
    "permissions" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "legacy_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."libraries" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER DEFAULT 0,
    "icon" TEXT,
    "media_type" TEXT,
    "provider" TEXT,
    "settings" JSONB DEFAULT '{}'::jsonb,
    "extra_data" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "libraries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."library_folders" (
    "id" UUID NOT NULL,
    "path" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "library_id" UUID,
    CONSTRAINT "library_folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."library_item_deletion_audit" (
    "id" BIGINT NOT NULL,
    "item_id" UUID NOT NULL,
    "title" TEXT,
    "path" TEXT,
    "media_id" UUID,
    "audio_count" INTEGER,
    "deleted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "deleted_by" TEXT NOT NULL DEFAULT CURRENT_USER,
    CONSTRAINT "library_item_deletion_audit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."library_item_merge_audit" (
    "id" BIGINT NOT NULL,
    "primary_id" UUID NOT NULL,
    "primary_title" TEXT,
    "dup_id" UUID NOT NULL,
    "dup_title" TEXT,
    "pass" INTEGER,
    "reason" TEXT,
    "audio_files_before" JSONB,
    "deleted_by" TEXT NOT NULL DEFAULT CURRENT_USER,
    "merged_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "library_item_merge_audit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."library_items" (
    "id" UUID NOT NULL,
    "ino" TEXT,
    "path" TEXT,
    "rel_path" TEXT,
    "media_id" UUID,
    "media_type" TEXT,
    "is_file" BOOLEAN DEFAULT false,
    "is_missing" BOOLEAN DEFAULT false,
    "is_invalid" BOOLEAN DEFAULT false,
    "mtime" TIMESTAMP WITH TIME ZONE,
    "ctime" TIMESTAMP WITH TIME ZONE,
    "birthtime" TIMESTAMP WITH TIME ZONE,
    "last_scan" TIMESTAMP WITH TIME ZONE,
    "last_scan_version" TEXT,
    "library_files" JSONB DEFAULT '[]'::jsonb,
    "extra_data" JSONB DEFAULT '{}'::jsonb,
    "size" BIGINT DEFAULT 0,
    "title" TEXT,
    "title_ignore_prefix" TEXT,
    "author_names_first_last" TEXT,
    "author_names_last_first" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "library_id" UUID,
    "cover_path" TEXT,
    "last_storage_check" TIMESTAMP WITH TIME ZONE,
    "abridged" BOOLEAN,
    "asin" TEXT,
    "audio_files" JSONB,
    "chapters" JSONB,
    "description" TEXT,
    "duration" NUMERIC,
    "ebook_file" JSONB,
    "explicit" BOOLEAN,
    "genres" JSONB,
    "isbn" TEXT,
    "language" TEXT,
    "narrators" JSONB,
    "published_date" TEXT,
    "published_year" TEXT,
    "publisher" TEXT,
    "subtitle" TEXT,
    "tags" JSONB,
    "embedding" vector,
    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."media_item_shares" (
    "id" UUID NOT NULL,
    "media_item_id" UUID,
    "media_item_type" TEXT,
    "slug" TEXT,
    "pash" TEXT,
    "expires_at" TIMESTAMP WITH TIME ZONE,
    "extra_data" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" UUID,
    "is_downloadable" BOOLEAN DEFAULT false,
    CONSTRAINT "media_item_shares_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."media_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "library_item_id" UUID NOT NULL,
    "episode_id" UUID,
    "duration" DOUBLE PRECISION DEFAULT 0,
    "progress" DOUBLE PRECISION DEFAULT 0,
    "current_time_pos" DOUBLE PRECISION DEFAULT 0,
    "is_finished" BOOLEAN DEFAULT false,
    "last_update" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "hide_from_continue_listening" BOOLEAN NOT NULL DEFAULT false,
    "finished_at" TIMESTAMP WITH TIME ZONE,
    "started_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT "media_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."migrations_meta" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    CONSTRAINT "migrations_meta_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS public."playback_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "library_id" UUID,
    "media_item_id" UUID,
    "media_item_type" TEXT,
    "display_title" TEXT,
    "display_author" TEXT,
    "duration" DOUBLE PRECISION,
    "play_method" INTEGER,
    "media_player" TEXT,
    "start_time_pos" DOUBLE PRECISION,
    "current_time_pos" DOUBLE PRECISION,
    "server_version" TEXT,
    "cover_path" TEXT,
    "time_listening" INTEGER,
    "media_metadata" JSONB DEFAULT '{}'::jsonb,
    "session_date" TEXT,
    "day_of_week" TEXT,
    "extra_data" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "playback_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."playlist_media_items" (
    "id" UUID NOT NULL,
    "media_item_id" UUID,
    "media_item_type" TEXT,
    "order" INTEGER,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "playlist_id" UUID,
    CONSTRAINT "playlist_media_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."playlists" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "library_id" UUID,
    "user_id" UUID,
    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."podcast_episodes" (
    "id" UUID NOT NULL,
    "index" INTEGER,
    "season" TEXT,
    "episode" TEXT,
    "episode_type" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "pub_date" TEXT,
    "enclosure_url" TEXT,
    "enclosure_size" BIGINT,
    "enclosure_type" TEXT,
    "published_at" TIMESTAMP WITH TIME ZONE,
    "audio_file" JSONB DEFAULT '{}'::jsonb,
    "chapters" JSONB DEFAULT '[]'::jsonb,
    "extra_data" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "podcast_id" UUID,
    CONSTRAINT "podcast_episodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."podcasts" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "release_date" TEXT,
    "feed_url" TEXT,
    "image_url" TEXT,
    "description" TEXT,
    "itunes_page_url" TEXT,
    "itunes_id" TEXT,
    "itunes_artist_id" TEXT,
    "language" TEXT,
    "podcast_type" TEXT,
    "explicit" BOOLEAN DEFAULT false,
    "auto_download_episodes" BOOLEAN DEFAULT false,
    "auto_download_schedule" TEXT,
    "last_episode_check" TIMESTAMP WITH TIME ZONE,
    "max_episodes_to_keep" INTEGER,
    "max_new_episodes_to_download" INTEGER,
    "cover_path" TEXT,
    "tags" JSONB DEFAULT '[]'::jsonb,
    "genres" JSONB DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "title_ignore_prefix" TEXT,
    "num_episodes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "podcasts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."profiles" (
    "id" UUID NOT NULL,
    "username" TEXT,
    "user_type" TEXT DEFAULT 'user'::text,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "language" TEXT DEFAULT 'en-US'::text,
    "theme" TEXT DEFAULT 'dark'::text,
    "default_library_id" UUID,
    "is_2fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_secret" TEXT,
    "pin_code_hash" TEXT,
    "biometric_enrolled" BOOLEAN NOT NULL DEFAULT false,
    "biometric_device_id" TEXT,
    "two_factor_methods" text[] DEFAULT '{}'::text[],
    "two_factor_failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "two_factor_locked_until" TIMESTAMP WITH TIME ZONE,
    "two_factor_challenge_nonce" TEXT,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."search_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."sequelize_meta" (
    "name" TEXT NOT NULL,
    CONSTRAINT "sequelize_meta_pkey" PRIMARY KEY ("name")
);

CREATE TABLE IF NOT EXISTS public."series" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "name_ignore_prefix" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "library_id" UUID,
    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."server_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "server_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS public."webauthn_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "challenge" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'register'::text,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."webauthn_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" text[] NOT NULL DEFAULT '{}'::text[],
    "device_name" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "last_used_at" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);




-- --- SECTION: 03_foreign_keys.sql ---

-- Foreign Key Constraints
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_authors_author_id_fkey') THEN
        ALTER TABLE public."book_authors" 
        ADD CONSTRAINT "book_authors_author_id_fkey" 
        FOREIGN KEY ("author_id") 
        REFERENCES public."authors" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'series_library_id_fkey') THEN
        ALTER TABLE public."series" 
        ADD CONSTRAINT "series_library_id_fkey" 
        FOREIGN KEY ("library_id") 
        REFERENCES public."libraries" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_series_series_id_fkey') THEN
        ALTER TABLE public."book_series" 
        ADD CONSTRAINT "book_series_series_id_fkey" 
        FOREIGN KEY ("series_id") 
        REFERENCES public."series" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playback_sessions_library_id_fkey') THEN
        ALTER TABLE public."playback_sessions" 
        ADD CONSTRAINT "playback_sessions_library_id_fkey" 
        FOREIGN KEY ("library_id") 
        REFERENCES public."libraries" ("id") 
        ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_folders_library_id_fkey') THEN
        ALTER TABLE public."library_folders" 
        ADD CONSTRAINT "library_folders_library_id_fkey" 
        FOREIGN KEY ("library_id") 
        REFERENCES public."libraries" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'podcast_episodes_podcast_id_fkey') THEN
        ALTER TABLE public."podcast_episodes" 
        ADD CONSTRAINT "podcast_episodes_podcast_id_fkey" 
        FOREIGN KEY ("podcast_id") 
        REFERENCES public."podcasts" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collections_library_id_fkey') THEN
        ALTER TABLE public."collections" 
        ADD CONSTRAINT "collections_library_id_fkey" 
        FOREIGN KEY ("library_id") 
        REFERENCES public."libraries" ("id") 
        ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_books_collection_id_fkey') THEN
        ALTER TABLE public."collection_items" 
        ADD CONSTRAINT "collection_books_collection_id_fkey" 
        FOREIGN KEY ("collection_id") 
        REFERENCES public."collections" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlists_library_id_fkey') THEN
        ALTER TABLE public."playlists" 
        ADD CONSTRAINT "playlists_library_id_fkey" 
        FOREIGN KEY ("library_id") 
        REFERENCES public."libraries" ("id") 
        ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_episodes_feed_id_fkey') THEN
        ALTER TABLE public."feed_episodes" 
        ADD CONSTRAINT "feed_episodes_feed_id_fkey" 
        FOREIGN KEY ("feed_id") 
        REFERENCES public."feeds" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlist_media_items_playlist_id_fkey') THEN
        ALTER TABLE public."playlist_media_items" 
        ADD CONSTRAINT "playlist_media_items_playlist_id_fkey" 
        FOREIGN KEY ("playlist_id") 
        REFERENCES public."playlists" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_default_library_id_fkey') THEN
        ALTER TABLE public."profiles" 
        ADD CONSTRAINT "profiles_default_library_id_fkey" 
        FOREIGN KEY ("default_library_id") 
        REFERENCES public."libraries" ("id") 
        ON UPDATE NO ACTION ON DELETE NO ACTION;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_progress_library_item_id_fkey') THEN
        ALTER TABLE public."media_progress" 
        ADD CONSTRAINT "media_progress_library_item_id_fkey" 
        FOREIGN KEY ("library_item_id") 
        REFERENCES public."library_items" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_items_library_item_id_fkey') THEN
        ALTER TABLE public."collection_items" 
        ADD CONSTRAINT "collection_items_library_item_id_fkey" 
        FOREIGN KEY ("library_item_id") 
        REFERENCES public."library_items" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_series_library_item_id_fkey') THEN
        ALTER TABLE public."book_series" 
        ADD CONSTRAINT "book_series_library_item_id_fkey" 
        FOREIGN KEY ("library_item_id") 
        REFERENCES public."library_items" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_authors_library_item_id_fkey') THEN
        ALTER TABLE public."book_authors" 
        ADD CONSTRAINT "book_authors_library_item_id_fkey" 
        FOREIGN KEY ("library_item_id") 
        REFERENCES public."library_items" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_items_library_id_fkey') THEN
        ALTER TABLE public."library_items" 
        ADD CONSTRAINT "library_items_library_id_fkey" 
        FOREIGN KEY ("library_id") 
        REFERENCES public."libraries" ("id") 
        ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authors_library_id_fkey') THEN
        ALTER TABLE public."authors" 
        ADD CONSTRAINT "authors_library_id_fkey" 
        FOREIGN KEY ("library_id") 
        REFERENCES public."libraries" ("id") 
        ON UPDATE NO ACTION ON DELETE CASCADE;
    END IF;
END $$;




-- --- SECTION: 04_indexes.sql ---

-- Indexes for public schema
CREATE UNIQUE INDEX authors_library_id_name_key ON public.authors USING btree (library_id, name);
CREATE UNIQUE INDEX authors_library_name_key ON public.authors USING btree (library_id, name);
CREATE INDEX idx_authors_library_id ON public.authors USING btree (library_id);
CREATE UNIQUE INDEX book_authors_book_id_author_id_key ON public.book_authors USING btree (library_item_id, author_id);
CREATE INDEX idx_book_authors_author_id ON public.book_authors USING btree (author_id);
CREATE UNIQUE INDEX book_insights_book_id_key ON public.book_insights USING btree (book_id);
CREATE INDEX idx_book_insights_book_id ON public.book_insights USING btree (book_id);
CREATE UNIQUE INDEX book_series_book_id_series_id_key ON public.book_series USING btree (library_item_id, series_id);
CREATE INDEX idx_book_series_series_id ON public.book_series USING btree (series_id);
CREATE UNIQUE INDEX collection_books_book_id_collection_id_key ON public.collection_items USING btree (library_item_id, collection_id);
CREATE INDEX idx_collection_books_collection_id ON public.collection_items USING btree (collection_id);
CREATE UNIQUE INDEX collections_library_name_key ON public.collections USING btree (library_id, name);
CREATE INDEX idx_collections_library_id ON public.collections USING btree (library_id);
CREATE INDEX idx_devices_user_id ON public.devices USING btree (user_id);
CREATE INDEX idx_feed_episodes_feed_id ON public.feed_episodes USING btree (feed_id);
CREATE INDEX idx_feeds_user_id ON public.feeds USING btree (user_id);
CREATE INDEX idx_library_folders_library_id ON public.library_folders USING btree (library_id);
CREATE INDEX idx_library_items_library_id ON public.library_items USING btree (library_id);
CREATE INDEX idx_library_items_media_id ON public.library_items USING btree (media_id);
CREATE INDEX library_items_embedding_hnsw_idx ON public.library_items USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64');
CREATE INDEX library_items_title_trgm_idx ON public.library_items USING gin (title gin_trgm_ops);
CREATE INDEX idx_media_item_shares_user_id ON public.media_item_shares USING btree (user_id);
CREATE INDEX idx_media_progress_continue_listening ON public.media_progress USING btree (user_id, is_finished, hide_from_continue_listening, last_update DESC) WHERE (episode_id IS NULL);
CREATE INDEX idx_media_progress_library_item_id ON public.media_progress USING btree (library_item_id);
CREATE INDEX idx_media_progress_listen_again ON public.media_progress USING btree (user_id, is_finished, last_update DESC) WHERE (episode_id IS NULL);
CREATE UNIQUE INDEX media_progress_user_item_episode_uq ON public.media_progress USING btree (user_id, library_item_id, episode_id) NULLS NOT DISTINCT;
CREATE INDEX idx_playback_sessions_library_id ON public.playback_sessions USING btree (library_id);
CREATE INDEX idx_playback_sessions_user_id ON public.playback_sessions USING btree (user_id);
CREATE INDEX idx_playlist_media_items_playlist_id ON public.playlist_media_items USING btree (playlist_id);
CREATE INDEX idx_playlists_library_id ON public.playlists USING btree (library_id);
CREATE INDEX idx_playlists_user_id ON public.playlists USING btree (user_id);
CREATE INDEX idx_podcast_episodes_podcast_id ON public.podcast_episodes USING btree (podcast_id);
CREATE INDEX idx_profiles_2fa_enabled ON public.profiles USING btree (is_2fa_enabled) WHERE (is_2fa_enabled = true);
CREATE INDEX idx_profiles_biometric_enrolled ON public.profiles USING btree (biometric_enrolled) WHERE (biometric_enrolled = true);
CREATE INDEX idx_profiles_default_library_id ON public.profiles USING btree (default_library_id);
CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);
CREATE INDEX idx_series_library_id ON public.series USING btree (library_id);
CREATE UNIQUE INDEX series_library_name_key ON public.series USING btree (library_id, name);
CREATE INDEX idx_webauthn_challenges_user ON public.webauthn_challenges USING btree (user_id, purpose, used);
CREATE INDEX idx_webauthn_credentials_user ON public.webauthn_credentials USING btree (user_id);
CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON public.webauthn_credentials USING btree (credential_id);



-- --- SECTION: 05_functions.sql ---

-- Custom Functions in public schema
CREATE OR REPLACE FUNCTION public.audit_library_item_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.library_item_deletion_audit
    (item_id, title, path, media_id, audio_count, deleted_by)
  VALUES
    (OLD.id, OLD.title, OLD.path, OLD.media_id,
     COALESCE(jsonb_array_length(OLD.audio_files), 0),
     current_user);
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_link_library_item_authors()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_author_name text;
    v_clean_author text;
    v_author_id uuid;
    v_author_names text[];
BEGIN
    IF NEW.author_names_first_last IS NOT NULL AND trim(NEW.author_names_first_last) != '' THEN
        v_author_names := regexp_split_to_array(NEW.author_names_first_last, '\s*(?:/|,|&|\band\b)\s*');
        
        FOREACH v_author_name IN ARRAY v_author_names LOOP
            v_clean_author := trim(regexp_replace(v_author_name, '\s+', ' ', 'g'));
            IF v_clean_author IS NOT NULL AND v_clean_author != '' THEN
                INSERT INTO public.authors (id, name, library_id)
                VALUES (gen_random_uuid(), v_clean_author, NEW.library_id)
                ON CONFLICT (library_id, name) DO NOTHING;

                SELECT id INTO v_author_id
                FROM public.authors
                WHERE name = v_clean_author AND library_id = NEW.library_id
                LIMIT 1;

                IF v_author_id IS NOT NULL THEN
                    INSERT INTO public.book_authors (library_item_id, author_id)
                    VALUES (NEW.id, v_author_id)
                    ON CONFLICT (library_item_id, author_id) DO NOTHING;
                END IF;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_link_series_and_clean_titles()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_linked_count integer := 0;
    v_rec RECORD;
    v_parent_dir text;
    v_series_id uuid;
    v_full_title text;
    v_seq numeric;
BEGIN
    -- 1. Clean scene/release group tags from authors (e.g. [AB].Isaac.Asimov... -> Isaac Asimov)
    UPDATE public.library_items
    SET author_names_first_last = regexp_replace(author_names_first_last, '^\[[a-z0-9._\-]+\]\.?|[-.]?Complete-MaLiBu$', '', 'gi')
    WHERE author_names_first_last ~* '\[[a-z0-9._\-]+\]|Complete-MaLiBu';

    UPDATE public.library_items
    SET author_names_first_last = 'Isaac Asimov'
    WHERE author_names_first_last ILIKE '%Isaac%Asimov%';

    -- 2. Detect multi-part items sharing parent folder (e.g. "Isaac Asimov Foundation/Book 1 - Foundation")
    FOR v_rec IN
        SELECT id, library_id, title, author_names_first_last, rel_path, path
        FROM public.library_items
        WHERE rel_path LIKE '%/%'
    LOOP
        v_parent_dir := trim(split_part(v_rec.rel_path, '/', 1));
        
        IF v_parent_dir != '' AND length(v_parent_dir) > 3 
           AND v_parent_dir NOT ILIKE 'audiobooks' 
           AND v_parent_dir NOT ILIKE 'music'
           AND (SELECT count(*) FROM public.library_items WHERE rel_path LIKE v_parent_dir || '/%') > 1 THEN
           
            -- Upsert series for parent directory
            INSERT INTO public.series (id, name, library_id)
            VALUES (gen_random_uuid(), v_parent_dir, v_rec.library_id)
            ON CONFLICT (library_id, name) DO UPDATE SET updated_at = now()
            RETURNING id INTO v_series_id;

            IF v_series_id IS NULL THEN
                SELECT id INTO v_series_id FROM public.series WHERE library_id = v_rec.library_id AND name = v_parent_dir;
            END IF;

            -- Extract sequence number if present (e.g. Book 1, 01, Vol 2)
            v_seq := 1;
            IF v_rec.rel_path ~* '\b(book|vol|volume|part|cd|disc)?\s*(\d+)\b' THEN
                v_seq := coalesce(nullif(regexp_replace(v_rec.rel_path, '.*?\b(book|vol|volume|part|cd|disc)?\s*(\d+)\b.*', '\2', 'gi'), '')::numeric, 1);
            END IF;

            -- Link book to series
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_series') THEN
                INSERT INTO public.book_series (library_item_id, series_id, sequence)
                VALUES (v_rec.id, v_series_id, v_seq)
                ON CONFLICT (library_item_id, series_id) DO UPDATE SET sequence = EXCLUDED.sequence;
            END IF;

            -- Fix truncated title if title is just "Book 1", "Book 2", etc. but rel_path has full name
            v_full_title := trim(split_part(v_rec.rel_path, '/', 2));
            IF v_rec.title ~* '^book\s*\d+$' AND v_full_title != '' AND length(v_full_title) > length(v_rec.title) THEN
                UPDATE public.library_items SET title = v_full_title WHERE id = v_rec.id;
            END IF;

            v_linked_count := v_linked_count + 1;
        END IF;
    END LOOP;

    RETURN v_linked_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.before_library_item_separate_title_author()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_raw_title text;
    v_raw_author text;
    v_clean_title text;
    v_clean_author text;
    v_match text[];
BEGIN
    v_raw_title := trim(coalesce(NEW.title, ''));
    v_raw_author := trim(coalesce(NEW.author_names_first_last, ''));
    IF v_raw_author = 'Unknown Author' THEN
        v_raw_author := '';
    END IF;

    v_clean_title := v_raw_title;
    v_clean_author := v_raw_author;

    -- 1. "Last, First -- Title"
    IF v_raw_title ~ '^([A-Z][a-zA-Z''\-]+),\s*([A-Z][a-zA-Z''\-\.]+)\s*(?:--|-)\s*(.+)$' THEN
        v_match := regexp_matches(v_raw_title, '^([A-Z][a-zA-Z''\-]+),\s*([A-Z][a-zA-Z''\-\.]+)\s*(?:--|-)\s*(.+)$');
        v_clean_author := trim(v_match[2]) || ' ' || trim(v_match[1]);
        v_clean_title := trim(v_match[3]);

    -- 2. "Author - Year - Title" or "Author - Title"
    ELSIF v_raw_title ~ '^([A-Z][a-zA-Z''\-\.]+(?:\s+[A-Z][a-zA-Z''\-\.]+){1,3})\s*(?:--|-)\s*(?:(19|20)\d{2}\s*(?:--|-)\s*)?(.+)$' THEN
        v_match := regexp_matches(v_raw_title, '^([A-Z][a-zA-Z''\-\.]+(?:\s+[A-Z][a-zA-Z''\-\.]+){1,3})\s*(?:--|-)\s*(?:(19|20)\d{2}\s*(?:--|-)\s*)?(.+)$');
        IF v_clean_author = '' THEN
            v_clean_author := trim(v_match[1]);
        END IF;
        v_clean_title := trim(v_match[3]);

    -- 3. "Title by Author"
    ELSIF v_raw_title ~* '^(.+?)\s+by\s+([A-Z][a-zA-Z''\-\.]+(?:\s+[A-Z][a-zA-Z''\-\.]+)+)$' THEN
        v_match := regexp_matches(v_raw_title, '^(.+?)\s+by\s+([A-Z][a-zA-Z''\-\.]+(?:\s+[A-Z][a-zA-Z''\-\.]+)+)$', 'i');
        v_clean_title := trim(v_match[1]);
        IF v_clean_author = '' THEN
            v_clean_author := trim(v_match[2]);
        END IF;

    -- 4. Strip known author from title prefix if present
    ELSIF v_clean_author != '' AND v_raw_title ~* ('^' || regexp_replace(v_clean_author, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*(?:--|-|:)\s*(.+)$') THEN
        v_match := regexp_matches(v_raw_title, '^' || regexp_replace(v_clean_author, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*(?:--|-|:)\s*(.+)$', 'i');
        v_clean_title := trim(v_match[1]);
    END IF;

    v_clean_title := trim(regexp_replace(v_clean_title, '^[-–—:\s]+|[-–—:\s]+$', '', 'g'));
    
    NEW.title := v_clean_title;
    IF v_clean_author != '' THEN
        NEW.author_names_first_last := v_clean_author;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_delete_orphaned_author()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM book_authors WHERE author_id = OLD.author_id) THEN
        DELETE FROM authors WHERE id = OLD.author_id;
    END IF;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_delete_orphaned_collection()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM collection_books WHERE collection_id = OLD.collection_id) THEN
        DELETE FROM collections WHERE id = OLD.collection_id;
    END IF;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_delete_orphaned_series()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM book_series WHERE series_id = OLD.series_id) THEN
        DELETE FROM series WHERE id = OLD.series_id;
    END IF;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_storage_quota(p_need_bytes bigint DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'storage', 'public'
AS $function$
DECLARE v_total bigint; v_quota bigint; v_flag text;
BEGIN
  SELECT coalesce(sum((metadata->>'size')::bigint),0) INTO v_total FROM storage.objects;
  SELECT value #>> '{}' INTO v_flag FROM public.server_settings WHERE key='storage_quota_bytes';
  IF v_flag IS NOT NULL AND v_flag ~ '^[0-9]+$' THEN
    v_quota := v_flag::bigint;
  ELSE
    v_quota := 1073741824; -- 1 GiB free
  END IF;
  IF v_total + coalesce(p_need_bytes,0) > v_quota THEN
    RAISE EXCEPTION 'Storage quota exceeded: % / % bytes (need %)', v_total, v_quota, p_need_bytes
      USING ERRCODE = 'P0001', HINT = 'Free plan is 1 GiB. Migrate audio to B2 and prune Supabase audio-files, or upgrade to Pro (100 GiB).';
  END IF;
END; $function$
;

CREATE OR REPLACE FUNCTION public.deduplicate_library_items(p_dry_run boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_merged_count integer := 0;
    v_default_lib_id uuid;
    v_rec RECORD;
    v_max_merges constant integer := 50;
BEGIN
    IF p_dry_run THEN
        SELECT count(*) INTO v_merged_count
        FROM public.plan_library_item_merges()
        WHERE reason NOT LIKE '%[DEFERRED%]';
        RETURN v_merged_count;
    END IF;

    -- Housekeeping retained from the original implementation: adopt orphaned
    -- rows into the first library and unite multi-part folder books.
    SELECT id INTO v_default_lib_id FROM public.libraries ORDER BY display_order ASC LIMIT 1;
    IF v_default_lib_id IS NOT NULL THEN
        UPDATE public.library_items SET library_id = v_default_lib_id WHERE library_id IS NULL;
    END IF;
    v_merged_count := v_merged_count + public.merge_multipart_folder_books();

    FOR v_rec IN
        SELECT * FROM public.plan_library_item_merges()
        WHERE reason NOT LIKE '%[DEFERRED%]'
        ORDER BY pass, primary_id, dup_id
        LIMIT v_max_merges
    LOOP
        IF public.merge_two_library_items(v_rec.primary_id, v_rec.dup_id, v_rec.pass, v_rec.reason) THEN
            v_merged_count := v_merged_count + 1;
        END IF;
    END LOOP;

    RETURN v_merged_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.deduplicate_library_items_guarded()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_flag text;
BEGIN
  SELECT value::text INTO v_flag
  FROM public.server_settings
  WHERE key = 'auto_dedupe_enabled';

  IF COALESCE(v_flag, '') NOT IN ('true', '"true"') THEN
    RAISE WARNING '[dedupe-guard] auto_dedupe_enabled is not true - skipping run';
    RETURN 0;
  END IF;

  RETURN public.deduplicate_library_items(false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_library_stats(p_library_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_total_items INT;
    v_total_books INT;
    v_total_authors INT;
    v_total_series INT;
    v_total_duration NUMERIC;
    v_total_size NUMERIC;
    v_added_last_30_days INT;
    v_num_audio_tracks INT;
    
    v_genres_json JSONB;
    v_authors_json JSONB;
    v_longest_json JSONB;
    v_largest_json JSONB;
    
    v_result JSONB;
BEGIN
    -- Basic counts from library_items
    SELECT 
        COUNT(*),
        COUNT(*), -- Assumes all are books for now
        COALESCE(SUM(duration), 0),
        COALESCE(SUM(size), 0),
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')
    INTO 
        v_total_items,
        v_total_books,
        v_total_duration,
        v_total_size,
        v_added_last_30_days
    FROM public.library_items
    WHERE library_id = p_library_id AND is_missing = FALSE AND is_invalid = FALSE;
    
    -- Count total authors and series for this library
    SELECT COUNT(*) INTO v_total_authors FROM public.authors WHERE library_id = p_library_id;
    SELECT COUNT(*) INTO v_total_series FROM public.series WHERE library_id = p_library_id;
    
    -- Audio tracks (summing json array length)
    SELECT COALESCE(SUM(jsonb_array_length(audio_files)), 0)
    INTO v_num_audio_tracks
    FROM public.library_items
    WHERE library_id = p_library_id AND audio_files IS NOT NULL AND jsonb_typeof(audio_files) = 'array';
    
    -- Genres with count
    WITH unnested_genres AS (
        SELECT jsonb_array_elements_text(genres) AS genre
        FROM public.library_items
        WHERE library_id = p_library_id AND genres IS NOT NULL AND jsonb_typeof(genres) = 'array'
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('genre', genre, 'count', count)), '[]'::jsonb)
    INTO v_genres_json
    FROM (
        SELECT genre, COUNT(*) as count
        FROM unnested_genres
        GROUP BY genre
        ORDER BY count DESC
        LIMIT 50
    ) t;

    -- Authors with count
    -- This ensures we use the proper book_authors mapping to get accurate counts
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'count', count)), '[]'::jsonb)
    INTO v_authors_json
    FROM (
        SELECT a.id, a.name, COUNT(ba.library_item_id) as count
        FROM public.authors a
        JOIN public.book_authors ba ON a.id = ba.author_id
        JOIN public.library_items li ON ba.library_item_id = li.id
        WHERE a.library_id = p_library_id AND li.library_id = p_library_id
        GROUP BY a.id, a.name
        ORDER BY count DESC
        LIMIT 50
    ) t;

    -- Longest items
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'duration', duration)), '[]'::jsonb)
    INTO v_longest_json
    FROM (
        SELECT id, title, duration
        FROM public.library_items
        WHERE library_id = p_library_id AND duration IS NOT NULL
        ORDER BY duration DESC
        LIMIT 10
    ) t;

    -- Largest items
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'size', size)), '[]'::jsonb)
    INTO v_largest_json
    FROM (
        SELECT id, title, size
        FROM public.library_items
        WHERE library_id = p_library_id AND size IS NOT NULL
        ORDER BY size DESC
        LIMIT 10
    ) t;

    v_result := jsonb_build_object(
        'totalItems', v_total_items,
        'totalBooks', v_total_books,
        'totalAuthors', v_total_authors,
        'totalSeries', v_total_series,
        'totalDuration', v_total_duration,
        'totalSize', v_total_size,
        'addedLast30Days', v_added_last_30_days,
        'numAudioTracks', v_num_audio_tracks,
        'genresWithCount', v_genres_json,
        'authorsWithCount', v_authors_json,
        'longestItems', v_longest_json,
        'largestItems', v_largest_json
    );

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.email);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type IN ('admin', 'root')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.list_storage_orphans(p_bucket text DEFAULT 'audio-files'::text)
 RETURNS TABLE(name text, size_bytes bigint, pretty text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'storage', 'public'
AS $function$
  WITH refs AS (
    SELECT DISTINCT split_part(name,'/',1) AS folder FROM storage.objects WHERE bucket_id=p_bucket
  )
  SELECT o.name::text, (o.metadata->>'size')::bigint, pg_size_pretty((o.metadata->>'size')::bigint), o.created_at
  FROM storage.objects o
  WHERE o.bucket_id=p_bucket
    AND NOT EXISTS (
      SELECT 1 FROM public.library_items li
      WHERE li.id::text = split_part(o.name,'/',1)
         OR o.name = ANY(SELECT (jsonb_array_elements(li.audio_files)->'metadata'->>'path')::text FROM public.library_items li2 WHERE li2.id::text = split_part(o.name,'/',1))
    )
  ORDER BY (o.metadata->>'size')::bigint DESC
  LIMIT 200;
$function$
;

CREATE OR REPLACE FUNCTION public.match_library_items_hybrid(query_text text, query_embedding vector DEFAULT NULL::vector, match_threshold double precision DEFAULT 0.2, match_count integer DEFAULT 20, target_library_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, library_id uuid, title text, subtitle text, author_name text, narrator_name text, description text, cover_path text, duration double precision, similarity_score double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        li.id,
        li.library_id,
        li.title,
        li.subtitle,
        li.author_name,
        li.narrator_name,
        li.description,
        li.cover_path,
        li.duration,
        (
            CASE 
                WHEN query_embedding IS NOT NULL AND li.embedding IS NOT NULL THEN
                    (1 - (li.embedding <=> query_embedding)) * 0.6
                ELSE 0.0
            END
            +
            CASE 
                WHEN query_text IS NOT NULL AND query_text <> '' THEN
                    (similarity(COALESCE(li.title, ''), query_text) * 0.3 +
                     similarity(COALESCE(li.author_name, ''), query_text) * 0.1)
                ELSE 0.0
            END
        )::float AS similarity_score
    FROM public.library_items li
    WHERE (target_library_id IS NULL OR li.library_id = target_library_id)
      AND (
          (query_embedding IS NOT NULL AND li.embedding IS NOT NULL AND (1 - (li.embedding <=> query_embedding)) >= match_threshold)
          OR (query_text IS NOT NULL AND query_text <> '' AND (li.title % query_text OR li.author_name % query_text))
      )
    ORDER BY similarity_score DESC
    LIMIT match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_unlinked_authors()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec RECORD;
    v_author_name text;
    v_clean_author text;
    v_author_id uuid;
    v_author_names text[];
BEGIN
    FOR rec IN 
        SELECT id, library_id, author_names_first_last 
        FROM public.library_items 
        WHERE author_names_first_last IS NOT NULL 
          AND trim(author_names_first_last) != ''
          AND id NOT IN (SELECT library_item_id FROM public.book_authors)
    LOOP
        -- Split on /, comma, &, or and
        v_author_names := regexp_split_to_array(rec.author_names_first_last, '\s*(?:/|,|&|\band\b)\s*');
        
        FOREACH v_author_name IN ARRAY v_author_names LOOP
            v_clean_author := trim(regexp_replace(v_author_name, '\s+', ' ', 'g'));
            IF v_clean_author IS NOT NULL AND v_clean_author != '' THEN
                -- Insert author if not exists
                INSERT INTO public.authors (id, name, library_id)
                VALUES (gen_random_uuid(), v_clean_author, rec.library_id)
                ON CONFLICT (library_id, name) DO NOTHING;

                -- Fetch author ID
                SELECT id INTO v_author_id
                FROM public.authors
                WHERE name = v_clean_author AND library_id = rec.library_id
                LIMIT 1;

                -- Link in book_authors
                IF v_author_id IS NOT NULL THEN
                    INSERT INTO public.book_authors (library_item_id, author_id)
                    VALUES (rec.id, v_author_id)
                    ON CONFLICT (library_item_id, author_id) DO NOTHING;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.merge_authors(p_target_name text, p_source_name text, p_library_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_target_id UUID;
    v_source_id UUID;
BEGIN
    -- Get source id
    SELECT id INTO v_source_id FROM authors WHERE name = p_source_name AND library_id = p_library_id;
    
    IF v_source_id IS NULL THEN
        RETURN; -- Source doesn't exist, nothing to do
    END IF;

    -- Get target id, if not exists, just rename source!
    SELECT id INTO v_target_id FROM authors WHERE name = p_target_name AND library_id = p_library_id;
    
    IF v_target_id IS NULL THEN
        UPDATE authors SET name = p_target_name WHERE id = v_source_id;
        RETURN;
    END IF;
    
    IF v_source_id = v_target_id THEN
        RETURN;
    END IF;

    -- Both exist. Update book_authors for source to point to target
    -- Need to handle duplicates in book_authors (if book is linked to both)
    INSERT INTO book_authors (book_id, author_id)
    SELECT book_id, v_target_id 
    FROM book_authors 
    WHERE author_id = v_source_id
    ON CONFLICT (book_id, author_id) DO NOTHING;

    -- Delete old links (which will trigger orphan cleanup and delete the source author if no other books are linked)
    DELETE FROM book_authors WHERE author_id = v_source_id;
    
    -- Safety delete of author
    DELETE FROM authors WHERE id = v_source_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.merge_multipart_folder_books()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_merged_count integer := 0;
    v_parent_dir text;
    v_lib_id uuid;
    v_primary_rec RECORD;
    v_dup_rec RECORD;
    v_clean_title text;
    v_clean_author text;
BEGIN
    -- 1. Clean scene/release group tags from authors
    UPDATE public.library_items
    SET author_names_first_last = regexp_replace(author_names_first_last, '^\[[a-z0-9._\-]+\]\.?|[-.]?Complete-MaLiBu$', '', 'gi')
    WHERE author_names_first_last ~* '\[[a-z0-9._\-]+\]|Complete-MaLiBu';

    UPDATE public.library_items
    SET author_names_first_last = 'Isaac Asimov'
    WHERE author_names_first_last ILIKE '%Isaac%Asimov%';

    -- 2. Loop over parent directories in rel_path that contain multiple book items (e.g. "Isaac Asimov Foundation", "Dark Psychology Audiobook Collection")
    FOR v_parent_dir, v_lib_id IN
        SELECT split_part(rel_path, '/', 1) as parent_dir, library_id
        FROM public.library_items
        WHERE rel_path LIKE '%/%'
          AND split_part(rel_path, '/', 1) NOT ILIKE 'audiobooks'
          AND split_part(rel_path, '/', 1) NOT ILIKE 'music'
          AND split_part(rel_path, '/', 1) NOT ILIKE 'Marshall Rosenberg'
          AND split_part(rel_path, '/', 1) NOT ILIKE 'Annie Jacobsen'
        GROUP BY split_part(rel_path, '/', 1), library_id
        HAVING count(*) > 1
    LOOP
        v_clean_title := v_parent_dir;

        -- Pick primary record (Book 1 / earliest part)
        SELECT * INTO v_primary_rec
        FROM public.library_items
        WHERE library_id = v_lib_id
          AND split_part(rel_path, '/', 1) = v_parent_dir
        ORDER BY case 
                    when rel_path ILIKE '%Book 1%' or rel_path ILIKE '%01%' or rel_path ILIKE '%Vol.1%' then 0
                    when rel_path ILIKE '%Book 2%' or rel_path ILIKE '%02%' or rel_path ILIKE '%Vol.2%' then 1
                    else 2
                 end ASC,
                 created_at ASC
        LIMIT 1;

        IF v_primary_rec.id IS NULL THEN
            CONTINUE;
        END IF;

        v_clean_author := v_primary_rec.author_names_first_last;
        IF v_clean_author ILIKE '%Isaac%Asimov%' OR v_clean_author ILIKE '%MaLiBu%' THEN
            v_clean_author := 'Isaac Asimov';
        END IF;

        UPDATE public.library_items
        SET title = v_clean_title,
            author_names_first_last = v_clean_author
        WHERE id = v_primary_rec.id;

        -- Merge all other multi-part books under this folder into the primary single book
        FOR v_dup_rec IN
            SELECT *
            FROM public.library_items
            WHERE library_id = v_lib_id
              AND split_part(rel_path, '/', 1) = v_parent_dir
              AND id != v_primary_rec.id
            ORDER BY case 
                        when rel_path ILIKE '%Book 1%' or rel_path ILIKE '%01%' then 1
                        when rel_path ILIKE '%Book 2%' or rel_path ILIKE '%02%' then 2
                        when rel_path ILIKE '%Book 3%' or rel_path ILIKE '%03%' then 3
                        when rel_path ILIKE '%Book 4%' or rel_path ILIKE '%04%' then 4
                        when rel_path ILIKE '%Book 5%' or rel_path ILIKE '%05%' then 5
                        when rel_path ILIKE '%Book 6%' or rel_path ILIKE '%06%' then 6
                        when rel_path ILIKE '%Book 7%' or rel_path ILIKE '%07%' then 7
                        else 99
                     end ASC
        LOOP
            IF public.merge_two_library_items(v_primary_rec.id, v_dup_rec.id) THEN
                v_merged_count := v_merged_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN v_merged_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.merge_two_library_items(p_primary_id uuid, p_dup_id uuid, p_pass integer, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
DECLARE
    v_primary_rec RECORD;
    v_dup_rec RECORD;
    v_combined_audio jsonb;
    v_combined_files jsonb;
    v_audio_elem jsonb;
    v_file_elem jsonb;
    v_filename text;
    v_seen_filenames text[];
    v_seen_lib_filenames text[];
    v_total_dur numeric;
    v_total_size bigint;
BEGIN
    IF p_primary_id IS NULL OR p_dup_id IS NULL OR p_primary_id = p_dup_id THEN
        RETURN false;
    END IF;

    SELECT * INTO v_primary_rec FROM public.library_items WHERE id = p_primary_id;
    SELECT * INTO v_dup_rec FROM public.library_items WHERE id = p_dup_id;

    IF v_primary_rec.id IS NULL OR v_dup_rec.id IS NULL THEN
        RETURN false;
    END IF;

    v_combined_audio := coalesce(v_primary_rec.audio_files, '[]'::jsonb);
    v_seen_filenames := ARRAY[]::text[];
    FOR v_audio_elem IN SELECT * FROM jsonb_array_elements(v_combined_audio) LOOP
        v_filename := coalesce(v_audio_elem->'metadata'->>'filename', v_audio_elem->'metadata'->>'relPath', '');
        IF v_filename != '' THEN v_seen_filenames := array_append(v_seen_filenames, v_filename); END IF;
    END LOOP;
    FOR v_audio_elem IN SELECT * FROM jsonb_array_elements(coalesce(v_dup_rec.audio_files, '[]'::jsonb)) LOOP
        v_filename := coalesce(v_audio_elem->'metadata'->>'filename', v_audio_elem->'metadata'->>'relPath', '');
        IF v_filename = '' OR NOT (v_filename = ANY(v_seen_filenames)) THEN
            v_combined_audio := v_combined_audio || jsonb_build_array(v_audio_elem);
            IF v_filename != '' THEN v_seen_filenames := array_append(v_seen_filenames, v_filename); END IF;
        END IF;
    END LOOP;
    FOR i IN 0..(jsonb_array_length(v_combined_audio) - 1) LOOP
        v_combined_audio := jsonb_set(v_combined_audio, ARRAY[i::text, 'index'], to_jsonb(i + 1));
    END LOOP;

    v_combined_files := coalesce(v_primary_rec.library_files, '[]'::jsonb);
    v_seen_lib_filenames := ARRAY[]::text[];
    FOR v_file_elem IN SELECT * FROM jsonb_array_elements(v_combined_files) LOOP
        v_filename := coalesce(v_file_elem->'metadata'->>'filename', v_file_elem->'metadata'->>'relPath', '');
        IF v_filename != '' THEN v_seen_lib_filenames := array_append(v_seen_lib_filenames, v_filename); END IF;
    END LOOP;
    FOR v_file_elem IN SELECT * FROM jsonb_array_elements(coalesce(v_dup_rec.library_files, '[]'::jsonb)) LOOP
        v_filename := coalesce(v_file_elem->'metadata'->>'filename', v_file_elem->'metadata'->>'relPath', '');
        IF v_filename = '' OR NOT (v_filename = ANY(v_seen_lib_filenames)) THEN
            v_combined_files := v_combined_files || jsonb_build_array(v_file_elem);
            IF v_filename != '' THEN v_seen_lib_filenames := array_append(v_seen_lib_filenames, v_filename); END IF;
        END IF;
    END LOOP;

    v_total_dur := greatest(coalesce(v_primary_rec.duration, 0), coalesce(v_dup_rec.duration, 0));
    v_total_size := coalesce(v_primary_rec.size, 0) + coalesce(v_dup_rec.size, 0);

    UPDATE public.library_items
    SET audio_files = v_combined_audio,
        library_files = v_combined_files,
        duration = v_total_dur,
        size = v_total_size,
        author_names_first_last = coalesce(
            nullif(v_primary_rec.author_names_first_last, 'Unknown Author'),
            nullif(v_dup_rec.author_names_first_last, 'Unknown Author'),
            v_primary_rec.author_names_first_last
        ),
        cover_path = case
            when v_primary_rec.cover_path is not null and v_primary_rec.cover_path != '' and v_primary_rec.cover_path != 'missing'
            then v_primary_rec.cover_path
            else coalesce(v_dup_rec.cover_path, v_primary_rec.cover_path)
        end
    WHERE id = p_primary_id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_progress') THEN
        DELETE FROM public.media_progress mp_dup WHERE mp_dup.library_item_id = p_dup_id
          AND EXISTS (SELECT 1 FROM public.media_progress mp_pri WHERE mp_pri.library_item_id = p_primary_id AND mp_pri.user_id = mp_dup.user_id);
        UPDATE public.media_progress SET library_item_id = p_primary_id WHERE library_item_id = p_dup_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookmarks') THEN
        UPDATE public.bookmarks SET library_item_id = p_primary_id WHERE library_item_id = p_dup_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_library_items') THEN
        INSERT INTO public.user_library_items (user_id, library_item_id, is_favorite)
        SELECT user_id, p_primary_id, is_favorite FROM public.user_library_items WHERE library_item_id = p_dup_id ON CONFLICT DO NOTHING;
        DELETE FROM public.user_library_items WHERE library_item_id = p_dup_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_authors') THEN
        INSERT INTO public.book_authors (library_item_id, author_id)
        SELECT p_primary_id, author_id FROM public.book_authors WHERE library_item_id = p_dup_id ON CONFLICT (library_item_id, author_id) DO NOTHING;
        DELETE FROM public.book_authors WHERE library_item_id = p_dup_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_series') THEN
        INSERT INTO public.book_series (library_item_id, series_id, sequence)
        SELECT p_primary_id, series_id, sequence FROM public.book_series WHERE library_item_id = p_dup_id ON CONFLICT (library_item_id, series_id) DO NOTHING;
        DELETE FROM public.book_series WHERE library_item_id = p_dup_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collection_items') THEN
        INSERT INTO public.collection_items (library_item_id, collection_id, "order")
        SELECT p_primary_id, collection_id, "order" FROM public.collection_items WHERE library_item_id = p_dup_id ON CONFLICT (collection_id, library_item_id) DO NOTHING;
        DELETE FROM public.collection_items WHERE library_item_id = p_dup_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'playlist_media_items') THEN
        UPDATE public.playlist_media_items SET media_item_id = p_primary_id WHERE media_item_id = p_dup_id;
    END IF;

    INSERT INTO public.library_item_merge_audit
        (primary_id, primary_title, dup_id, dup_title, pass, reason, audio_files_before, deleted_by)
    VALUES
        (p_primary_id, v_primary_rec.title, p_dup_id, v_dup_rec.title,
         p_pass, p_reason, v_dup_rec.audio_files, current_user);

    -- 10x pro: GC Supabase Storage for the duplicate
    -- Only delete the duplicate's cover if it's not the survivor's cover (avoid deleting shared art).
    IF v_dup_rec.cover_path IS NOT NULL AND v_dup_rec.cover_path NOT LIKE 'missing'
       AND v_dup_rec.cover_path <> coalesce(v_primary_rec.cover_path,'') THEN
        DELETE FROM storage.objects WHERE bucket_id='covers' AND name = v_dup_rec.cover_path;
        -- Also try <dup_id>/cover.* legacy pattern
        DELETE FROM storage.objects WHERE bucket_id='covers' AND name LIKE v_dup_rec.id::text || '/cover.%';
    END IF;
    -- Audio: remove whole prefix `audio-files/{dup_id}/%` – B2 copies (b2://) are not in storage.objects, so safe.
    DELETE FROM storage.objects WHERE bucket_id='audio-files' AND name LIKE v_dup_rec.id::text || '/%';

    DELETE FROM public.library_items WHERE id = p_dup_id;
    RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.merge_two_library_items(p_primary_id uuid, p_dup_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_primary_rec RECORD;
    v_dup_rec RECORD;
    v_combined_audio jsonb;
    v_combined_files jsonb;
    v_audio_elem jsonb;
    v_file_elem jsonb;
    v_filename text;
    v_seen_filenames text[];
    v_seen_lib_filenames text[];
    v_total_dur numeric;
    v_total_size bigint;
BEGIN
    IF p_primary_id IS NULL OR p_dup_id IS NULL OR p_primary_id = p_dup_id THEN
        RETURN false;
    END IF;

    SELECT * INTO v_primary_rec FROM public.library_items WHERE id = p_primary_id;
    SELECT * INTO v_dup_rec FROM public.library_items WHERE id = p_dup_id;

    IF v_primary_rec.id IS NULL OR v_dup_rec.id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Merge audio_files JSONB array
    v_combined_audio := coalesce(v_primary_rec.audio_files, '[]'::jsonb);
    v_seen_filenames := ARRAY[]::text[];
    
    FOR v_audio_elem IN SELECT * FROM jsonb_array_elements(v_combined_audio)
    LOOP
        v_filename := coalesce(v_audio_elem->'metadata'->>'filename', v_audio_elem->'metadata'->>'relPath', '');
        IF v_filename != '' THEN
            v_seen_filenames := array_append(v_seen_filenames, v_filename);
        END IF;
    END LOOP;

    FOR v_audio_elem IN SELECT * FROM jsonb_array_elements(coalesce(v_dup_rec.audio_files, '[]'::jsonb))
    LOOP
        v_filename := coalesce(v_audio_elem->'metadata'->>'filename', v_audio_elem->'metadata'->>'relPath', '');
        IF v_filename = '' OR NOT (v_filename = ANY(v_seen_filenames)) THEN
            v_combined_audio := v_combined_audio || jsonb_build_array(v_audio_elem);
            IF v_filename != '' THEN
                v_seen_filenames := array_append(v_seen_filenames, v_filename);
            END IF;
        END IF;
    END LOOP;

    -- Re-index audio files sequentially
    FOR i IN 0..(jsonb_array_length(v_combined_audio) - 1) LOOP
        v_combined_audio := jsonb_set(v_combined_audio, ARRAY[i::text, 'index'], to_jsonb(i + 1));
    END LOOP;

    -- 2. Merge library_files JSONB array
    v_combined_files := coalesce(v_primary_rec.library_files, '[]'::jsonb);
    v_seen_lib_filenames := ARRAY[]::text[];
    
    FOR v_file_elem IN SELECT * FROM jsonb_array_elements(v_combined_files)
    LOOP
        v_filename := coalesce(v_file_elem->'metadata'->>'filename', v_file_elem->'metadata'->>'relPath', '');
        IF v_filename != '' THEN
            v_seen_lib_filenames := array_append(v_seen_lib_filenames, v_filename);
        END IF;
    END LOOP;

    FOR v_file_elem IN SELECT * FROM jsonb_array_elements(coalesce(v_dup_rec.library_files, '[]'::jsonb))
    LOOP
        v_filename := coalesce(v_file_elem->'metadata'->>'filename', v_file_elem->'metadata'->>'relPath', '');
        IF v_filename = '' OR NOT (v_filename = ANY(v_seen_lib_filenames)) THEN
            v_combined_files := v_combined_files || jsonb_build_array(v_file_elem);
            IF v_filename != '' THEN
                v_seen_lib_filenames := array_append(v_seen_lib_filenames, v_filename);
            END IF;
        END IF;
    END LOOP;

    v_total_dur := greatest(coalesce(v_primary_rec.duration, 0), coalesce(v_dup_rec.duration, 0)) + case when v_primary_rec.duration is not null and v_dup_rec.duration is not null then coalesce(v_dup_rec.duration, 0) else 0 end;
    v_total_size := coalesce(v_primary_rec.size, 0) + coalesce(v_dup_rec.size, 0);

    UPDATE public.library_items
    SET audio_files = v_combined_audio,
        library_files = v_combined_files,
        duration = v_total_dur,
        size = v_total_size,
        author_names_first_last = coalesce(
            nullif(v_primary_rec.author_names_first_last, 'Unknown Author'),
            nullif(v_dup_rec.author_names_first_last, 'Unknown Author'),
            v_primary_rec.author_names_first_last
        ),
        cover_path = case 
            when v_primary_rec.cover_path is not null and v_primary_rec.cover_path != '' and v_primary_rec.cover_path != 'missing' 
            then v_primary_rec.cover_path
            else coalesce(v_dup_rec.cover_path, v_primary_rec.cover_path)
        end
    WHERE id = p_primary_id;

    -- 3. Safely re-link foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_progress') THEN
        DELETE FROM public.media_progress mp_dup
        WHERE mp_dup.library_item_id = p_dup_id
          AND EXISTS (
              SELECT 1 FROM public.media_progress mp_pri
              WHERE mp_pri.library_item_id = p_primary_id
                AND mp_pri.user_id = mp_dup.user_id
          );
        UPDATE public.media_progress SET library_item_id = p_primary_id WHERE library_item_id = p_dup_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookmarks') THEN
        UPDATE public.bookmarks SET library_item_id = p_primary_id WHERE library_item_id = p_dup_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_library_items') THEN
        INSERT INTO public.user_library_items (user_id, library_item_id, is_favorite)
        SELECT user_id, p_primary_id, is_favorite FROM public.user_library_items WHERE library_item_id = p_dup_id
        ON CONFLICT DO NOTHING;
        DELETE FROM public.user_library_items WHERE library_item_id = p_dup_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_authors') THEN
        INSERT INTO public.book_authors (library_item_id, author_id)
        SELECT p_primary_id, author_id FROM public.book_authors WHERE library_item_id = p_dup_id
        ON CONFLICT (library_item_id, author_id) DO NOTHING;
        DELETE FROM public.book_authors WHERE library_item_id = p_dup_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_series') THEN
        INSERT INTO public.book_series (library_item_id, series_id, sequence)
        SELECT p_primary_id, series_id, sequence FROM public.book_series WHERE library_item_id = p_dup_id
        ON CONFLICT (library_item_id, series_id) DO NOTHING;
        DELETE FROM public.book_series WHERE library_item_id = p_dup_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collection_items') THEN
        INSERT INTO public.collection_items (library_item_id, collection_id, "order")
        SELECT p_primary_id, collection_id, "order" FROM public.collection_items WHERE library_item_id = p_dup_id
        ON CONFLICT (collection_id, library_item_id) DO NOTHING;
        DELETE FROM public.collection_items WHERE library_item_id = p_dup_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'playlist_media_items') THEN
        UPDATE public.playlist_media_items SET media_item_id = p_primary_id WHERE media_item_id = p_dup_id;
    END IF;

    DELETE FROM public.library_items WHERE id = p_dup_id;
    RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_author_name()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Trim, collapse whitespace, strip zero-width chars
  NEW.name := regexp_replace(
    btrim(NEW.name),
    '\s+', ' ', 'g'
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_book_title(p_title text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    v_clean text;
BEGIN
    IF p_title IS NULL OR trim(p_title) = '' THEN
        RETURN '';
    END IF;
    
    v_clean := lower(trim(p_title));
    -- Remove common bracketed / parenthetical tags: [Audiobook], (Audiobook), (Unabridged), [Unabridged], (Abridged), [MP3]
    v_clean := regexp_replace(v_clean, '\[(audiobook|unabridged|abridged|mp3)\]|\((audiobook|unabridged|abridged|mp3)\)', '', 'gi');
    -- Remove CD / Disc / Part / Vol suffixes: e.g. CD 1, CD01, Disc 2, Part 1, Volume 1
    v_clean := regexp_replace(v_clean, '\b(cd|disc|part|vol|volume)\s*\d+\b', '', 'gi');
    -- Strip all non-alphanumeric characters (Unicode-safe for Cyrillic, Latin, Accented, Asian)
    v_clean := regexp_replace(v_clean, '[^[:alnum:]]', '', 'g');
    
    RETURN v_clean;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.plan_library_item_merges()
 RETURNS TABLE(primary_id uuid, primary_title text, dup_id uuid, dup_title text, pass integer, reason text)
 LANGUAGE sql
 STABLE
AS $function$
WITH pairs AS (
    -- PASS 1: same normalized title within a library
    SELECT 1 AS pass,
           least(i1.id, i2.id) AS a, greatest(i1.id, i2.id) AS b,
           'same-normalized-title'::text AS reason
    FROM public.library_items i1
    JOIN public.library_items i2
      ON i1.library_id = i2.library_id AND i1.id < i2.id
    WHERE public.normalize_book_title(i1.title) != ''
      AND public.normalize_book_title(i1.title) = public.normalize_book_title(i2.title)

    UNION

    -- PASS 2: share a specific (non-generic) audio filename
    SELECT 2, least(i1.id, i2.id), greatest(i1.id, i2.id),
           'shared-specific-audio-file'
    FROM public.library_items i1
    JOIN public.library_items i2
      ON i1.library_id = i2.library_id AND i1.id < i2.id
    WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(coalesce(i1.audio_files, '[]'::jsonb)) f1
        JOIN jsonb_array_elements(coalesce(i2.audio_files, '[]'::jsonb)) f2
          ON coalesce(f1->'metadata'->>'filename', f1->'metadata'->>'relPath')
           = coalesce(f2->'metadata'->>'filename', f2->'metadata'->>'relPath')
        WHERE length(coalesce(f1->'metadata'->>'filename', f1->'metadata'->>'relPath', '')) > 15
          AND lower(coalesce(f1->'metadata'->>'filename', f1->'metadata'->>'relPath', ''))
              NOT SIMILAR TO '%(chapter|part|track|cd|disc|volume)\s*\d+%'
    )

    UNION

    -- PASS 3: title prefix + author evidence
    SELECT 3, least(i1.id, i2.id), greatest(i1.id, i2.id),
           'title-prefix+author'
    FROM public.library_items i1
    JOIN public.library_items i2
      ON i1.library_id = i2.library_id AND i1.id < i2.id
    WHERE public.normalize_book_title(i1.title) != ''
      AND public.normalize_book_title(i2.title) != ''
      AND (
        (public.normalize_book_title(i1.title) LIKE public.normalize_book_title(i2.title) || '%')
        OR
        (public.normalize_book_title(i2.title) LIKE public.normalize_book_title(i1.title) || '%')
      )
      AND (
        i1.author_names_first_last IS NULL OR i2.author_names_first_last IS NULL
        OR i1.author_names_first_last = 'Unknown Author' OR i2.author_names_first_last = 'Unknown Author'
        OR lower(regexp_replace(i1.author_names_first_last, '[^[:alnum:]]', '', 'g'))
           = lower(regexp_replace(i2.author_names_first_last, '[^[:alnum:]]', '', 'g'))
        OR lower(regexp_replace(i1.author_names_first_last, '[^[:alnum:]]', '', 'g'))
           LIKE lower(regexp_replace(i2.author_names_first_last, '[^[:alnum:]]', '', 'g')) || '%'
        OR lower(regexp_replace(i2.author_names_first_last, '[^[:alnum:]]', '', 'g'))
           LIKE lower(regexp_replace(i1.author_names_first_last, '[^[:alnum:]]', '', 'g')) || '%'
      )
      AND NOT (
        (i1.title ~* '\b(vol|volume|part|book|cd|disc)\s*\d+' AND i2.title ~* '\b(vol|volume|part|book|cd|disc)\s*\d+')
        AND regexp_replace(lower(i1.title), '.*?\b(vol|volume|part|book|cd|disc)\s*(\d+).*', '\2')
            != regexp_replace(lower(i2.title), '.*?\b(vol|volume|part|book|cd|disc)\s*(\d+).*', '\2')
      )

    UNION

    -- PASS 4: trigram similarity + exact-normalized author
    SELECT 4, least(i1.id, i2.id), greatest(i1.id, i2.id),
           'trigram>0.85+author'
    FROM public.library_items i1
    JOIN public.library_items i2
      ON i1.library_id = i2.library_id AND i1.id < i2.id
    WHERE public.normalize_book_title(i1.title) != ''
      AND public.normalize_book_title(i2.title) != ''
      AND similarity(public.normalize_book_title(i1.title), public.normalize_book_title(i2.title)) > 0.85
      AND (
        i1.author_names_first_last IS NULL OR i2.author_names_first_last IS NULL
        OR i1.author_names_first_last = 'Unknown Author' OR i2.author_names_first_last = 'Unknown Author'
        OR lower(regexp_replace(i1.author_names_first_last, '[^[:alnum:]]', '', 'g'))
           = lower(regexp_replace(i2.author_names_first_last, '[^[:alnum:]]', '', 'g'))
      )
      AND NOT (
        (i1.title ~* '\b(vol|volume|part|book|cd|disc)\s*\d+' AND i2.title ~* '\b(vol|volume|part|book|cd|disc)\s*\d+')
        AND regexp_replace(lower(i1.title), '.*?\b(vol|volume|part|book|cd|disc)\s*(\d+).*', '\2')
            != regexp_replace(lower(i2.title), '.*?\b(vol|volume|part|book|cd|disc)\s*(\d+).*', '\2')
      )
),
deduped AS (
    -- Earlier passes win; each unordered pair appears once.
    SELECT DISTINCT ON (a, b) a, b, pass, reason
    FROM pairs
    ORDER BY a, b, pass ASC
),
primary_chosen AS (
    -- Primary = OLDEST row (created_at, then id) - stable identity anchor.
    SELECT d.a, d.b, d.pass, d.reason,
           p.id AS pri_id, p.created_at AS pri_created, p.duration AS pri_dur,
           q.id AS dup_id, q.duration AS dup_dur
    FROM deduped d
    JOIN public.library_items p ON p.id IN (d.a, d.b)
    JOIN public.library_items q ON q.id IN (d.a, d.b) AND q.id != p.id
    WHERE (p.created_at, p.id) <= (q.created_at, q.id)
)
SELECT pri_id,
       (SELECT title FROM public.library_items WHERE id = pri_id),
       dup_id,
       (SELECT title FROM public.library_items WHERE id = dup_id),
       pass,
       CASE
         WHEN pri_dur IS NOT NULL AND dup_dur IS NOT NULL
              AND pri_dur > 0 AND dup_dur > 0
              AND abs(pri_dur - dup_dur) / greatest(pri_dur, dup_dur) > 0.35
         THEN reason || ' [DEFERRED: durations diverge >35%]'
         ELSE reason
       END
FROM primary_chosen
ORDER BY pass, a, b;
$function$
;

CREATE OR REPLACE FUNCTION public.read_secret(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_secret text;
begin
  -- Defense in depth: the GRANTs below already restrict callers to
  -- service_role, but verify the caller role so a future grant mistake cannot
  -- widen access.
  if coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') <> 'service_role'
     and current_user <> 'postgres' then
    raise exception 'read_secret: access denied';
  end if;

  select decrypted_secret
    into v_secret
    from vault.decrypted_secrets
   where name = p_name
   limit 1;

  return v_secret;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.separate_title_and_author_for_all_books()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec RECORD;
    v_raw_title text;
    v_raw_author text;
    v_clean_title text;
    v_clean_author text;
    v_last_first_match text[];
BEGIN
    FOR rec IN 
        SELECT id, library_id, title, author_names_first_last 
        FROM public.library_items 
        WHERE title IS NOT NULL AND trim(title) != ''
    LOOP
        v_raw_title := trim(rec.title);
        v_raw_author := trim(coalesce(rec.author_names_first_last, ''));
        IF v_raw_author = 'Unknown Author' THEN
            v_raw_author := '';
        END IF;

        v_clean_title := v_raw_title;
        v_clean_author := v_raw_author;

        -- 1. Handle "Last, First -- Title" or "Last, First - Title" (e.g. "Sagan, Carl -- The Demon-Haunted World")
        IF v_raw_title ~ '^([A-Z][a-zA-Z''\-]+),\s*([A-Z][a-zA-Z''\-\.]+)\s*(?:--|-)\s*(.+)$' THEN
            v_last_first_match := regexp_matches(v_raw_title, '^([A-Z][a-zA-Z''\-]+),\s*([A-Z][a-zA-Z''\-\.]+)\s*(?:--|-)\s*(.+)$');
            v_clean_author := trim(v_last_first_match[2]) || ' ' || trim(v_last_first_match[1]);
            v_clean_title := trim(v_last_first_match[3]);
        
        -- 2. Handle "Author - Year - Title" or "Author - Title" (e.g. "Alexei Navalny - 2024 - Patriot", "Christopher Hitchens - Hitch-22")
        ELSIF v_raw_title ~ '^([A-Z][a-zA-Z''\-\.]+(?:\s+[A-Z][a-zA-Z''\-\.]+){1,3})\s*(?:--|-)\s*(?:(19|20)\d{2}\s*(?:--|-)\s*)?(.+)$' THEN
            v_last_first_match := regexp_matches(v_raw_title, '^([A-Z][a-zA-Z''\-\.]+(?:\s+[A-Z][a-zA-Z''\-\.]+){1,3})\s*(?:--|-)\s*(?:(19|20)\d{2}\s*(?:--|-)\s*)?(.+)$');
            IF v_clean_author = '' THEN
                v_clean_author := trim(v_last_first_match[1]);
            END IF;
            v_clean_title := trim(v_last_first_match[3]);

        -- 3. Handle "Title by Author" (e.g. "Essential CISSP by Phil Martin")
        ELSIF v_raw_title ~* '^(.+?)\s+by\s+([A-Z][a-zA-Z''\-\.]+(?:\s+[A-Z][a-zA-Z''\-\.]+)+)$' THEN
            v_last_first_match := regexp_matches(v_raw_title, '^(.+?)\s+by\s+([A-Z][a-zA-Z''\-\.]+(?:\s+[A-Z][a-zA-Z''\-\.]+)+)$', 'i');
            v_clean_title := trim(v_last_first_match[1]);
            IF v_clean_author = '' THEN
                v_clean_author := trim(v_last_first_match[2]);
            END IF;
        
        -- 4. Strip known author from title prefix if present (e.g. "Christopher Hitchens - Hitch-22" where author is "Christopher Hitchens")
        ELSIF v_clean_author != '' AND v_raw_title ~* ('^' || regexp_replace(v_clean_author, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*(?:--|-|:)\s*(.+)$') THEN
            v_last_first_match := regexp_matches(v_raw_title, '^' || regexp_replace(v_clean_author, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*(?:--|-|:)\s*(.+)$', 'i');
            v_clean_title := trim(v_last_first_match[1]);
        END IF;

        -- Clean up title trailing punctuation
        v_clean_title := trim(regexp_replace(v_clean_title, '^[-–—:\s]+|[-–—:\s]+$', '', 'g'));
        IF v_clean_author = '' THEN
            v_clean_author := 'Unknown Author';
        END IF;

        -- Update library_items if changes detected
        IF v_clean_title != v_raw_title OR (v_clean_author != v_raw_author AND v_clean_author != 'Unknown Author') THEN
            UPDATE public.library_items
            SET title = v_clean_title,
                author_names_first_last = v_clean_author
            WHERE id = rec.id;
        END IF;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.storage_quota_snapshot()
 RETURNS TABLE(bucket_id text, object_count bigint, total_bytes bigint, pretty text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'storage', 'public'
AS $function$
  SELECT bucket_id::text, count(*)::bigint, coalesce(sum((metadata->>'size')::bigint),0)::bigint,
         pg_size_pretty(coalesce(sum((metadata->>'size')::bigint),0))
  FROM storage.objects GROUP BY bucket_id
  UNION ALL
  SELECT '_total'::text, count(*)::bigint, coalesce(sum((metadata->>'size')::bigint),0)::bigint,
         pg_size_pretty(coalesce(sum((metadata->>'size')::bigint),0))
  FROM storage.objects;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_author_avatars()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  edge_url text;
  auth_header text;
  request_id bigint;
begin
  -- Try to get custom URL setting, fallback to production URL
  begin
    edge_url := current_setting('app.settings.edge_api_url', true) || '/sync-authors';
  exception when others then
    edge_url := 'https://iambzzclljayqdxkeepy.supabase.co/functions/v1/sync-authors';
  end;
  
  if edge_url is null or edge_url = '/sync-authors' then
     edge_url := 'https://iambzzclljayqdxkeepy.supabase.co/functions/v1/sync-authors';
  end if;

  -- Try to get cron secret, fallback to anon key or empty
  begin
    auth_header := 'Bearer ' || current_setting('app.settings.cron_secret', true);
  exception when others then
    auth_header := null;
  end;

  -- If no explicit cron_secret is set, try to use service role key for cron
  if auth_header is null or auth_header = 'Bearer ' then
     -- This is purely a fallback, in production a secret should be set in vault or settings
     auth_header := 'Bearer fallback_secret'; 
  end if;

  select net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_header
    ),
    timeout_milliseconds := 30000
  ) into request_id;
end;
$function$
;




-- --- SECTION: 06_triggers.sql ---

-- Triggers in public schema
CREATE OR REPLACE TRIGGER "trg_normalize_author_name"
BEFORE UPDATE ON public."authors"
FOR EACH ROW EXECUTE FUNCTION normalize_author_name();

CREATE OR REPLACE TRIGGER "trg_normalize_author_name"
BEFORE INSERT ON public."authors"
FOR EACH ROW EXECUTE FUNCTION normalize_author_name();

CREATE OR REPLACE TRIGGER "cleanup_orphaned_author_trigger"
AFTER DELETE ON public."book_authors"
FOR EACH ROW EXECUTE FUNCTION check_and_delete_orphaned_author();

CREATE OR REPLACE TRIGGER "cleanup_orphaned_author_trigger"
AFTER UPDATE ON public."book_authors"
FOR EACH ROW EXECUTE FUNCTION check_and_delete_orphaned_author();

CREATE OR REPLACE TRIGGER "cleanup_orphaned_series_trigger"
AFTER UPDATE ON public."book_series"
FOR EACH ROW EXECUTE FUNCTION check_and_delete_orphaned_series();

CREATE OR REPLACE TRIGGER "cleanup_orphaned_series_trigger"
AFTER DELETE ON public."book_series"
FOR EACH ROW EXECUTE FUNCTION check_and_delete_orphaned_series();

CREATE OR REPLACE TRIGGER "cleanup_orphaned_collection_trigger"
AFTER UPDATE ON public."collection_items"
FOR EACH ROW EXECUTE FUNCTION check_and_delete_orphaned_collection();

CREATE OR REPLACE TRIGGER "cleanup_orphaned_collection_trigger"
AFTER DELETE ON public."collection_items"
FOR EACH ROW EXECUTE FUNCTION check_and_delete_orphaned_collection();

CREATE OR REPLACE TRIGGER "audit_library_item_delete_trg"
AFTER DELETE ON public."library_items"
FOR EACH ROW EXECUTE FUNCTION audit_library_item_delete();

CREATE OR REPLACE TRIGGER "trigger_auto_link_library_item_authors"
AFTER INSERT ON public."library_items"
FOR EACH ROW EXECUTE FUNCTION auto_link_library_item_authors();

CREATE OR REPLACE TRIGGER "trigger_auto_link_library_item_authors"
AFTER UPDATE ON public."library_items"
FOR EACH ROW EXECUTE FUNCTION auto_link_library_item_authors();

CREATE OR REPLACE TRIGGER "trigger_before_library_item_separate_title_author"
BEFORE INSERT ON public."library_items"
FOR EACH ROW EXECUTE FUNCTION before_library_item_separate_title_author();

CREATE OR REPLACE TRIGGER "trigger_before_library_item_separate_title_author"
BEFORE UPDATE ON public."library_items"
FOR EACH ROW EXECUTE FUNCTION before_library_item_separate_title_author();




-- --- SECTION: 07_rls_policies.sql ---

-- Row Level Security (RLS) Policies
ALTER TABLE public."_backup_books_v1" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."authors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."book_authors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."book_insights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."book_series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."collection_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."custom_metadata_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."feed_episodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."feeds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."legacy_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."libraries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_item_deletion_audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_item_merge_audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."media_item_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."media_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."migrations_meta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."playback_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."playlist_media_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."playlists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."podcast_episodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."podcasts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."search_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sequelize_meta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."server_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."webauthn_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."webauthn_credentials" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert books" ON public."_backup_books_v1"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = ANY (ARRAY['admin'::text, 'root'::text]))))))
;

CREATE POLICY "Authenticated read access" ON public."_backup_books_v1"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can insert authors" ON public."authors"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = ANY (ARRAY['admin'::text, 'root'::text]))))))
;

CREATE POLICY "Authenticated read access" ON public."authors"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can insert book_authors" ON public."book_authors"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = ANY (ARRAY['admin'::text, 'root'::text]))))))
;

CREATE POLICY "Authenticated read access" ON public."book_authors"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Authenticated users can insert book insights" ON public."book_insights"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true)
;

CREATE POLICY "Authenticated users can read book insights" ON public."book_insights"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Authenticated users can update book insights" ON public."book_insights"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (true)
;

CREATE POLICY "Admins can insert book_series" ON public."book_series"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = ANY (ARRAY['admin'::text, 'root'::text]))))))
;

CREATE POLICY "Authenticated read access" ON public."book_series"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can delete collection_books" ON public."collection_items"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can insert collection_books" ON public."collection_items"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can update collection_books" ON public."collection_items"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Authenticated users can read collection_books" ON public."collection_items"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can delete collections" ON public."collections"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can insert collections" ON public."collections"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can update collections" ON public."collections"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Authenticated users can read collections" ON public."collections"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can manage custom_metadata_providers" ON public."custom_metadata_providers"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Users can manage their own devices" ON public."devices"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((user_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
;

CREATE POLICY "Admins can manage feed_episodes" ON public."feed_episodes"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can manage feeds" ON public."feeds"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Authenticated read access" ON public."legacy_users"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Authenticated read access" ON public."libraries"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can delete library_folders" ON public."library_folders"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can insert library_folders" ON public."library_folders"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can update library_folders" ON public."library_folders"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Authenticated users can read library_folders" ON public."library_folders"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can insert library_items" ON public."library_items"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = ANY (ARRAY['admin'::text, 'root'::text]))))))
;

CREATE POLICY "Admins can update library_items" ON public."library_items"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = ANY (ARRAY['admin'::text, 'root'::text]))))))
;

CREATE POLICY "Authenticated read access" ON public."library_items"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can manage media_item_shares" ON public."media_item_shares"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Users can manage their own progress" ON public."media_progress"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((( SELECT auth.uid() AS uid) = user_id))
;

CREATE POLICY "No public access to migrations_meta" ON public."migrations_meta"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (false)
;

CREATE POLICY "Users manage own sessions" ON public."playback_sessions"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((user_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
;

CREATE POLICY "Users can manage their own playlist items" ON public."playlist_media_items"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM playlists
  WHERE ((playlists.id = playlist_media_items.playlist_id) AND (playlists.user_id = ( SELECT auth.uid() AS uid))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM playlists
  WHERE ((playlists.id = playlist_media_items.playlist_id) AND (playlists.user_id = ( SELECT auth.uid() AS uid))))))
;

CREATE POLICY "Users can manage their own playlists" ON public."playlists"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((user_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
;

CREATE POLICY "Admins can delete podcast_episodes" ON public."podcast_episodes"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can insert podcast_episodes" ON public."podcast_episodes"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can update podcast_episodes" ON public."podcast_episodes"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Authenticated users can read podcast_episodes" ON public."podcast_episodes"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Admins can delete podcasts" ON public."podcasts"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can insert podcasts" ON public."podcasts"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Admins can update podcasts" ON public."podcasts"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = 'admin'::text)))))
;

CREATE POLICY "Authenticated users can read podcasts" ON public."podcasts"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Users can update their own profile" ON public."profiles"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((( SELECT auth.uid() AS uid) = id))
    WITH CHECK (
        (( SELECT auth.uid() AS uid) = id)
        AND (
            user_type = (SELECT p.user_type FROM public.profiles p WHERE p.id = (SELECT auth.uid() AS uid))
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = (SELECT auth.uid() AS uid) AND p.user_type IN ('admin', 'root')
            )
        )
    )
;

CREATE POLICY "Users can view their own profile" ON public."profiles"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((( SELECT auth.uid() AS uid) = id))
;

CREATE POLICY "Users can manage their own search history." ON public."search_history"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.uid() = user_id))
    WITH CHECK ((auth.uid() = user_id))
;

CREATE POLICY "No public access to sequelize_meta" ON public."sequelize_meta"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (false)
;

CREATE POLICY "Admins can insert series" ON public."series"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type = ANY (ARRAY['admin'::text, 'root'::text]))))))
;

CREATE POLICY "Authenticated read access" ON public."series"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "Authenticated read access" ON public."server_settings"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
;

CREATE POLICY "No client access to webauthn challenges" ON public."webauthn_challenges"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (false)
;

CREATE POLICY "Users can view their own passkeys" ON public."webauthn_credentials"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id))
;




-- --- MIGRATION: 20261111120000_protect_profiles_user_type_escalation.sql ---
-- Migration: 20261111120000_protect_profiles_user_type_escalation.sql
-- Description: Prevent privilege escalation on public.profiles via user_type self-updates.

-- 1. Create defense-in-depth trigger function
CREATE OR REPLACE FUNCTION public.prevent_user_type_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If user_type is modified
  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    -- Only service_role, postgres/admin, or an authenticated user who is ALREADY admin/root may alter user_type
    IF (
      auth.role() = 'service_role'
      OR current_user IN ('postgres', 'supabase_admin')
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_type IN ('admin', 'root')
      )
    ) THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Permission denied: unauthorized modification of user_type (attempted escalation by user %)', auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_type_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_user_type_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_type_self_escalation();

-- 2. Harden the RLS policy on public.profiles with an explicit WITH CHECK constraint
DROP POLICY IF EXISTS "Users can update their own profile" ON public."profiles";
CREATE POLICY "Users can update their own profile" ON public."profiles"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND (
            -- user_type must remain unchanged unless caller is already an admin/root
            user_type = (SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.user_type IN ('admin', 'root')
            )
        )
    );



-- --- MIGRATION: 20261111153000_standardize_admin_root_rls.sql ---
-- Migration: 20261111153000_standardize_admin_root_rls.sql
-- Description: Standardize all admin RLS policies to allow both 'admin' and 'root' roles consistently.

-- 1. collection_items
DROP POLICY IF EXISTS "Admins can delete collection_books" ON public."collection_items";
CREATE POLICY "Admins can delete collection_books" ON public."collection_items"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can insert collection_books" ON public."collection_items";
CREATE POLICY "Admins can insert collection_books" ON public."collection_items"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can update collection_books" ON public."collection_items";
CREATE POLICY "Admins can update collection_books" ON public."collection_items"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

-- 2. collections
DROP POLICY IF EXISTS "Admins can delete collections" ON public."collections";
CREATE POLICY "Admins can delete collections" ON public."collections"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can insert collections" ON public."collections";
CREATE POLICY "Admins can insert collections" ON public."collections"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can update collections" ON public."collections";
CREATE POLICY "Admins can update collections" ON public."collections"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

-- 3. custom_metadata_providers
DROP POLICY IF EXISTS "Admins can manage custom_metadata_providers" ON public."custom_metadata_providers";
CREATE POLICY "Admins can manage custom_metadata_providers" ON public."custom_metadata_providers"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

-- 4. feed_episodes
DROP POLICY IF EXISTS "Admins can manage feed_episodes" ON public."feed_episodes";
CREATE POLICY "Admins can manage feed_episodes" ON public."feed_episodes"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

-- 5. feeds
DROP POLICY IF EXISTS "Admins can manage feeds" ON public."feeds";
CREATE POLICY "Admins can manage feeds" ON public."feeds"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

-- 6. library_folders
DROP POLICY IF EXISTS "Admins can delete library_folders" ON public."library_folders";
CREATE POLICY "Admins can delete library_folders" ON public."library_folders"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can insert library_folders" ON public."library_folders";
CREATE POLICY "Admins can insert library_folders" ON public."library_folders"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can update library_folders" ON public."library_folders";
CREATE POLICY "Admins can update library_folders" ON public."library_folders"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

-- 7. media_item_shares
DROP POLICY IF EXISTS "Admins can manage media_item_shares" ON public."media_item_shares";
CREATE POLICY "Admins can manage media_item_shares" ON public."media_item_shares"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

-- 8. podcast_episodes
DROP POLICY IF EXISTS "Admins can delete podcast_episodes" ON public."podcast_episodes";
CREATE POLICY "Admins can delete podcast_episodes" ON public."podcast_episodes"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can insert podcast_episodes" ON public."podcast_episodes";
CREATE POLICY "Admins can insert podcast_episodes" ON public."podcast_episodes"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can update podcast_episodes" ON public."podcast_episodes";
CREATE POLICY "Admins can update podcast_episodes" ON public."podcast_episodes"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

-- 9. podcasts
DROP POLICY IF EXISTS "Admins can delete podcasts" ON public."podcasts";
CREATE POLICY "Admins can delete podcasts" ON public."podcasts"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can insert podcasts" ON public."podcasts";
CREATE POLICY "Admins can insert podcasts" ON public."podcasts"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));

DROP POLICY IF EXISTS "Admins can update podcasts" ON public."podcasts";
CREATE POLICY "Admins can update podcasts" ON public."podcasts"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.user_type IN ('admin', 'root'))))));


