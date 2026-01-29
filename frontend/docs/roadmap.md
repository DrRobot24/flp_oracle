# MAGOTTO Project Roadmap

## 📅 Current Status: Phase 2.5 (Data Integration)
- **Version**: Beta 0.1
- **Focus**: Connecting Real Data to Geometric Engine

## 📂 Project Structure
- `/src`: Application Source Code
- `/sql`: Database Schemas & Migrations (Supabase)
- `/docs`: Documentation & Planning

## 🚀 Roadmap

### ✅ Phase 1: Foundation (Completed)
- [x] **Project Setup**: React + Vite + TypeScript.
- [x] **Database**: Supabase integration with `predictions` table.
- [x] **Auth**: RBAC System (Admin vs User) + Protected Routes.
- [x] **Math**: Basic Poisson & Geometric Engine (Synthetic Data).

### 🚧 Phase 2: Data Ingestion (In Progress)
- [x] **Admin Upload**: CSV Data Ingestion via `DataUploader`.
- [x] **Schema**: `matches` table for historical data.
- [x] **Data Wiring**: Dropdowns populated from DB.
- [ ] **Real Trajectories**:
    - Query last 5-10 matches for selected teams.
    - Calculate rolling averages for Goals For/Assuming.
    - Replace synthetic "random" moves with actual historical stats in the Phase Space graph.

### 🔮 Phase 3: Advanced Algorithms (Next Up)
- [ ] **Monte Carlo Simulation**:
    - Simulate the match 10,000 times based on calculated strengths.
    - Output confidence intervals for Win/Draw/Loss.
- [ ] **FFT (Fast Fourier Transform)**:
    - Analyze "Form Cycles" (Is the team peaking or crashing?).
    - visual widget showing wave cycles.
- [ ] **Sensitivity Analysis**:
    - Sliders to adjust inputs manually and see "What If" scenarios on the graph.

### 🎨 Phase 4: Polish & Deploy
- [ ] **Mobile Responsiveness**: Ensure graphs work on phones.
- [ ] **Theming**: Dark Mode toggle.
- [ ] **Deployment**: Publish to Vercel/Netlify.
