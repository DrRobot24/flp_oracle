import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def aggressive_cleanup():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing credentials")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Connected to Supabase for TOTAL PURGE...")

    # Purge EVERYTHING for 'Inter' so we can start fresh with strict filters
    res = supabase.table('news').delete().eq('team_name', 'Inter').execute()
    print(f"Purged Inter news. Ready for fresh scrape.")

if __name__ == "__main__":
    aggressive_cleanup()
