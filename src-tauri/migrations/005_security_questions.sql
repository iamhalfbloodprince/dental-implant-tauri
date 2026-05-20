-- Add security questions for password recovery

-- Create security questions table
CREATE TABLE IF NOT EXISTS security_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL UNIQUE
);

-- Add columns to users table if they don't exist
ALTER TABLE users ADD COLUMN security_question_id INTEGER;
ALTER TABLE users ADD COLUMN security_answer_hash TEXT;

-- Default security questions
INSERT OR IGNORE INTO security_questions (id, question) VALUES 
(1, 'What was the name of your first pet?'),
(2, 'What city were you born in?'),
(3, 'What is your mother''s maiden name?'),
(4, 'What was your first school?'),
(5, 'What is your favorite color?');

UPDATE schema_migrations SET version = 5 WHERE version = 4;