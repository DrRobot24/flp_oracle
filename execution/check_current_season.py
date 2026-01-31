"""
CHECK CURRENT SEASON - Verifica squadre stagione 2025-2026
"""

import os
import sys
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_current_season():
    print("\n" + "="*70)
    print("🔍 VERIFICA SQUADRE 2025-2026")
    print("="*70)
    
    leagues = ['SA', 'PL', 'BL', 'LL', 'L1']
    league_names = {
        'SA': '🇮🇹 Serie A',
        'PL': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
        'BL': '🇩🇪 Bundesliga',
        'LL': '🇪🇸 La Liga',
        'L1': '🇫🇷 Ligue 1'
    }
    
    expected_teams = {
        'SA': ["Inter", "Milan", "Juventus", "Napoli", "Roma", "Lazio",
               "Atalanta", "Bologna", "Fiorentina", "Torino", "Verona",
               "Udinese", "Empoli", "Genoa", "Cagliari", "Parma",
               "Lecce", "Como", "Venezia", "Monza"],
        'PL': ["Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton",
               "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich",
               "Leicester", "Liverpool", "Man City", "Man United", "Newcastle",
               "Nott'm Forest", "Southampton", "Tottenham", "West Ham", "Wolves"],
        'BL': ["Bayern Munich", "Dortmund", "Leverkusen", "RB Leipzig", "Ein Frankfurt",
               "Freiburg", "Stuttgart", "Hoffenheim", "M'gladbach", "Wolfsburg",
               "Mainz", "Union Berlin", "Werder Bremen", "Augsburg", "Bochum",
               "Heidenheim", "St Pauli", "Holstein Kiel"],
        'LL': ["Real Madrid", "Barcelona", "Ath Madrid", "Ath Bilbao", "Sevilla",
               "Betis", "Sociedad", "Villarreal", "Valencia", "Celta",
               "Mallorca", "Girona", "Osasuna", "Alaves", "Getafe",
               "Las Palmas", "Espanol", "Leganes", "Valladolid", "Vallecano"],
        'L1': ["Paris SG", "Monaco", "Lyon", "Marseille", "Lille",
               "Nice", "Lens", "Rennes", "Strasbourg", "Reims",
               "Nantes", "Montpellier", "Toulouse", "Brest", "Le Havre",
               "Auxerre", "Angers", "St Etienne"]
    }
    
    for league in leagues:
        print(f"\n{league_names[league]}:")
        print("-" * 50)
        
        # Get teams for 2025-2026
        result = supabase.table('matches').select('home_team, away_team, date').eq('league', league).eq('season', '2025-2026').order('date', desc=True).limit(500).execute()
        
        if not result.data:
            print(f"  ⚠️  Nessun dato per 2025-2026!")
            continue
        
        teams = set()
        latest_date = None
        for m in result.data:
            if m['home_team']:
                teams.add(m['home_team'])
            if m['away_team']:
                teams.add(m['away_team'])
            if not latest_date and m['date']:
                latest_date = m['date']
        
        print(f"  📊 Partite: {len(result.data)} | Squadre: {len(teams)}")
        print(f"  📅 Ultima partita: {latest_date}")
        
        expected = set(expected_teams.get(league, []))
        present = teams
        missing = expected - present
        extra = present - expected
        
        if missing:
            print(f"  ❌ MANCANTI: {', '.join(sorted(missing))}")
        else:
            print(f"  ✅ Tutte le {len(expected)} squadre attese presenti!")
        
        if extra:
            print(f"  ➕ EXTRA: {', '.join(sorted(extra))}")
        
        print(f"\n  Squadre nel DB ({len(teams)}):")
        teams_list = sorted(teams)
        # Print in columns
        cols = 4
        for i in range(0, len(teams_list), cols):
            row = teams_list[i:i+cols]
            print("    " + " | ".join(f"{t:18}" for t in row))
    
    print("\n" + "="*70)

if __name__ == "__main__":
    check_current_season()
