-- Add source_filename column to track where files came from
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS source_filename TEXT;

-- Make title nullable for initial insert (will be set after AI processing)
ALTER TABLE transcripts ALTER COLUMN title DROP NOT NULL;

-- Add default for title
ALTER TABLE transcripts ALTER COLUMN title SET DEFAULT 'Processing...';
