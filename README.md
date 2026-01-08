# FLP • Oracle (Alpha)

**Football League Prediction** is a next-gen predictive modeling tool that combines **Geometric Analysis** (Phase Space Trajectories) with **Probabilistic Models** (Poisson, Monte Carlo) to forecast match outcomes with mathematical rigour.

![Status](https://img.shields.io/badge/Status-Alpha-blue)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Supabase%20%7C%20Recharts-black)

## 🧠 Core Logic

The application moves beyond simple averages by implementing a "Thick Client" architecture where complex math runs directly in the browser:

*   **Geometric Engine**: Visualizes team form as a trajectory in 2D Phase Space ($Goals_{for}$ vs $Goals_{against}$).
*   **Poisson Model**: Calculates precise probabilities for 1/X/2 and Exact Score matrices based on expected goals (xG).
*   **Data Ingestion**: Admin tools to upload historical CSV data (e.g., Football-Data.co.uk) to feed the engines with real-world inputs.

## 🛠️ Technology Stack

*   **Frontend**: React (Vite) + TypeScript
*   **Styling**: Tailwind CSS (Custom "Brutalist" Theme)
*   **Database**: Supabase (PostgreSQL + RLS)
*   **Auth**: Supabase Auth (Magic Link / Password)
*   **Viz**: Recharts

## 🚀 Getting Started

### Prerequisites
*   Node.js 20+
*   Supabase Account

### Installation

1.  Clone the repo:
    ```bash
    git clone https://github.com/DrRobot24/flp_oracle.git
    cd flp_oracle
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment:
    Create a `.env` file in the root:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
    *(Ask Admin for keys if you don't have them)*

4.  Run Local Dev Server:
    ```bash
    npm run dev
    ```

## 🔐 Admin Access

To enable Admin features (Data Upload):
1.  Sign up in the app.
2.  In Supabase Dashboard -> Table `profiles`, find your user row.
3.  Change `role` from `user` to `admin`.

## 🗺️ Roadmap

See [docs/roadmap.md](./docs/roadmap.md) for the detailed implementation plan.

---

*Private Project. Do not distribute without permission.*
