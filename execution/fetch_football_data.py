import os
import csv
import requests
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL:
    print("❌ Missing VITE_SUPABASE_URL in .env")
    exit(1)

SUPABASE_KEY = SERVICE_KEY if SERVICE_KEY else ANON_KEY
if not SUPABASE_KEY:
    print("❌ Missing Supabase credentials in .env")
    exit(1)

if SERVICE_KEY:
    print("✅ Using Service Role Key (Admin Mode)")
else:
    print("⚠️ Service Role Key NOT found. Falling back to Anon Key.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configuration - Extended to 10 seasons
SEASONS = [
    {"code": "2526", "name": "2025-2026"},
    {"code": "2425", "name": "2024-2025"},
    {"code": "2324", "name": "2023-2024"},
    {"code": "2223", "name": "2022-2023"},
    {"code": "2122", "name": "2021-2022"},
    {"code": "2021", "name": "2020-2021"},
    {"code": "1920", "name": "2019-2020"},
    {"code": "1819", "name": "2018-2019"},
    {"code": "1718", "name": "2017-2018"},
    {"code": "1617", "name": "2016-2017"},
]

LEAGUE_CONFIGS = [
    {"name": "Premier League", "code": "PL", "file": "E0.csv"},
    {"name": "Serie A", "code": "SA", "file": "I1.csv"},
    {"name": "La Liga", "code": "LL", "file": "SP1.csv"},
    {"name": "Bundesliga", "code": "BL", "file": "D1.csv"},
    {"name": "Ligue 1", "code": "L1", "file": "F1.csv"}
]

def parse_date(date_str):
    try:
        # Expected formats: DD/MM/YYYY or DD/MM/YY
        parts = date_str.split('/')
        if len(parts) != 3:
            return None
        day, month, year = parts
        if len(year) == 2:
            year = "20" + year
        return f"{year}-{month}-{day}"
    except Exception:
        return None

def fetch_and_insert():
    total_matches = 0
    total_seasons = 0

    for season in SEASONS:
        for league in LEAGUE_CONFIGS:
            url = f"https://www.football-data.co.uk/mmz4281/{season['code']}/{league['file']}"
            print(f"\n📥 Fetching {league['name']} {season['name']} from {url}...")

            try:
                response = requests.get(url)
                if response.status_code != 200:
                    print(f"❌ Failed to fetch: {response.status_code}")
                    continue

                decoded_content = response.content.decode('utf-8')
                cr = csv.reader(decoded_content.splitlines(), delimiter=',')
                rows = list(cr)
                if not rows:
                    continue

                headers = [h.strip() for h in rows[0]]
                
                try:
                    date_idx = headers.index('Date')
                    home_idx = headers.index('HomeTeam')
                    away_idx = headers.index('AwayTeam')
                    fthg_idx = headers.index('FTHG')
                    ftag_idx = headers.index('FTAG')
                    hs_idx = headers.index('HS') if 'HS' in headers else -1
                    as_idx = headers.index('AS') if 'AS' in headers else -1
                    hst_idx = headers.index('HST') if 'HST' in headers else -1
                    ast_idx = headers.index('AST') if 'AST' in headers else -1
                except ValueError as e:
                    print(f"❌ CSV format error: {e}")
                    continue

                matches = []
                for row in rows[1:]:
                    if len(row) < 5:
                        continue
                    
                    iso_date = parse_date(row[date_idx])
                    if not iso_date:
                        continue

                    home_team = row[home_idx]
                    away_team = row[away_idx]
                    if not home_team or not away_team:
                        continue

                    try:
                        fthg = int(row[fthg_idx])
                        ftag = int(row[ftag_idx])
                    except ValueError:
                        continue

                    # xG estimation logic
                    home_xg = 0
                    away_xg = 0
                    if hst_idx != -1 and hs_idx != -1:
                        try:
                            hst = float(row[hst_idx])
                            hs = float(row[hs_idx])
                            ast = float(row[ast_idx])
                            as_val = float(row[as_idx])
                            
                            home_xg = round((hst * 0.32) + ((hs - hst) * 0.04), 2)
                            away_xg = round((ast * 0.32) + ((as_val - ast) * 0.04), 2)
                        except (ValueError, IndexError):
                            pass

                    matches.append({
                        "date": iso_date,
                        "home_team": home_team,
                        "away_team": away_team,
                        "home_goals": fthg,
                        "away_goals": ftag,
                        "home_xg": home_xg,
                        "away_xg": away_xg,
                        "league": league["code"],
                        "season": season["name"]
                    })

                if matches:
                    print(f"✅ Parsed {len(matches)} matches. Upserting to Supabase...")
                    result = supabase.table("matches").upsert(matches, on_conflict="date,home_team,away_team").execute()
                    total_matches += len(matches)
                    total_seasons += 1
                    print(f"✅ Success for {league['name']} {season['name']}")

            except Exception as e:
                print(f"❌ Error processing {league['name']}: {e}")

    print(f"\n{'='*50}")
    print(f"🏆 IMPORT COMPLETE!")
    print(f"📊 Total Matches: {total_matches}")
    print(f"📅 Seasons Processed: {total_seasons}")
    print(f"{'='*50}")

if __name__ == "__main__":
    fetch_and_insert()
