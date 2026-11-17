-- =====================================================================
-- AgriScan AI - Complete Supabase PostgreSQL Schema & Security Policies
-- Includes: Profiles, Diagnoses, Chat Messages, Failure Logs, App Settings,
-- Storage Buckets, and Row Level Security (RLS) Policies.
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT,
    country TEXT DEFAULT 'India',
    language TEXT DEFAULT 'en',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Public profiles are viewable by owner"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, mobile, country, language)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
        COALESCE(NEW.raw_user_meta_data->>'country', 'India'),
        COALESCE(NEW.raw_user_meta_data->>'language', 'en')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. DIAGNOSES (Plant disease diagnostic scans & AI findings)
CREATE TABLE IF NOT EXISTS public.diagnoses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    original_filename TEXT NOT NULL,
    crop TEXT NOT NULL,
    disease_name TEXT NOT NULL,
    tamil_name TEXT,
    scientific_name TEXT,
    pathogen_type TEXT,
    pathogen_name TEXT,
    disease_key TEXT NOT NULL,
    severity_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    severity_label TEXT NOT NULL,
    confidence NUMERIC(4,3) NOT NULL DEFAULT 0.000,
    symptoms TEXT,
    tamil_symptoms TEXT,
    causes TEXT,
    organic_treatment TEXT,
    tamil_organic_treatment TEXT,
    chemical_treatment TEXT,
    tamil_chemical_treatment TEXT,
    prevention_methods TEXT,
    tamil_prevention TEXT,
    monitoring_recommendations TEXT,
    when_to_consult_expert TEXT,
    alternative_diagnoses JSONB DEFAULT '[]'::jsonb,
    symptom_boxes JSONB DEFAULT '[]'::jsonb,
    image_quality JSONB DEFAULT '{}'::jsonb,
    is_uncertain BOOLEAN DEFAULT FALSE,
    uncertain_reason TEXT,
    gemini_explanation TEXT,
    original_image_path TEXT,
    annotated_image_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_id ON public.diagnoses(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_crop ON public.diagnoses(crop);
CREATE INDEX IF NOT EXISTS idx_diagnoses_created_at ON public.diagnoses(created_at DESC);

-- Enable RLS on diagnoses
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

-- Diagnoses Policies (Users can only access their own diagnoses, admins via service role)
DROP POLICY IF EXISTS "Users can view their own diagnoses" ON public.diagnoses;
CREATE POLICY "Users can view their own diagnoses"
    ON public.diagnoses FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert their own diagnoses" ON public.diagnoses;
CREATE POLICY "Users can insert their own diagnoses"
    ON public.diagnoses FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own diagnoses" ON public.diagnoses;
CREATE POLICY "Users can update their own diagnoses"
    ON public.diagnoses FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own diagnoses" ON public.diagnoses;
CREATE POLICY "Users can delete their own diagnoses"
    ON public.diagnoses FOR DELETE
    USING (auth.uid() = user_id);


-- 4. CHAT MESSAGES (AI Agricultural advisory messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id BIGSERIAL PRIMARY KEY,
    diagnosis_id BIGINT REFERENCES public.diagnoses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for chat
CREATE INDEX IF NOT EXISTS idx_chat_diagnosis_id ON public.chat_messages(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON public.chat_messages(user_id);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat Policies
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view their own chat messages"
    ON public.chat_messages FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 5. FAILED / UNCERTAINTY LOGS (Quality and triage audit logs)
CREATE TABLE IF NOT EXISTS public.failed_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    image_quality JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on failed_logs
ALTER TABLE public.failed_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own failed logs" ON public.failed_logs;
CREATE POLICY "Users can view their own failed logs"
    ON public.failed_logs FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert failed logs" ON public.failed_logs;
CREATE POLICY "Users can insert failed logs"
    ON public.failed_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 6. APP SETTINGS (Application configurations)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Settings
INSERT INTO public.app_settings (key, value)
VALUES
    ('model_version', 'PlantVillage-CV-v2.4'),
    ('confidence_threshold', '0.40'),
    ('min_leaf_coverage_pct', '8.0'),
    ('admin_dashboard_locked', 'true')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- App Settings Policy: Public can read, only service_role can write
DROP POLICY IF EXISTS "Allow public read-only access to app_settings" ON public.app_settings;
CREATE POLICY "Allow public read-only access to app_settings"
    ON public.app_settings FOR SELECT
    TO anon, authenticated
    USING (true);


-- 7. SUPABASE STORAGE BUCKET FOR PLANT IMAGES
-- (Executed via Supabase SQL editor or storage API)
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-images', 'plant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public access to view plant images" ON storage.objects;
CREATE POLICY "Public access to view plant images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'plant-images');

DROP POLICY IF EXISTS "Authenticated and guest upload access to plant images" ON storage.objects;
CREATE POLICY "Authenticated and guest upload access to plant images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'plant-images');


-- 8. REALTIME REPLICATION SETUP
ALTER PUBLICATION supabase_realtime ADD TABLE public.diagnoses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
