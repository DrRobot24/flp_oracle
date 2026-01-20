import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

HISTORICAL_MATCHES = [
    {"date": "2003-09-17", "home_team": "Arsenal", "away_team": "Inter", "home_goals": 0, "away_goals": 3, "league": "CL", "season": "2003-2004"},
    {"date": "2003-11-25", "home_team": "Inter", "away_team": "Arsenal", "home_goals": 1, "away_goals": 5, "league": "CL", "season": "2003-2004"},
    {"date": "2024-11-06", "home_team": "Inter", "away_team": "Arsenal", "home_goals": 1, "away_goals": 0, "league": "CL", "season": "2024-2025"}
]

def patch_history():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing credentials")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Inserting Inter vs Arsenal historical matches...")
    
    try:
        res = supabase.table('matches').upsert(HISTORICAL_MATCHES, on_conflict='date,home_team,away_team').execute()
        print("Successfully patched Inter-Arsenal history!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    patch_history()
