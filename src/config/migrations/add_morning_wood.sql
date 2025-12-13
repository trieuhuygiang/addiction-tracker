-- Migration: Add morning_wood tracking to entries table
-- Tracks morning wood (tree 🌳) as a positive indicator

ALTER TABLE entries 
ADD COLUMN IF NOT EXISTS has_morning_wood BOOLEAN DEFAULT FALSE;

-- Add index for querying morning wood entries
CREATE INDEX IF NOT EXISTS idx_entries_morning_wood 
ON entries(user_id, has_morning_wood) 
WHERE has_morning_wood = true;
