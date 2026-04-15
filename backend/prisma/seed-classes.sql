-- Complete Ghanaian School Classes (KG1 - JHS3)
-- Run: psql $DATABASE_URL -f backend/prisma/seed-classes.sql

-- Clear existing classes (optional, comment if you want to keep)
DELETE FROM classes WHERE level != 'Legacy';

-- KG Classes (4)
INSERT INTO classes (name, level, capacity, academic_year) VALUES
('KG1A', 'KG', 25, '2024-2025'),
('KG1B', 'KG', 25, '2024-2025'),
('KG2A', 'KG', 25, '2024-2025'),
('KG2B', 'KG', 25, '2024-2025');

-- Primary Classes (12 - P1A/B to P6A/B)
INSERT INTO classes (name, level, capacity, academic_year) VALUES
('P1A', 'Primary', 35, '2024-2025'), ('P1B', 'Primary', 35, '2024-2025'),
('P2A', 'Primary', 35, '2024-2025'), ('P2B', 'Primary', 35, '2024-2025'),
('P3A', 'Primary', 35, '2024-2025'), ('P3B', 'Primary', 35, '2024-2025'),
('P4A', 'Primary', 35, '2024-2025'), ('P4B', 'Primary', 35, '2024-2025'),
('P5A', 'Primary', 35, '2024-2025'), ('P5B', 'Primary', 35, '2024-2025'),
('P6A', 'Primary', 35, '2024-2025'), ('P6B', 'Primary', 35, '2024-2025');

-- JHS Classes (6 - JHS1A/B to JHS3A/B)
INSERT INTO classes (name, level, capacity, academic_year) VALUES
('JHS1A', 'JHS', 40, '2024-2025'), ('JHS1B', 'JHS', 40, '2024-2025'),
('JHS2A', 'JHS', 40, '2024-2025'), ('JHS2B', 'JHS', 40, '2024-2025'),
('JHS3A', 'JHS', 40, '2024-2025'), ('JHS3B', 'JHS', 40, '2024-2025');

-- Verify
SELECT level, COUNT(*) as count FROM classes GROUP BY level ORDER BY level;
