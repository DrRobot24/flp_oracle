"""
CHECK TEAMS - Verifica squadre nel database MAGOTTO
Elenca tutte le squadre presenti e identifica eventuali duplicati o inconsistenze.
"""

import os
import sys
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client, Client

# Setup
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_teams():
    print("\n" + "="*60)
    print("🔍 MAGOTTO - VERIFICA SQUADRE DATABASE")
    print("="*60)
    
    # Fetch all matches
    print("\n📥 Caricamento partite dal database...")
    all_data = []
    offset = 0
    batch_size = 1000
    
    while True:
        result = supabase.table('matches').select('home_team, away_team, league, season').range(offset, offset + batch_size - 1).execute()
        if not result.data:
            break
        all_data.extend(result.data)
        offset += batch_size
        if len(result.data) < batch_size:
            break
    
    print(f"✅ Caricate {len(all_data)} partite")
    
    # Extract unique teams
    teams_by_league = defaultdict(set)
    all_teams = set()
    
    for match in all_data:
        home = match.get('home_team', '')
        away = match.get('away_team', '')
        league = match.get('league', 'Unknown')
        
        if home:
            all_teams.add(home)
            teams_by_league[league].add(home)
        if away:
            all_teams.add(away)
            teams_by_league[league].add(away)
    
    # Print summary
    print(f"\n📊 RIEPILOGO:")
    print(f"   Squadre totali uniche: {len(all_teams)}")
    print(f"   Campionati: {len(teams_by_league)}")
    
    # Print teams by league
    print("\n" + "="*60)
    print("📋 SQUADRE PER CAMPIONATO")
    print("="*60)
    
    league_names = {
        'PL': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
        'E1': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship',
        'SA': '🇮🇹 Serie A',
        'I2': '🇮🇹 Serie B',
        'LL': '🇪🇸 La Liga',
        'BL': '🇩🇪 Bundesliga',
        'L1': '🇫🇷 Ligue 1',
        'N1': '🇳🇱 Eredivisie',
        'P1': '🇵🇹 Primeira Liga',
        'B1': '🇧🇪 Jupiler League',
        'T1': '🇹🇷 Super Lig',
        'G1': '🇬🇷 Ethniki Katigoria',
        'SC0': '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish Premiership',
        'ARG': '🇦🇷 Argentina Primera',
        'BRA': '🇧🇷 Brazil Serie A',
        'USA': '🇺🇸 USA MLS',
        'MEX': '🇲🇽 Mexico Liga MX',
        'JPN': '🇯🇵 Japan J-League',
        'CHN': '🇨🇳 China Super League',
        'NOR': '🇳🇴 Norway Eliteserien',
        'SWE': '🇸🇪 Sweden Allsvenskan',
        'DNK': '🇩🇰 Denmark Superliga',
        'POL': '🇵🇱 Poland Ekstraklasa',
        'RUS': '🇷🇺 Russia Premier',
        'SWZ': '🇨🇭 Switzerland Super',
        'AUT': '🇦🇹 Austria Bundesliga',
        'CL': '🇪🇺 Champions League'
    }
    
    for league_code in sorted(teams_by_league.keys()):
        teams = sorted(teams_by_league[league_code])
        league_name = league_names.get(league_code, league_code)
        print(f"\n{league_name} ({len(teams)} squadre):")
        
        # Print in columns
        cols = 3
        for i in range(0, len(teams), cols):
            row = teams[i:i+cols]
            print("   " + "  |  ".join(f"{t:20}" for t in row))
    
    # Check for potential duplicates (similar names)
    print("\n" + "="*60)
    print("⚠️  POTENZIALI DUPLICATI O INCONSISTENZE")
    print("="*60)
    
    # Known variations that should be normalized
    known_variations = {
        # Italian teams
        "Inter": ["Internazionale", "Internazionale Milano", "Inter Milan", "FC Internazionale"],
        "Milan": ["AC Milan", "AC Milan Milano"],
        "Juventus": ["Juventus FC", "Juve"],
        "Roma": ["AS Roma"],
        "Napoli": ["SSC Napoli"],
        "Atalanta": ["Atalanta BC"],
        "Verona": ["Hellas Verona"],
        "Lazio": ["SS Lazio"],
        
        # Spanish teams
        "Athletic Club": ["Athletic Bilbao"],
        "Atletico Madrid": ["Atlético Madrid", "Atletico"],
        "Real Betis": ["Betis"],
        
        # English teams
        "Man City": ["Manchester City", "Manchester C"],
        "Man United": ["Manchester United", "Manchester U"],
        "Tottenham": ["Spurs"],
        "West Ham": ["West Ham United"],
        "Newcastle": ["Newcastle United"],
        "Brighton": ["Brighton & Hove Albion", "Brighton Hove Albion"],
        "Nott'm Forest": ["Nottingham Forest", "Nottingham"],
        "Wolves": ["Wolverhampton", "Wolverhampton Wanderers"],
        "Leicester": ["Leicester City"],
        "Leeds": ["Leeds United"],
        "Sheffield Utd": ["Sheffield United"],
        
        # French teams
        "Paris SG": ["Paris Saint-Germain", "PSG"],
        "Marseille": ["Olympique de Marseille", "Olympique Marseille", "OM"],
        "Lyon": ["Olympique Lyon", "Olympique Lyonnais"],
        "St Etienne": ["Saint-Etienne"],
        
        # German teams
        "Bayern Munich": ["FC Bayern", "Bayern München"],
        "Dortmund": ["Borussia Dortmund", "BVB"],
        "M'gladbach": ["Borussia M'gladbach", "Monchengladbach", "Borussia Mönchengladbach"],
        "Leverkusen": ["Bayer Leverkusen", "Bayer 04"],
        "RB Leipzig": ["Leipzig"],
        "Hoffenheim": ["TSG Hoffenheim"],
        "Wolfsburg": ["VfL Wolfsburg"],
        "Frankfurt": ["Eintracht Frankfurt"],
        "Freiburg": ["SC Freiburg"],
        "Stuttgart": ["VfB Stuttgart"],
        "Mainz": ["Mainz 05"],
        "Union Berlin": ["1. FC Union Berlin"],
    }
    
    issues_found = []
    
    for canonical, variations in known_variations.items():
        found_canonical = canonical in all_teams
        found_variations = [v for v in variations if v in all_teams]
        
        if found_canonical and found_variations:
            issues_found.append(f"⚠️  '{canonical}' e anche: {', '.join(found_variations)}")
        elif not found_canonical and found_variations:
            if len(found_variations) > 1:
                issues_found.append(f"🔄 Variazioni multiple per {canonical}: {', '.join(found_variations)}")
    
    # Check for similar names using simple matching
    teams_list = sorted(all_teams)
    for i, team1 in enumerate(teams_list):
        for team2 in teams_list[i+1:]:
            # Check if one is a prefix of the other
            if team1.lower() in team2.lower() or team2.lower() in team1.lower():
                if len(team1) > 3 and len(team2) > 3:  # Avoid false positives with short names
                    if team1.lower() != team2.lower():
                        issues_found.append(f"❓ Possibile duplicato: '{team1}' vs '{team2}'")
    
    if issues_found:
        for issue in issues_found[:30]:  # Limit output
            print(issue)
        if len(issues_found) > 30:
            print(f"   ... e altri {len(issues_found) - 30} potenziali problemi")
    else:
        print("✅ Nessun duplicato evidente trovato!")
    
    # Serie A specific check
    print("\n" + "="*60)
    print("🇮🇹 VERIFICA SERIE A 2025-2026")
    print("="*60)
    
    expected_serie_a = [
        "Inter", "Milan", "Juventus", "Napoli", "Roma", "Lazio",
        "Atalanta", "Bologna", "Fiorentina", "Torino", "Verona",
        "Udinese", "Empoli", "Genoa", "Cagliari", "Parma",
        "Lecce", "Como", "Venezia", "Monza"
    ]
    
    sa_teams = teams_by_league.get('SA', set())
    
    print(f"\nSquadre attese (2025-26): {len(expected_serie_a)}")
    print(f"Squadre nel DB: {len(sa_teams)}")
    
    missing = [t for t in expected_serie_a if t not in sa_teams]
    extra = [t for t in sa_teams if t not in expected_serie_a and not any(t.lower() in e.lower() or e.lower() in t.lower() for e in expected_serie_a)]
    
    if missing:
        print(f"\n❌ MANCANTI: {', '.join(missing)}")
    else:
        print("\n✅ Tutte le squadre attese presenti!")
    
    if extra:
        print(f"\n➕ EXTRA (retrocesse/promosse): {', '.join(extra)}")
    
    # Premier League check
    print("\n" + "="*60)
    print("🏴󠁧󠁢󠁥󠁮󠁧󠁿 VERIFICA PREMIER LEAGUE 2025-2026")
    print("="*60)
    
    expected_pl = [
        "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton",
        "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich",
        "Leicester", "Liverpool", "Man City", "Man United", "Newcastle",
        "Nott'm Forest", "Southampton", "Tottenham", "West Ham", "Wolves"
    ]
    
    pl_teams = teams_by_league.get('PL', set())
    
    print(f"\nSquadre attese (2025-26): {len(expected_pl)}")
    print(f"Squadre nel DB: {len(pl_teams)}")
    
    missing_pl = [t for t in expected_pl if t not in pl_teams]
    
    if missing_pl:
        print(f"\n❌ MANCANTI: {', '.join(missing_pl)}")
    else:
        print("\n✅ Tutte le squadre attese presenti!")
    
    print("\n" + "="*60)
    print("✅ VERIFICA COMPLETATA")
    print("="*60 + "\n")
    
    return {
        'total_teams': len(all_teams),
        'leagues': len(teams_by_league),
        'teams_by_league': {k: len(v) for k, v in teams_by_league.items()}
    }

if __name__ == "__main__":
    check_teams()
