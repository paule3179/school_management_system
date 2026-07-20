-- Migration: Add subjects and linking tables
-- Created for parent-teacher-student-subject linking

-- Create subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create class_subjects linking table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_subjects (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  hours_per_week INTEGER DEFAULT 4,
  UNIQUE(class_id, subject_id)
);

-- Create teacher_subjects linking table if it doesn't exist
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(teacher_id, subject_id)
);

-- Add parent_id to students table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE students ADD COLUMN parent_id INTEGER REFERENCES parents(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END
$$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher_id ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject_id ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);

-- Insert sample subjects (Ghanaian curriculum)
INSERT INTO subjects (name, code, description) VALUES
  ('Mathematics', 'MATH', 'Core Mathematics'),
  ('English Language', 'ENG', 'English Language and Literature'),
  ('Science', 'SCI', 'Integrated Science'),
  ('Social Studies', 'SS', 'Social Studies'),
  ('Physical Education', 'PE', 'Physical Education and Sports'),
  ('Information & Communication Technology', 'ICT', 'ICT'),
  ('Visual Arts', 'ART', 'Visual Arts'),
  ('Music', 'MUS', 'Music'),
  ('French', 'FR', 'French Language'),
  ('History', 'HIST', 'History'),
  ('Geography', 'GEOG', 'Geography'),
  ('Religious & Moral Education', 'RME', 'Religious & Moral Education'),
  ('Business Studies', 'BS', 'Business Studies'),
  ('Accounting', 'ACC', 'Accounting'),
  ('Economics', 'ECON', 'Economics')
ON CONFLICT (name) DO NOTHING;
