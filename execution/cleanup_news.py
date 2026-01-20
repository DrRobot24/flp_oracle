import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

NON_SOCCER_KEYWORDS = [
    "tennis", "sinner", "djokovic", "alcaraz", "nba", "basketball", 
    "cricket", "baseball", "f1", "formula 1", "boxing", "ufc", 
    "olympics", "golf", "bbl", "perth scorchers", "sixers", "anthony joshua"
]

def cleanup():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing credentials")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Connected to Supabase for cleanup...")

    # Delete news where title or summary contains non-soccer keywords
    for kw in NON_SOCCER_KEYWORDS:
        print(f"Cleaning keywords: {kw}...")
        # Delete from title
        res = supabase.table('news').delete().ilike('title', f'%{kw}%').execute()
        # Delete from summary
        res = supabase.table('news').delete().ilike('summary', f'%{kw}%').execute()

    print("Cleanup complete!")

if __name__ == "__main__":
    cleanup()
