// src/pages/teacher/index.js

// Export all components from the teacher folder
export { default as TeacherClasses } from './TeacherClasses';
export { default as TeacherGrades } from './TeacherGrades';
export { default as TeacherDashboard } from './TeacherDashboard';
export { default as AssessmentEntry } from './components/AssessmentEntry';
export { default as ExamEntry } from './components/ExamEntry';
export { default as ReportCard } from './components/ReportCard';
export { default as PerformanceSummary } from './components/PerformanceSummary';  
export { default as GradeSettings } from './components/GradeSettings';             
export { default as ExportOptions } from './components/ExportOptions';             

// Also export the utils
export * from './utils/gradeCalculations';   

export default {
  TeacherClasses,
  TeacherGrades,
  TeacherDashboard,
  AssessmentEntry,
  ExamEntry,
  ReportCard,
  PerformanceSummary,  
  GradeSettings,       
  ExportOptions,        
};