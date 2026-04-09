-- Add avatar column to users table
ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT 'paper-bag-head';
