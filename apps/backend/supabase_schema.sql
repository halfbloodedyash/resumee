-- Supabase Schema for Resume Matcher
-- Run this in your Supabase SQL Editor to set up tables + RLS

-- ===== TABLES =====

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id TEXT NOT NULL UNIQUE,
    content TEXT,
    content_type TEXT DEFAULT 'md',
    filename TEXT,
    is_master BOOLEAN DEFAULT FALSE,
    parent_id TEXT,
    processed_data JSONB,
    processing_status TEXT DEFAULT 'pending',
    cover_letter TEXT,
    outreach_message TEXT,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_resume_id ON resumes(resume_id);
CREATE INDEX idx_resumes_is_master ON resumes(user_id, is_master) WHERE is_master = TRUE;

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL UNIQUE,
    content TEXT,
    resume_id TEXT,
    analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_job_id ON jobs(job_id);

-- Improvements table
CREATE TABLE IF NOT EXISTS improvements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL UNIQUE,
    original_resume_id TEXT NOT NULL,
    tailored_resume_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    improvements JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_improvements_user_id ON improvements(user_id);
CREATE INDEX idx_improvements_tailored ON improvements(tailored_resume_id);

-- User config table (stores API keys, preferences per user)
CREATE TABLE IF NOT EXISTS user_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== ROW LEVEL SECURITY =====

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

-- Resumes: users can only access their own
CREATE POLICY "Users can view own resumes"
    ON resumes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
    ON resumes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
    ON resumes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
    ON resumes FOR DELETE
    USING (auth.uid() = user_id);

-- Jobs: users can only access their own
CREATE POLICY "Users can view own jobs"
    ON jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
    ON jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
    ON jobs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
    ON jobs FOR DELETE
    USING (auth.uid() = user_id);

-- Improvements: users can only access their own
CREATE POLICY "Users can view own improvements"
    ON improvements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own improvements"
    ON improvements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User config: users can only access their own
CREATE POLICY "Users can view own config"
    ON user_config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
    ON user_config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
    ON user_config FOR UPDATE
    USING (auth.uid() = user_id);

-- ===== AUTO-UPDATE updated_at =====

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resumes_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_config_updated_at
    BEFORE UPDATE ON user_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
