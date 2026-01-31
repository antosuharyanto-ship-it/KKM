-- Migration 003: CampBar Tables
-- Description: Creates tables for Trip Boards, Participants, Date Voting, Gear Coordination, and Messages
-- Date: 2026-01-31

-- ============================================================================
-- 1. TRIP BOARDS TABLE
-- ============================================================================
CREATE TABLE trip_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Trip Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    destination VARCHAR(255),
    difficulty VARCHAR(20) DEFAULT 'moderate' CHECK (difficulty IN ('easy', 'moderate', 'hard', 'expert')),
    trip_type VARCHAR(50) DEFAULT 'camping',
    
    -- Participant Management
    max_participants INTEGER DEFAULT 10,
    current_participants INTEGER DEFAULT 1,
    
    -- Status
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'ongoing', 'completed', 'cancelled')),
    
    -- Dates (Final - after voting)
    start_date DATE,
    end_date DATE,
    dates_confirmed BOOLEAN DEFAULT FALSE,
    
    -- Meeting
    meeting_point VARCHAR(255),
    meeting_time TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_trip_boards_status ON trip_boards(status);
CREATE INDEX idx_trip_boards_start_date ON trip_boards(start_date);
CREATE INDEX idx_trip_boards_destination ON trip_boards(destination);
CREATE INDEX idx_trip_boards_organizer ON trip_boards(organizer_id);

-- ============================================================================
-- 2. TRIP PARTICIPANTS TABLE
-- ============================================================================
CREATE TABLE trip_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip_boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'interested' CHECK (status IN ('interested', 'confirmed', 'waitlist')),
    joined_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one user can only join a trip once
    UNIQUE(trip_id, user_id)
);

CREATE INDEX idx_trip_participants_trip ON trip_participants(trip_id);
CREATE INDEX idx_trip_participants_user ON trip_participants(user_id);

-- ============================================================================
-- 3. TRIP DATE VOTES (DATE OPTIONS)
-- ============================================================================
CREATE TABLE trip_date_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip_boards(id) ON DELETE CASCADE,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    vote_count INTEGER DEFAULT 0,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trip_date_votes_trip ON trip_date_votes(trip_id);

-- ============================================================================
-- 4. TRIP DATE USER VOTES (INDIVIDUAL VOTES)
-- ============================================================================
CREATE TABLE trip_date_user_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_option_id UUID NOT NULL REFERENCES trip_date_votes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    voted_at TIMESTAMP DEFAULT NOW(),
    
    -- One vote per user per date option
    UNIQUE(date_option_id, user_id)
);

CREATE INDEX idx_trip_date_user_votes_option ON trip_date_user_votes(date_option_id);
CREATE INDEX idx_trip_date_user_votes_user ON trip_date_user_votes(user_id);

-- ============================================================================
-- 5. TRIP GEAR ITEMS
-- ============================================================================
CREATE TABLE trip_gear_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip_boards(id) ON DELETE CASCADE,
    
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    assigned_to UUID REFERENCES users(id),
    is_covered BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trip_gear_items_trip ON trip_gear_items(trip_id);

-- ============================================================================
-- 6. TRIP MESSAGES
-- ============================================================================
CREATE TABLE trip_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip_boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trip_messages_trip ON trip_messages(trip_id);
CREATE INDEX idx_trip_messages_created ON trip_messages(created_at);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'trip_%'
ORDER BY table_name;

-- Expected output:
-- trip_boards
-- trip_date_user_votes
-- trip_date_votes
-- trip_gear_items
-- trip_messages
-- trip_participants

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename LIKE 'trip_%'
ORDER BY tablename, indexname;

-- Sample data count (should be 0 initially)
SELECT 
    (SELECT COUNT(*) FROM trip_boards) as trip_boards_count,
    (SELECT COUNT(*) FROM trip_participants) as participants_count,
    (SELECT COUNT(*) FROM trip_date_votes) as date_votes_count,
    (SELECT COUNT(*) FROM trip_gear_items) as gear_items_count,
    (SELECT COUNT(*) FROM trip_messages) as messages_count;

COMMENT ON TABLE trip_boards IS 'Main table for camping trip coordination';
COMMENT ON TABLE trip_participants IS 'Users who joined each trip';
COMMENT ON TABLE trip_date_votes IS 'Date options for voting';
COMMENT ON TABLE trip_date_user_votes IS 'Individual user votes on dates';
COMMENT ON TABLE trip_gear_items IS 'Gear checklist and assignments';
COMMENT ON TABLE trip_messages IS 'Trip discussion messages';
