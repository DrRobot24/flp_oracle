import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def check_db():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing credentials")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = supabase.table('news').select('*').eq('team_name', 'Inter').execute()
    
    print(f"Total entries for Inter: {len(res.data)}")
    for row in res.data[:10]:
        print(f"[{row['source']}] {row['title']} (Sent: {row['sentiment']})")

if __name__ == "__main__":
    check_db()
