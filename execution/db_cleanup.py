import os
import sys
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Supabase credentials not found. Check your .env file.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Normalization Map: Typo/Alias -> Normalized Name
# COMPREHENSIVE MAP - includes all major leagues
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
    "Spurs": "Tottenham",
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
    "Real Sociedad": "Sociedad",
    "Real Betis": "Betis",
    "Rayo Vallecano": "Vallecano",
    "Celta Vigo": "Celta",
    "Villarreal CF": "Villarreal",
    "Real Madrid CF": "Real Madrid",
    
    # ========== BUNDESLIGA ==========
    "Bayern München": "Bayern Munich",
    "FC Bayern": "Bayern Munich",
    "Borussia Dortmund": "Dortmund",
    "BVB": "Dortmund",
    "Bayer Leverkusen": "Leverkusen",
    "Bayer 04 Leverkusen": "Leverkusen",
    "Bayer 04": "Leverkusen",
    "04 Leverkusen": "Leverkusen",
    "Borussia M'gladbach": "M'gladbach",
    "Borussia Mönchengladbach": "M'gladbach",
    "Eintracht Frankfurt": "Ein Frankfurt",
    "Frankfurt": "Ein Frankfurt",
    "TSG Hoffenheim": "Hoffenheim",
    "VfL Wolfsburg": "Wolfsburg",
    "SC Freiburg": "Freiburg",
    "VfB Stuttgart": "Stuttgart",
    "Mainz 05": "Mainz",
    "1. FC Union Berlin": "Union Berlin",
    
    # ========== LIGUE 1 ==========
    "Paris Saint-Germain": "Paris SG",
    "PSG": "Paris SG",
    "Saint-Germain": "Paris SG",
    "Olympique de Marseille": "Marseille",
    "Olympique Marseille": "Marseille",
    "de Marseille": "Marseille",
    "Olympique Lyon": "Lyon",
    "Olympique Lyonnais": "Lyon",
    "Saint-Etienne": "St Etienne",
    "AS Monaco": "Monaco",
    
    # ========== EREDIVISIE ==========
    "AZ Alkmaar": "AZ",
    "PSV Eindhoven": "PSV",
    "Ajax Amsterdam": "Ajax",
    "AAjax": "Ajax",
    
    # ========== CHAMPIONS LEAGUE ==========
    "Lisboa e Benfica": "Benfica",
    "Sport Lisboa e Benfica": "Benfica",
    "Clube de Portugal": "Sporting CP",
    "Sporting": "Sporting CP",
    "Club Brugge KV": "Club Brugge",
    "FK Bodø/Glimt": "Bodø/Glimt",
    "Qarabağ Ağdam FK": "Qarabag",
    "Olympiakos SFP": "Olympiakos",
    "Slavia Praha": "Slavia Prague",
    "FC København": "Copenhagen",
    "København": "Copenhagen",
}

def normalize_database():
    logger.info("Starting database normalization...")
    
    # Process both home_team and away_team
    for old_name, new_name in NORMALIZATION_MAP.items():
        logger.info(f"Normalizing '{old_name}' -> '{new_name}'...")
        
        # Update Home Team
        res_h = supabase.table('matches').update({"home_team": new_name}).eq("home_team", old_name).execute()
        updated_h = len(res_h.data) if res_h.data else 0
        
        # Update Away Team
        res_a = supabase.table('matches').update({"away_team": new_name}).eq("away_team", old_name).execute()
        updated_a = len(res_a.data) if res_a.data else 0
        
        if updated_h + updated_a > 0:
            logger.info(f"  Fixed {updated_h} home and {updated_a} away records.")

    # Fix Cremonese League Code - Ensuring they are in Serie A (SA) as per user requirements
    logger.info("Moving Cremonese back to Serie A (SA)...")
    res_h = supabase.table('matches').update({"league": "SA"}).eq("home_team", "Cremonese").execute()
    res_a = supabase.table('matches').update({"league": "SA"}).eq("away_team", "Cremonese").execute()
    
    total_fixed = (len(res_h.data) if res_h.data else 0) + (len(res_a.data) if res_a.data else 0)
    if total_fixed > 0:
        logger.info(f"  Corrected {total_fixed} matches for Cremonese to Serie A (SA).")

    logger.info("Normalization complete!")



if __name__ == "__main__":
    normalize_database()
