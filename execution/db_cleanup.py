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
NORMALIZATION_MAP = {
    "Internazionale Milano": "Inter",
    "Internazionale": "Inter",
    "Atalanta BC": "Atalanta",
    "AAjax": "Ajax",
    "AC Milan": "Milan",
    "AS Roma": "Roma",
    "SSC Napoli": "Napoli",
    "Juventus FC": "Juventus",
    "Hellas Verona": "Verona",
    "de Marseille": "Marseille",
    "Athletic Bilbao": "Athletic Club"
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
