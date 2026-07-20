const pool = require('../config/database');

class TimetableGenerator {
    constructor() {
        this.teacherSchedule = new Map();
        this.roomSchedule = new Map();
    }

    async generateTimetable(classId, term = 1, academicYear = '2024-2025') {
        console.log(`🎓 Generating timetable for class ${classId}`);
        
        this.teacherSchedule.clear();
        this.roomSchedule.clear();
        
        try {
            // First, verify class exists
            const classCheck = await pool.query('SELECT id, class_name FROM classes WHERE id = $1', [classId]);
            if (classCheck.rows.length === 0) {
                throw new Error(`Class with ID ${classId} not found`);
            }
            const className = classCheck.rows[0].class_name;
            console.log(`📋 Class: ${className} (ID: ${classId})`);
            
            // Get subjects for this specific class
            const subjects = await this.getClassSubjects(classId);
            
            if (!subjects || subjects.length === 0) {
                throw new Error(`No subjects found for class ${className}. Please add subjects to class_subjects table first.`);
            }
            
            console.log(`✅ Found ${subjects.length} subjects:`, subjects.map(s => s.name).join(', '));
            
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            const timeSlots = [
                { start: '08:00', end: '09:00' },
                { start: '09:00', end: '10:00' },
                { start: '10:30', end: '11:30' },
                { start: '11:30', end: '12:30' },
                { start: '13:30', end: '14:30' },
                { start: '14:30', end: '15:30' }
            ];
            
            // Clear existing timetable for this class and term
            const deleted = await pool.query(
                'DELETE FROM timetables WHERE class_id = $1 AND term = $2 RETURNING id',
                [classId, term]
            );
            console.log(`🗑️ Cleared ${deleted.rowCount} existing entries`);
            
            const entries = [];
            let usedSlots = new Set();
            
            // Create a schedule grid to track used slots per day
            const scheduleGrid = {};
            days.forEach(day => {
                scheduleGrid[day] = new Set();
            });
            
            // Schedule each subject based on periods per week
            for (const subject of subjects) {
                let periodsToSchedule = subject.periods_per_week || 3;
                
                if (subject.hours_per_week) {
                    periodsToSchedule = Math.min(subject.hours_per_week, 5);
                }
                
                console.log(`  📖 Scheduling ${subject.name}: ${periodsToSchedule} periods/week`);
                
                let scheduledCount = 0;
                let attempts = 0;
                const maxAttempts = 50;
                
                while (scheduledCount < periodsToSchedule && attempts < maxAttempts) {
                    const slot = await this.findAvailableSlot(
                        subject,
                        days,
                        timeSlots,
                        usedSlots,
                        scheduleGrid
                    );
                    
                    if (slot) {
                        entries.push({
                            class_id: classId,
                            teacher_id: null,
                            subject: subject.name,
                            day_of_week: slot.day,
                            start_time: slot.start_time,
                            end_time: slot.end_time,
                            room: this.generateRoomNumber(),
                            term: term,
                            academic_year: academicYear
                        });
                        
                        const slotKey = `${slot.day}-${slot.start_time}`;
                        usedSlots.add(slotKey);
                        scheduleGrid[slot.day].add(slot.start_time);
                        
                        scheduledCount++;
                    }
                    attempts++;
                }
                
                if (scheduledCount < periodsToSchedule) {
                    console.warn(`⚠️ Could only schedule ${scheduledCount}/${periodsToSchedule} periods for ${subject.name}`);
                }
            }
            
            // Add break periods
            const breakEntries = this.addBreakPeriods(classId, days, term, academicYear);
            entries.push(...breakEntries);
            
            // Save all entries to database
            let savedCount = 0;
            for (const entry of entries) {
                try {
                    const checkDuplicate = await pool.query(
                        `SELECT id FROM timetables 
                         WHERE class_id = $1 AND day_of_week = $2 AND start_time = $3 AND term = $4`,
                        [entry.class_id, entry.day_of_week, entry.start_time, entry.term]
                    );
                    
                    if (checkDuplicate.rows.length > 0) {
                        console.log(`⏭️ Skipping duplicate: ${entry.day_of_week} ${entry.start_time}`);
                        continue;
                    }
                    
                    await pool.query(`
                        INSERT INTO timetables (
                            class_id, teacher_id, subject, day_of_week, 
                            start_time, end_time, room, term, academic_year
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        entry.class_id, 
                        entry.teacher_id, 
                        entry.subject,
                        entry.day_of_week, 
                        entry.start_time, 
                        entry.end_time, 
                        entry.room, 
                        entry.term, 
                        entry.academic_year
                    ]);
                    savedCount++;
                } catch (dbError) {
                    console.error(`❌ Error saving entry for ${entry.subject} at ${entry.day_of_week} ${entry.start_time}:`, dbError.message);
                }
            }
            
            console.log(`✅ SUCCESS: Generated ${savedCount} timetable entries for ${className}`);
            return { 
                savedCount, 
                subjects: subjects.length,
                className: className,
                message: `Generated ${savedCount} entries for ${className}`
            };
            
        } catch (error) {
            console.error('❌ Generation error:', error);
            throw error;
        }
    }
    
    async getClassSubjects(classId) {
        console.log(`📚 Fetching subjects for class ${classId}...`);
        
        try {
            // Check if class_subjects table exists
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'class_subjects'
                );
            `);
            
            if (!tableCheck.rows[0].exists) {
                console.log('⚠️ class_subjects table does not exist!');
                // Fallback: Get subjects from subjects table
                const allSubjects = await pool.query(`
                    SELECT id as subject_id, name, code, description
                    FROM subjects 
                    WHERE status = 'active'
                    LIMIT 6
                `);
                
                if (allSubjects.rows.length > 0) {
                    console.log(`📚 Using ${allSubjects.rows.length} fallback subjects`);
                    return allSubjects.rows.map(s => ({
                        ...s,
                        periods_per_week: 3,
                        hours_per_week: 3,
                        name: s.name
                    }));
                }
                return [];
            }
            
            // Query class_subjects
            const result = await pool.query(`
                SELECT 
                    cs.id,
                    cs.subject_id,
                    cs.hours_per_week,
                    cs.periods_per_week,
                    cs.priority,
                    s.name,
                    s.code as subject_code,
                    s.description
                FROM class_subjects cs
                JOIN subjects s ON cs.subject_id = s.id
                WHERE cs.class_id = $1 AND s.status = 'active'
                ORDER BY COALESCE(cs.priority, 0) DESC, COALESCE(cs.hours_per_week, 3) DESC
            `, [classId]);
            
            if (result.rows.length === 0) {
                console.log(`⚠️ No subjects found in class_subjects for class ${classId}`);
                
                // Check if there are any subjects in the subjects table
                const allSubjects = await pool.query(`
                    SELECT id as subject_id, name, code, description
                    FROM subjects 
                    WHERE status = 'active'
                    LIMIT 6
                `);
                
                if (allSubjects.rows.length > 0) {
                    console.log(`📚 Using ${allSubjects.rows.length} fallback subjects from subjects table`);
                    return allSubjects.rows.map(s => ({
                        ...s,
                        periods_per_week: 3,
                        hours_per_week: 3,
                        name: s.name
                    }));
                }
                return [];
            }
            
            console.log(`📚 Found ${result.rows.length} subjects for class ${classId}`);
            console.log(`Subjects: ${result.rows.map(r => r.name).join(', ')}`);
            
            return result.rows;
            
        } catch (error) {
            console.error('Error fetching class subjects:', error);
            
            // Fallback: Get subjects from subjects table
            try {
                const allSubjects = await pool.query(`
                    SELECT id as subject_id, name, code, description
                    FROM subjects 
                    WHERE status = 'active'
                    LIMIT 6
                `);
                
                if (allSubjects.rows.length > 0) {
                    console.log(`📚 Using ${allSubjects.rows.length} fallback subjects`);
                    return allSubjects.rows.map(s => ({
                        ...s,
                        periods_per_week: 3,
                        hours_per_week: 3,
                        name: s.name
                    }));
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
            
            return [];
        }
    }
    
    async findAvailableSlot(subject, days, timeSlots, usedSlots, scheduleGrid) {
        const dayLoad = {};
        days.forEach(day => {
            dayLoad[day] = scheduleGrid[day] ? scheduleGrid[day].size : 0;
        });
        
        const sortedDays = [...days].sort((a, b) => dayLoad[a] - dayLoad[b]);
        const shuffledTimeSlots = [...timeSlots];
        this.shuffleArray(shuffledTimeSlots);
        
        for (const day of sortedDays) {
            for (const slot of shuffledTimeSlots) {
                const slotKey = `${day}-${slot.start}`;
                
                if (usedSlots.has(slotKey)) continue;
                if (slot.start === '10:00' || slot.start === '12:00') continue;
                
                return { 
                    day, 
                    start_time: slot.start, 
                    end_time: slot.end 
                };
            }
        }
        
        for (const day of days) {
            for (const slot of timeSlots) {
                const slotKey = `${day}-${slot.start}`;
                if (!usedSlots.has(slotKey)) {
                    return { 
                        day, 
                        start_time: slot.start, 
                        end_time: slot.end 
                    };
                }
            }
        }
        
        return null;
    }
    
    generateRoomNumber() {
        const rooms = ['101', '102', '103', '104', '105', '106', '201', '202', '203', '204', '205', '206', '301', '302', '303'];
        return rooms[Math.floor(Math.random() * rooms.length)];
    }
    
    addBreakPeriods(classId, days, term, academicYear) {
        const breaks = [];
        
        for (const day of days) {
            breaks.push({
                class_id: classId,
                teacher_id: null,
                subject: 'Break',
                day_of_week: day,
                start_time: '10:00',
                end_time: '10:30',
                room: 'Break Area',
                term: term,
                academic_year: academicYear
            });
            
            breaks.push({
                class_id: classId,
                teacher_id: null,
                subject: 'Lunch',
                day_of_week: day,
                start_time: '12:30',
                end_time: '13:30',
                room: 'Cafeteria',
                term: term,
                academic_year: academicYear
            });
        }
        
        return breaks;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

module.exports = new TimetableGenerator();