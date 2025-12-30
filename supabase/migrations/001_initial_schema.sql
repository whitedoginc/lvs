-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Topics table
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on topic name for faster lookups
CREATE INDEX idx_topics_name ON topics(name);

-- Transcripts table
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    summary TEXT,
    key_points JSONB DEFAULT '[]'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    quotes JSONB DEFAULT '[]'::jsonb,
    speakers JSONB DEFAULT '[]'::jsonb,
    recorded_date DATE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    embedding vector(1536),
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT
);

-- Create indexes
CREATE INDEX idx_transcripts_uploaded_at ON transcripts(uploaded_at DESC);
CREATE INDEX idx_transcripts_uploaded_by ON transcripts(uploaded_by);
CREATE INDEX idx_transcripts_recorded_date ON transcripts(recorded_date);
CREATE INDEX idx_transcripts_processed ON transcripts(processed);

-- Junction table for transcript-topic relationships
CREATE TABLE transcript_topics (
    transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    relevance_score FLOAT DEFAULT 1.0,
    PRIMARY KEY (transcript_id, topic_id)
);

-- Create indexes for the junction table
CREATE INDEX idx_transcript_topics_transcript ON transcript_topics(transcript_id);
CREATE INDEX idx_transcript_topics_topic ON transcript_topics(topic_id);

-- Create a function for semantic search using cosine similarity
CREATE OR REPLACE FUNCTION search_transcripts(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    summary TEXT,
    key_points JSONB,
    recorded_date DATE,
    uploaded_at TIMESTAMPTZ,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.title,
        t.summary,
        t.key_points,
        t.recorded_date,
        t.uploaded_at,
        1 - (t.embedding <=> query_embedding) AS similarity
    FROM transcripts t
    WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
    ORDER BY t.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Row Level Security (RLS) policies
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_topics ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all transcripts
CREATE POLICY "Authenticated users can view transcripts"
    ON transcripts FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can insert transcripts
CREATE POLICY "Authenticated users can insert transcripts"
    ON transcripts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploaded_by);

-- Policy: Authenticated users can update transcripts
CREATE POLICY "Authenticated users can update transcripts"
    ON transcripts FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Authenticated users can delete transcripts
CREATE POLICY "Authenticated users can delete transcripts"
    ON transcripts FOR DELETE
    TO authenticated
    USING (true);

-- Policy: Authenticated users can view all topics
CREATE POLICY "Authenticated users can view topics"
    ON topics FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can manage topics
CREATE POLICY "Authenticated users can insert topics"
    ON topics FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update topics"
    ON topics FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete topics"
    ON topics FOR DELETE
    TO authenticated
    USING (true);

-- Policy: Authenticated users can manage transcript_topics
CREATE POLICY "Authenticated users can view transcript_topics"
    ON transcript_topics FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert transcript_topics"
    ON transcript_topics FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transcript_topics"
    ON transcript_topics FOR DELETE
    TO authenticated
    USING (true);

-- Create a default "Uncategorized" topic
INSERT INTO topics (name, description) VALUES ('Uncategorized', 'Default topic for unassigned transcripts');
