# TODO - Fix Attendance Card in Teacher Dashboard

## Steps
- [x] Analyzed the attendance flow (TeacherAttendance -> saveAttendance -> getTeacherStats -> TeacherDashboard stats card)
- [x] Identified root cause: TeacherDashboard fetches stats only once on mount; navigating back from /teacher/attendance does not refetch
- [x] Frontend: Add useEffect in `frontend/src/components/TeacherDashboard.jsx` to refetch dashboard data when navigating to `/teacher` route
- [x] Verify backend getTeacherStats attendance calculation is correct (queries attendance table for today's present records joined through teacher's classes)
- [x] Wire TeacherPromotion component into the `/teacher/promotion` route in TeacherDashboard.jsx (was falling through to the catch-all dashboard route)
- [x] Fix ESLint unused variable error in TeacherDashboard.jsx
- [x] Test the fix
</content>
