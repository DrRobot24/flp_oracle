"""
SYNC TEAMS - Normalizza e sincronizza le squadre nel database MAGOTTO
Corregge i nomi duplicati e le inconsistenze.
"""

import os
import sys
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client, Client

# Setup
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials (need SERVICE_ROLE_KEY)")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Comprehensive normalization map
# Format: "Wrong/Variant Name" -> "Canonical Name"
NORMALIZATION_MAP = {
    # ========== SERIE A ==========
    "Internazionale Milano": "Inter",
    "Internazionale": "Inter",
    "FC Internazionale": "Inter",
    "Inter Milan": "Inter",
    "AC Milan": "Milan",
    "AC Milan Milano": "Milan",
    "AS Roma": "Roma",
    "SSC Napoli": "Napoli",
    "Juventus FC": "Juventus",
    "Hellas Verona": "Verona",
    "Atalanta BC": "Atalanta",
    "SS Lazio": "Lazio",
    
    # ========== PREMIER LEAGUE ==========
    "Manchester City": "Man City",
    "Manchester C": "Man City",
    "Manchester United": "Man United",
    "Manchester U": "Man United",
    "Newcastle United": "Newcastle",
    "Tottenham Hotspur": "Tottenham",
    "West Ham United": "West Ham",
    "Nottingham Forest": "Nott'm Forest",
    "Nottingham": "Nott'm Forest",
    "Wolverhampton": "Wolves",
    "Wolverhampton Wanderers": "Wolves",
    "Leicester City": "Leicester",
    "Leeds United": "Leeds",
    "Sheffield Utd": "Sheffield United",
    "Brighton & Hove Albion": "Brighton",
    "Brighton Hove Albion": "Brighton",
    
    # ========== LA LIGA ==========
    "Athletic Bilbao": "Ath Bilbao",
    "Athletic Club": "Ath Bilbao",
    "Atletico Madrid": "Ath Madrid",
    "Atlético Madrid": "Ath Madrid",
    "Atlético de Madrid": "Ath Madrid",
    "ClubAtletico Madrid": "Ath Madrid",
    "Real Sociedad": "Sociedad",
    "Real Betis": "Betis",
    "Rayo Vallecano": "Vallecano",
    "Celta Vigo": "Celta",
    "RCD Espanyol": "Espanol",
    "Deportivo Alaves": "Alaves",
    "CD Leganes": "Leganes",
    "Real Valladolid": "Valladolid",
    "UD Las Palmas": "Las Palmas",
    "Villarreal CF": "Villarreal",
    "Real Madrid CF": "Real Madrid",
    "Madrid CF": "Real Madrid",
    
    # ========== BUNDESLIGA ==========
    "Bayern München": "Bayern Munich",
    "FC Bayern": "Bayern Munich",
    "FC Bayern München": "Bayern Munich",
    "Borussia Dortmund": "Dortmund",
    "BVB": "Dortmund",
    "Bayer Leverkusen": "Leverkusen",
    "Bayer 04 Leverkusen": "Leverkusen",
    "Bayer 04": "Leverkusen",
    "04 Leverkusen": "Leverkusen",
    "Borussia M'gladbach": "M'gladbach",
    "Borussia Mönchengladbach": "M'gladbach",
    "Monchengladbach": "M'gladbach",
    "Eintracht Frankfurt": "Ein Frankfurt",
    "Frankfurt": "Ein Frankfurt",
    "RB Leipzig": "RB Leipzig",
    "Leipzig": "RB Leipzig",
    "TSG Hoffenheim": "Hoffenheim",
    "VfL Wolfsburg": "Wolfsburg",
    "SC Freiburg": "Freiburg",
    "VfB Stuttgart": "Stuttgart",
    "Mainz 05": "Mainz",
    "1. FC Union Berlin": "Union Berlin",
    "Werder Bremen": "Werder Bremen",
    "FC Augsburg": "Augsburg",
    "VfL Bochum": "Bochum",
    "1. FC Heidenheim": "Heidenheim",
    "FC St. Pauli": "St Pauli",
    "Holstein Kiel": "Holstein Kiel",
    
    # ========== LIGUE 1 ==========
    "Paris Saint-Germain": "Paris SG",
    "PSG": "Paris SG",
    "Saint-Germain": "Paris SG",
    "Olympique de Marseille": "Marseille",
    "Olympique Marseille": "Marseille",
    "OM": "Marseille",
    "Olympique Lyon": "Lyon",
    "Olympique Lyonnais": "Lyon",
    "Saint-Etienne": "St Etienne",
    "AS Monaco": "Monaco",
    "OGC Nice": "Nice",
    "RC Lens": "Lens",
    "LOSC Lille": "Lille",
    "Stade Rennais": "Rennes",
    "RC Strasbourg": "Strasbourg",
    "Stade de Reims": "Reims",
    "FC Nantes": "Nantes",
    "Montpellier HSC": "Montpellier",
    "Toulouse FC": "Toulouse",
    "Stade Brestois": "Brest",
    "Le Havre AC": "Le Havre",
    "AJ Auxerre": "Auxerre",
    "Angers SCO": "Angers",
    
    # ========== EREDIVISIE ==========
    "AZ Alkmaar": "AZ",
    "PSV Eindhoven": "PSV",
    "Ajax Amsterdam": "Ajax",
    "Feyenoord Rotterdam": "Feyenoord",
    "FC Utrecht": "Utrecht",
    "FC Twente": "Twente",
    "Sparta Rotterdam": "Sparta Rotterdam",
    "FC Groningen": "Groningen",
    
    # ========== CHAMPIONS LEAGUE FIXES ==========
    "City": "Man City",  # Incomplete name from CL parsing
    "United": "Man United",  # Incomplete name from CL parsing
    "Club": "Club Brugge",  # Incomplete parsing
    "Hotspur": "Tottenham",  # Incomplete name
    "Lisboa e Benfica": "Benfica",
    "Sport Lisboa e Benfica": "Benfica",
    "Clube de Portugal": "Sporting CP",
    "Sporting": "Sporting CP",
    "Sport": "Sporting CP",
    "Club Brugge KV": "Club Brugge",
    "Brugge KV": "Club Brugge",
    "FK Bodø/Glimt": "Bodø/Glimt",
    "Qarabağ Ağdam FK": "Qarabag",
    "Ağdam FK": "Qarabag",
    "FK Kairat": "Kairat",
    "Olympiakos SFP": "Olympiakos",
    "Royale Union Saint-Gilloise": "Union SG",
    "Union Saint-Gilloise": "Union SG",
    "Slavia Praha": "Slavia Prague",
    "FC København": "Copenhagen",
    "København": "Copenhagen",
    "BC": "Club Brugge",  # Bad parsing
    "CF": "Villarreal",  # Bad parsing - context dependent, might need manual fix
    
    # ========== PORTUGUESE ==========
    "Sporting Clube de Portugal": "Sporting CP",
    "Sport Lisboa e Benfica (POR)": "Benfica",
    "FC Porto": "Porto",
    "SC Braga": "Braga",
    
    # ========== SCOTTISH ==========
    "Celtic Glasgow": "Celtic",
    "Rangers Glasgow": "Rangers",
    
    # ========== TURKISH ==========
    "Galatasaray SK": "Galatasaray",
    "Fenerbahce SK": "Fenerbahce",
    "Besiktas JK": "Besiktas",
}

def normalize_teams():
    print("\n" + "="*60)
    print("🔄 MAGOTTO - NORMALIZZAZIONE SQUADRE")
    print("="*60)
    
    total_updated = 0
    
    for old_name, new_name in NORMALIZATION_MAP.items():
        if old_name == new_name:
            continue
            
        # Update home_team
        try:
            res_h = supabase.table('matches').update({"home_team": new_name}).eq("home_team", old_name).execute()
            updated_h = len(res_h.data) if res_h.data else 0
        except Exception as e:
            print(f"❌ Error updating home_team '{old_name}': {e}")
            updated_h = 0
        
        # Update away_team
        try:
            res_a = supabase.table('matches').update({"away_team": new_name}).eq("away_team", old_name).execute()
            updated_a = len(res_a.data) if res_a.data else 0
        except Exception as e:
            print(f"❌ Error updating away_team '{old_name}': {e}")
            updated_a = 0
        
        if updated_h + updated_a > 0:
            print(f"✅ '{old_name}' → '{new_name}': {updated_h} home, {updated_a} away")
            total_updated += updated_h + updated_a
    
    print(f"\n📊 Totale record aggiornati: {total_updated}")
    
    # Clean up bad Champions League entries (entries that are just partial names)
    print("\n🧹 Pulizia record CL malformati...")
    
    bad_entries = ["BC", "CF", "Club", "City", "United", "Hotspur", "Sport"]
    for bad in bad_entries:
        # Check if these exact entries exist - check home and away separately
        check_h = supabase.table('matches').select('id, home_team, away_team').eq("home_team", bad).execute()
        check_a = supabase.table('matches').select('id, home_team, away_team').eq("away_team", bad).execute()
        all_matches = (check_h.data or []) + (check_a.data or [])
        if all_matches:
            print(f"⚠️  Trovati {len(all_matches)} record con '{bad}' - richiedono revisione manuale")
            for rec in all_matches[:3]:
                print(f"   ID {rec['id']}: {rec['home_team']} vs {rec['away_team']}")
    
    print("\n" + "="*60)
    print("✅ NORMALIZZAZIONE COMPLETATA")
    print("="*60)

def verify_current_season_teams():
    """Verify 2025-2026 season has all expected teams"""
    print("\n" + "="*60)
    print("📋 VERIFICA SQUADRE STAGIONE 2025-2026")
    print("="*60)
    
    current_season_teams = {
        'SA': {
            'expected': ["Inter", "Milan", "Juventus", "Napoli", "Roma", "Lazio",
                        "Atalanta", "Bologna", "Fiorentina", "Torino", "Verona",
                        "Udinese", "Empoli", "Genoa", "Cagliari", "Parma",
                        "Lecce", "Como", "Venezia", "Monza"],
            'name': 'Serie A'
        },
        'PL': {
            'expected': ["Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton",
                        "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich",
                        "Leicester", "Liverpool", "Man City", "Man United", "Newcastle",
                        "Nott'm Forest", "Southampton", "Tottenham", "West Ham", "Wolves"],
            'name': 'Premier League'
        },
        'BL': {
            'expected': ["Bayern Munich", "Dortmund", "Leverkusen", "RB Leipzig", "Ein Frankfurt",
                        "Freiburg", "Stuttgart", "Hoffenheim", "M'gladbach", "Wolfsburg",
                        "Mainz", "Union Berlin", "Werder Bremen", "Augsburg", "Bochum",
                        "Heidenheim", "St Pauli", "Holstein Kiel"],
            'name': 'Bundesliga'
        },
        'LL': {
            'expected': ["Real Madrid", "Barcelona", "Ath Madrid", "Ath Bilbao", "Sevilla",
                        "Betis", "Sociedad", "Villarreal", "Valencia", "Celta",
                        "Mallorca", "Girona", "Osasuna", "Alaves", "Getafe",
                        "Las Palmas", "Espanol", "Leganes", "Valladolid", "Vallecano"],
            'name': 'La Liga'
        }
    }
    
    for league_code, config in current_season_teams.items():
        # Fetch teams from 2025-2026 season
        result = supabase.table('matches').select('home_team, away_team').eq('league', league_code).eq('season', '2025-2026').execute()
        
        if not result.data:
            print(f"\n⚠️  {config['name']}: Nessun dato per 2025-2026")
            continue
        
        teams = set()
        for m in result.data:
            if m['home_team']:
                teams.add(m['home_team'])
            if m['away_team']:
                teams.add(m['away_team'])
        
        expected = set(config['expected'])
        missing = expected - teams
        extra = teams - expected
        
        print(f"\n{config['name']} ({league_code}):")
        print(f"   Squadre nel DB: {len(teams)} | Attese: {len(expected)}")
        
        if missing:
            print(f"   ❌ Mancanti: {', '.join(sorted(missing))}")
        else:
            print(f"   ✅ Tutte le squadre attese presenti!")
        
        if extra:
            print(f"   ➕ Extra: {', '.join(sorted(extra))}")

if __name__ == "__main__":
    normalize_teams()
    verify_current_season_teams()
