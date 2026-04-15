# Currency Configuration Implementation Plan
✅ **Plan Approved**: Frontend-driven updates, dropdown (GHS/USD/EUR/GBP/NGN), admin-only access

## Progress: 4/14 Complete ✅

## Remaining Steps (10/14)

### Phase 1: Backend Foundation ✓ (4/4)
- ✅ **1.1** Update `backend/prisma/schema.prisma` 
- ✅ **1.2** Create `backend/models/settingsModel.js`
- ✅ **1.3** Create `backend/controllers/settingsController.js`
- ✅ **1.4** Update `backend/routes/settingsRoutes.js`

### Phase 2: Integration Updates ✓ (2/2)
- ✅ **2.1** Update `backend/models/libraryModel.js`
- ✅ **2.2** Manual migration needed (run: cd backend && npx prisma migrate dev --name add_currency_settings)

### Phase 1: Backend Foundation (4 steps)
- [ ] **1.1** Update `backend/prisma/schema.prisma` - Add `settings` model (currency_symbol, currency_name, currency_code)
- [ ] **1.2** Create `backend/models/settingsModel.js` - CRUD operations for settings
- [ ] **1.3** Create `backend/controllers/settingsController.js` - GET/POST /api/settings
- [ ] **1.4** Update `backend/routes/settingsRoutes.js` - Add `/settings` endpoints

### Phase 2: Integration Updates (2 steps)
- [ ] **2.1** Update `backend/models/libraryModel.js` - Use dynamic currency for fines
- [ ] **2.2** Seed default GHS settings in `backend/data/mockData.js` or migration

### Phase 3: Frontend Implementation (5 steps)
- [ ] **3.1** Update `frontend/src/App.jsx` - Fetch dynamic currency, replace hardcoded "₵"
- [ ] **3.2** Add Settings nav tab + admin-only currency form
- [ ] **3.3** Currency dropdown (GHS/USD/EUR/GBP/NGN)
- [ ] **3.4** Real-time preview in Fees table
- [ ] **3.5** Update receipt/payment displays

### Phase 4: Security & Migration (2 steps)
- [ ] **4.1** Add admin auth middleware to settings endpoints
- [ ] **4.2** Run `npx prisma migrate dev --name add_currency_settings`

### Phase 5: Testing (1 step)
- [ ] **5.1** Test: Change to USD, verify all displays/receipts update

**Current Progress: Starting Phase 1.1 (Schema update)**
