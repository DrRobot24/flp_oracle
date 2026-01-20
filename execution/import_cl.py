import os
import re
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

RAW_TEXT = """
» League, Matchday 1
  Tue Sep/16 2025
    18.45  Athletic Club (ESP)     v Arsenal FC (ENG)         0-2 (0-0)
           PSV (NED)               v Royale Union Saint-Gilloise (BEL)  1-3 (0-2)
    21.00  Juventus FC (ITA)       v Borussia Dortmund (GER)  4-4 (0-0)
           Sport Lisboa e Benfica (POR) v Qarabağ Ağdam FK (AZE)   2-3 (2-1)
           Tottenham Hotspur FC (ENG) v Villarreal CF (ESP)      1-0 (1-0)
           Real Madrid CF (ESP)    v Olympique de Marseille (FRA)  2-1 (1-1)
  Wed Sep/17
    18.45  SK Slavia Praha (CZE)   v FK Bodø/Glimt (NOR)      2-2 (1-0)
           PAE Olympiakos SFP (GRE) v Paphos FC (CYP)          0-0
    21.00  AFC Ajax (NED)          v FC Internazionale Milano (ITA)  0-2 (0-1)
           Liverpool FC (ENG)      v Club Atlético de Madrid (ESP)  3-2 (2-1)
           Paris Saint-Germain FC (FRA) v Atalanta BC (ITA)        4-0 (2-0)
           FC Bayern München (GER) v Chelsea FC (ENG)         3-1 (2-1)
  Thu Sep/18
    18.45  FC København (DEN)      v Bayer 04 Leverkusen (GER)  2-2 (1-0)
           Club Brugge KV (BEL)    v AS Monaco FC (MCO)       4-1 (3-0)
    21.00  Newcastle United FC (ENG) v FC Barcelona (ESP)       1-2 (0-0)
           Manchester City FC (ENG) v SSC Napoli (ITA)         2-0 (0-0)
           Eintracht Frankfurt (GER) v Galatasaray SK (TUR)     5-1 (3-1)
           Sporting Clube de Portugal (POR) v FK Kairat (KAZ)          4-1 (1-0)


» League, Matchday 2
  Tue Sep/30
    18.45  Atalanta BC (ITA)       v Club Brugge KV (BEL)     2-1 (0-1)
           FK Kairat (KAZ)         v Real Madrid CF (ESP)     0-5 (0-1)
    21.00  Galatasaray SK (TUR)    v Liverpool FC (ENG)       1-0 (1-0)
           Club Atlético de Madrid (ESP) v Eintracht Frankfurt (GER)  5-1 (3-0)
           Olympique de Marseille (FRA) v AFC Ajax (NED)           4-0 (3-0)
           FK Bodø/Glimt (NOR)     v Tottenham Hotspur FC (ENG)  2-2 (0-0)
           Paphos FC (CYP)         v FC Bayern München (GER)  1-5 (1-4)
           Chelsea FC (ENG)        v Sport Lisboa e Benfica (POR)  1-0 (1-0)
           FC Internazionale Milano (ITA) v SK Slavia Praha (CZE)    3-0 (2-0)
  Wed Oct/1
    18.45  Qarabağ Ağdam FK (AZE)  v FC København (DEN)       2-0 (1-0)
           Royale Union Saint-Gilloise (BEL) v Newcastle United FC (ENG)  0-4 (0-2)
    21.00  Borussia Dortmund (GER) v Athletic Club (ESP)      4-1 (1-0)
           FC Barcelona (ESP)      v Paris Saint-Germain FC (FRA)  1-2 (1-1)
           AS Monaco FC (MCO)      v Manchester City FC (ENG)  2-2 (1-2)
           Bayer 04 Leverkusen (GER) v PSV (NED)                1-1 (0-0)
           Arsenal FC (ENG)        v PAE Olympiakos SFP (GRE)  2-0 (1-0)
           Villarreal CF (ESP)     v Juventus FC (ITA)        2-2 (1-0)
           SSC Napoli (ITA)        v Sporting Clube de Portugal (POR)  2-1 (1-0)


» League, Matchday 3
  Tue Oct/21
    18.45  FC Barcelona (ESP)      v PAE Olympiakos SFP (GRE)  6-1 (2-0)
           FK Kairat (KAZ)         v Paphos FC (CYP)          0-0
    21.00  Royale Union Saint-Gilloise (BEL) v FC Internazionale Milano (ITA)  0-4 (0-2)
           FC København (DEN)      v Borussia Dortmund (GER)  2-4 (1-1)
           Bayer 04 Leverkusen (GER) v Paris Saint-Germain FC (FRA)  2-7 (1-4)
           Villarreal CF (ESP)     v Manchester City FC (ENG)  0-2 (0-2)
           Arsenal FC (ENG)        v Club Atlético de Madrid (ESP)  4-0 (0-0)
           Newcastle United FC (ENG) v Sport Lisboa e Benfica (POR)  3-0 (1-0)
           PSV (NED)               v SSC Napoli (ITA)         6-2 (2-1)
  Wed Oct/22
    18.45  Galatasaray SK (TUR)    v FK Bodø/Glimt (NOR)      3-1 (2-0)
           Athletic Club (ESP)     v Qarabağ Ağdam FK (AZE)   3-1 (1-1)
    21.00  Eintracht Frankfurt (GER) v Liverpool FC (ENG)       1-5 (1-3)
           Atalanta BC (ITA)       v SK Slavia Praha (CZE)    0-0
           Sporting Clube de Portugal (POR) v Olympique de Marseille (FRA)  2-1 (0-1)
           AS Monaco FC (MCO)      v Tottenham Hotspur FC (ENG)  0-0
           FC Bayern München (GER) v Club Brugge KV (BEL)     4-0 (3-0)
           Chelsea FC (ENG)        v AFC Ajax (NED)           5-1 (4-1)
           Real Madrid CF (ESP)    v Juventus FC (ITA)        1-0 (0-0)


» League, Matchday 4
  Tue Nov/4
    18.45  SK Slavia Praha (CZE)   v Arsenal FC (ENG)         0-3 (0-1)
           SSC Napoli (ITA)        v Eintracht Frankfurt (GER)  0-0
    21.00  Juventus FC (ITA)       v Sporting Clube de Portugal (POR)  1-1 (1-1)
           Club Atlético de Madrid (ESP) v Royale Union Saint-Gilloise (BEL)  3-1 (1-0)
           Tottenham Hotspur FC (ENG) v FC København (DEN)       4-0 (1-0)
           FK Bodø/Glimt (NOR)     v AS Monaco FC (MCO)       0-1 (0-1)
           PAE Olympiakos SFP (GRE) v PSV (NED)                1-1 (1-0)
           Paris Saint-Germain FC (FRA) v FC Bayern München (GER)  1-2 (0-2)
           Liverpool FC (ENG)      v Real Madrid CF (ESP)     1-0 (0-0)
  Wed Nov/5
    18.45  Paphos FC (CYP)         v Villarreal CF (ESP)      1-0 (0-0)
           Qarabağ Ağdam FK (AZE)  v Chelsea FC (ENG)         2-2 (2-1)
    21.00  FC Internazionale Milano (ITA) v FK Kairat (KAZ)          2-1 (1-0)
           Manchester City FC (ENG) v Borussia Dortmund (GER)  4-1 (2-0)
           Club Brugge KV (BEL)    v FC Barcelona (ESP)       3-3 (2-1)
           Sport Lisboa e Benfica (POR) v Bayer 04 Leverkusen (GER)  0-1 (0-0)
           Olympique de Marseille (FRA) v Atalanta BC (ITA)        0-1 (0-0)
           AFC Ajax (NED)          v Galatasaray SK (TUR)     0-3 (0-0)
           Newcastle United FC (ENG) v Athletic Club (ESP)      2-0 (1-0)
"""

# Helper to clean team names
def clean_team_name(name: str):
    # Remove (XXX) and FC, SSC, PAE etc.
    name = re.sub(r'\(.*?\)', '', name)
    name = name.replace('FC ', '').replace('SSC ', '').replace('PAE ', '').replace('SK ', '').replace('AS ', '').replace('AFC ', '')
    name = name.replace(' Clube de Portugal', '').replace(' Lisboa e Benfica', '')
    name = name.replace(' Internazionale Milano', 'Inter')
    name = name.replace(' Atlético de Madrid', 'Atletico Madrid')
    name = name.replace(' Real Madrid CF', 'Real Madrid')
    name = name.replace(' FC Barcelona', 'Barcelona')
    name = name.replace(' FC Bayern München', 'Bayern Munich')
    name = name.replace(' Olympique de Marseille', 'Marseille')
    name = name.replace(' Paris Saint-Germain', 'PSG')
    name = name.replace(' Tottenham Hotspur', 'Tottenham')
    name = name.replace(' Manchester City', 'Man City')
    name = name.replace(' Newcastle United', 'Newcastle')
    name = name.replace(' Bayer 04 Leverkusen', 'Leverkusen')
    name = name.replace(' Eintracht Frankfurt', 'Eintracht')
    name = name.replace(' Borussia Dortmund', 'Dortmund')
    return name.strip()

def parse_and_import():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing Supabase credentials")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    matches_to_insert = []
    current_date = None
    year = "2025" # Base year, will flip to 2026 later if needed

    lines = RAW_TEXT.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line: continue
        
        # Match Matchday headers - skip
        if line.startswith('»'): continue
        
        # Match Date lines (e.g., Tue Sep/16 2025 or Wed Oct/1)
        date_match = re.search(r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/(\d+)', line)
        if date_match:
            month_str = date_match.group(2)
            day = int(date_match.group(3))
            
            # If line contains a year, use it
            year_match = re.search(r'\d{4}', line)
            if year_match:
                year = year_match.group(0)
            else:
                # Heuristic: Sep-Dec is 2025, Jan-May is 2026
                if month_str in ["Jan", "Feb", "Mar", "Apr", "May"]:
                    year = "2026"
                else:
                    year = "2025"
            
            # Convert month name to number
            month = datetime.strptime(month_str, "%b").month
            current_date = f"{year}-{month:02d}-{day:02d}"
            continue
            
        # Match Game lines (e.g., 18.45  Athletic Club (ESP) v Arsenal FC (ENG) 0-2 (0-0))
        # Regex for: Time? Home v Away Score
        game_match = re.search(r'(\d{2}\.\d{2})?\s+(.*?)\s+v\s+(.*?)\s+(\d+)-(\d+)', line)
        if game_match and current_date:
            home = clean_team_name(game_match.group(2))
            away = clean_team_name(game_match.group(3))
            fthg = int(game_match.group(4))
            ftag = int(game_match.group(5))
            
            matches_to_insert.append({
                "date": current_date,
                "home_team": home,
                "away_team": away,
                "home_goals": fthg,
                "away_goals": ftag,
                "league": "CL",
                "season": "2025-2026"
            })

    if matches_to_insert:
        print(f"Upserting {len(matches_to_insert)} matches...")
        try:
            res = supabase.table('matches').upsert(matches_to_insert, on_conflict='date,home_team,away_team').execute()
            print("Successfully imported Champions League matches!")
        except Exception as e:
            print(f"Error importing: {e}")
    else:
        print("No matches found to import")

if __name__ == "__main__":
    parse_and_import()
