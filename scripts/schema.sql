-- ==============================================================================
-- SMART TUITION EXAM PORTAL - COMPLETE DATABASE SCHEMA
-- Compatible with PostgreSQL & Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student')),
    real_name VARCHAR(100) NOT NULL,
    school VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval')),
    must_change_password BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO system_settings (key, value)
VALUES 
    ('registration_mode', '"open"')
ON CONFLICT (key) DO NOTHING;

-- 4. TESTS TABLE
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    chapter VARCHAR(150),
    topic VARCHAR(150),
    class_grade VARCHAR(50),
    description TEXT,
    instructions TEXT,
    total_marks NUMERIC(6, 2) NOT NULL DEFAULT 10,
    duration_minutes INT NOT NULL DEFAULT 15,
    exam_mode VARCHAR(30) NOT NULL DEFAULT 'instant_quick_test' CHECK (exam_mode IN ('teacher_reviewed', 'instant_quick_test')),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'active', 'completed', 'archived')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_attempts INT DEFAULT 1,
    access_code VARCHAR(50),
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_options BOOLEAN DEFAULT FALSE,
    negative_marking_enabled BOOLEAN DEFAULT FALSE,
    result_visibility VARCHAR(30) DEFAULT 'immediate' CHECK (result_visibility IN ('immediate', 'after_publish', 'manual')),
    answer_review_visibility BOOLEAN DEFAULT TRUE,
    anti_cheat_settings JSONB DEFAULT '{"fullscreen_required": false, "tab_monitoring": true, "clipboard_monitoring": true, "context_menu_disabled": true, "keyboard_monitoring": true, "idle_monitoring": true}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_exam_mode ON tests(exam_mode);

-- 5. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL CHECK (question_type IN ('mcq_single', 'mcq_multiple', 'numerical', 'true_false', 'short_answer')),
    marks NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    explanation TEXT,
    numerical_answer NUMERIC(12, 4),
    numerical_tolerance NUMERIC(8, 4) DEFAULT 0.0,
    numerical_tolerance_type VARCHAR(20) DEFAULT 'exact' CHECK (numerical_tolerance_type IN ('exact', 'absolute', 'range')),
    numerical_range_min NUMERIC(12, 4),
    numerical_range_max NUMERIC(12, 4),
    subject VARCHAR(100),
    chapter VARCHAR(150),
    topic VARCHAR(150),
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
    image_url TEXT,
    ai_confidence NUMERIC(4, 2),
    requires_verification BOOLEAN DEFAULT FALSE,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);

-- 6. QUESTION OPTIONS TABLE (for MCQs and True/False)
CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_letter VARCHAR(5) NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT,
    order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_question_options_q_id ON question_options(question_id);

-- 7. TEST ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INT DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'evaluated', 'pending_review', 'published')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_spent_seconds INT DEFAULT 0,
    total_marks_possible NUMERIC(6, 2) NOT NULL,
    provisional_academic_score NUMERIC(6, 2) DEFAULT 0,
    teacher_adjusted_score NUMERIC(6, 2),
    integrity_deduction NUMERIC(6, 2) DEFAULT 0,
    final_score NUMERIC(6, 2) DEFAULT 0,
    percentage NUMERIC(5, 2) DEFAULT 0,
    is_auto_submitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON test_attempts(status);

-- 8. STUDENT RESPONSES TABLE
CREATE TABLE IF NOT EXISTS student_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_options JSONB,
    text_response TEXT,
    numerical_response NUMERIC(12, 4),
    is_visited BOOLEAN DEFAULT FALSE,
    is_marked_for_review BOOLEAN DEFAULT FALSE,
    is_answered BOOLEAN DEFAULT FALSE,
    is_correct BOOLEAN,
    marks_awarded NUMERIC(5, 2) DEFAULT 0,
    ai_suggested_marks NUMERIC(5, 2),
    ai_evaluation_reason TEXT,
    teacher_override_marks NUMERIC(5, 2),
    teacher_feedback TEXT,
    flagged_by_teacher BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_responses_attempt_id ON student_responses(attempt_id);

-- 9. INTEGRITY EVENTS TABLE (Exam Anti-Cheating Logs)
CREATE TABLE IF NOT EXISTS integrity_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    duration_seconds INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_attempt ON integrity_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_integrity_student ON integrity_events(student_id);

-- 10. ACTIVITY LOGS TABLE (Comprehensive User Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_event ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_logs(timestamp DESC);

-- 11. TEACHER REVIEWS TABLE
CREATE TABLE IF NOT EXISTS teacher_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID UNIQUE NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'finalized', 'published')),
    integrity_adjustment_amount NUMERIC(5, 2) DEFAULT 0,
    integrity_adjustment_reason TEXT,
    general_feedback TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- 12. QUESTION BANK TABLE
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(100) NOT NULL,
    chapter VARCHAR(150),
    topic VARCHAR(150),
    difficulty VARCHAR(20) DEFAULT 'medium',
    question_type VARCHAR(30) NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB,
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    marks NUMERIC(5, 2) DEFAULT 1.0,
    negative_marks NUMERIC(5, 2) DEFAULT 0.0,
    source VARCHAR(255),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PDF UPLOADS TABLE
CREATE TABLE IF NOT EXISTS pdf_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    status VARCHAR(30) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'extracted', 'parsed', 'failed')),
    extracted_text TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
