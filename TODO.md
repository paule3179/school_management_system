# Fix Plan: "Failed to load children" on Parent Performance Page

## Root Cause
The `getParentId()` helper in `dashboardController.js` and queries in `parentController.js` try to select `email` from the `parents` table, but the `parents` table doesn't have an `email` column (email is stored in the `users` table, linked via `parents.user_id = users.id`).

## Steps

### ✅ Step 1: Fix `getParentId()` in `backend/controllers/dashboardController.js`
- Changed from: `SELECT id, email FROM parents WHERE id = $1 OR user_id = $1`
- Changed to: `SELECT p.id, u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = $1 OR p.user_id = $1`
- Also fixed the email fallback query within `getParentId()` to join with `users` table

### ✅ Step 2: Fix `verifyChildOwnership()` in `backend/controllers/dashboardController.js`
- Changed from: `SELECT email FROM parents WHERE id = $1`
- Changed to: `SELECT u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = $1`

### ✅ Step 3: Fix email fallback in `getParentChildren()` in `dashboardController.js`
- Changed from: `SELECT id, email FROM parents WHERE email = $1 OR email = $2`
- Changed to: `SELECT p.id, u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE u.email = $1 OR LOWER(u.email) = LOWER($2)`

### ✅ Step 4: Fix `getMyChildren()` in `backend/controllers/parentController.js`
- Fixed email link subquery from `(SELECT email FROM parents WHERE id = $1)` to `(SELECT u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = $1)`
- Fixed fallback query from `SELECT email FROM parents WHERE id = $1` to `SELECT u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = $1`

### ✅ Step 5: Fix `enrichUserContext()` in `backend/middleware/auth.js`
- Changed from: `SELECT * FROM parents WHERE email = $1 OR email = $2`
- Changed to: `SELECT p.*, u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE u.email = $1 OR u.email = $2`

### ✅ Done: Fixed `ParentFees.jsx` parse error (line 186)

