"""
NEWS SCRAPER - MAGOTTO
Scrapes football news from multiple sources and saves to Supabase DB.
Follows rate limiting and ethical scraping practices.

Usage:
    python execution/news_scraper.py [--team "Team Name"] [--all]
"""

import os
import sys
import json
import time
import hashlib
import logging
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment
load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") # Re-using frontend env var if available
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # We need SERVICE_ROLE for writing!

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("Supabase credentials not found in env. Data will only be saved locally.")
    supabase = None
else:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Connected to Supabase")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        supabase = None

# Configuration
RATE_LIMIT_SECONDS = 3
TIMEOUT_SECONDS = 10
MAX_ARTICLES_PER_SOURCE = 20
CACHE_DIR = Path(__file__).parent.parent / "data" / "scraped_news"
CACHE_TTL_MINUTES = 30

# Team Synonyms for better filtering
TEAM_SYNONYMS = {
    "inter": ["inter", "internazionale", "inter milan", "nerazzurri", "lautaro", "inzaghi"],
    "milan": ["milan", "ac milan", "rossoneri", "leao", "fonseca"],
    "juventus": ["juventus", "juve", "bianconeri", "vlahovic", "motta"],
    "napoli": ["napoli", "partenopei", "conte", "lukaku"],
    "roma": ["roma", "giallorossi", "dybala"],
    "lazio": ["lazio", "biancocelesti", "baroni"],
    "atalanta": ["atalanta", "nerazzurri", "gasperini"],
    "arsenal": ["arsenal", "gunners", "arteta", "saka"],
    "chelsea": ["chelsea", "blues", "palmer", "maresca"],
    "liverpool": ["liverpool", "reds", "slot", "salah"],
    "manchester city": ["man city", "manchester city", "citizens", "haaland", "guardiola"],
    "manchester united": ["man utd", "manchester united", "red devils", "rashford"],
    "real madrid": ["real madrid", "merengues", "los blancos", "vinicius", "mbappe", "ancelotti"],
    "barcelona": ["barcelona", "barca", "blaugrana", "yamal", "flick", "lewandowski"]
}

# Keywords to exclude (non-soccer / other players)
NON_SOCCER_KEYWORDS = [
    "tennis", "sinner", "djokovic", "alcaraz", "nba", "basketball", 
    "cricket", "baseball", "f1", "formula 1", "boxing", "ufc", 
    "olympics", "golf", "bbl", "perth scorchers", "sixers", "anthony joshua"
]

USER_AGENT = "MAGOTTO/1.0 (Football Prediction System; Educational Research)"

# News sources configuration
NEWS_SOURCES = [
    {
        "name": "Google News (Soccer)",
        "base_url": "https://news.google.com",
        "search_rss_url": "https://news.google.com/rss/search?q={query}+football&hl=it&gl=IT&ceid=IT:it",
        "reliability": 0.95
    },
    {
        "name": "Gazzetta dello Sport",
        "base_url": "https://www.gazzetta.it",
        "rss_url": "https://www.gazzetta.it/rss/home.xml", # Home feed is more stable
        "reliability": 0.90
    },
    {
        "name": "Calciomercato.com",
        "base_url": "https://www.calciomercato.com",
        "rss_url": "https://www.calciomercato.com/feed",
        "reliability": 0.90
    },
    {
        "name": "ESPN FC",
        "base_url": "https://www.espn.com",
        "rss_url": "https://www.espn.com/espn/rss/soccer/news",
        "reliability": 0.85
    }
]

@dataclass
class NewsArticle:
    """Represents a single news article"""
    title: str
    url: str
    source: str
    published_at: str
    scraped_at: str
    team_mentions: list[str]
    category: str  # injury, transfer, form, motivation, other
    raw_text: str
    reliability: float
    
    def to_dict(self):
        return asdict(self)


class NewsScraper:
    """Main scraper class with rate limiting and caching"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        })
        self.last_request_time = 0
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    def _rate_limit(self):
        """Ensure we don't exceed rate limits"""
        elapsed = time.time() - self.last_request_time
        if elapsed < RATE_LIMIT_SECONDS:
            sleep_time = RATE_LIMIT_SECONDS - elapsed
            logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)
        self.last_request_time = time.time()
    
    def _class_news(self, text: str) -> str:
        """Simple keyword based classification"""
        text = text.lower()
        if any(w in text for w in ['injury', 'injured', 'out', 'sidelined', 'surgery', 'miss']):
            return 'injury'
        if any(w in text for w in ['suspended', 'ban', 'red card']):
            return 'suspension'
        if any(w in text for w in ['coach', 'manager', 'sack', 'appoint', 'boss']):
            return 'coach_change'
        if any(w in text for w in ['win', 'loss', 'draw', 'streak', 'form', 'victory']):
            return 'form'
        if any(w in text for w in ['derby', 'final', 'cup', 'motivation', 'must win']):
            return 'motivation'
        return 'other'

    def _determine_sentiment(self, text: str, category: str) -> float:
        """Simple heuristic sentiment analysis"""
        text = text.lower()
        if category == 'injury' or category == 'suspension':
            return -0.8 # Usually bad news
        
        # Simple keywords
        pos_words = ['win', 'victory', 'great', 'boost', 'return', 'fit', 'ready']
        neg_words = ['loss', 'defeat', 'crisis', 'problem', 'issue', 'doubt']
        
        score = 0
        for w in pos_words: 
            if w in text: score += 0.2
        for w in neg_words: 
            if w in text: score -= 0.2
            
        return max(-1.0, min(1.0, score))

    def save_to_db(self, article: NewsArticle, team_filter: str = ""):
        """Save article to Supabase if it doesn't exist and matches strict criteria"""
        if not supabase:
            return

        try:
            full_text = f"{article.title} {article.raw_text}".lower()

            # 1. HARD BLOCK for non-soccer keywords
            if any(word in full_text for word in NON_SOCCER_KEYWORDS):
                logger.debug(f"Blocked (Non-soccer): {article.title[:30]}")
                return

            # 2. STRICT REGEX MENTION CHECK for the requested team
            team_name = team_filter if team_filter else "General"
            
            if team_filter:
                search_terms = TEAM_SYNONYMS.get(team_filter.lower(), [team_filter.lower()])
                
                # Special handling for "Inter" to avoid "International"
                forbidden_prefixes = ["internat", "interv", "interp", "interst", "interfac"]
                
                match_found = False
                for term in search_terms:
                    # Strict word boundary \b
                    pattern = rf"\b{re.escape(term.lower())}\b"
                    matches = list(re.finditer(pattern, full_text))
                    
                    for m in matches:
                        # Check if it's not a false positive like "Inter-national"
                        start, end = m.span()
                        # peek 5 chars ahead
                        following = full_text[end:end+8]
                        if term.lower() == "inter" and any(fp in following for fp in ["national", "view", "nal"]):
                            continue
                        
                        match_found = True
                        break
                    
                    if match_found: break
                
                if not match_found:
                    logger.debug(f"Skipped (No strict mention of {team_filter}): {article.title[:30]}")
                    return

            # 3. Check if exists by URL
            res = supabase.table('news').select('id').eq('url', article.url).execute()
            if res.data and len(res.data) > 0:
                return

            # 4. Analyze Category & Sentiment
            category = self._class_news(full_text)
            sentiment = self._determine_sentiment(full_text, category)
            
            row = {
                "team_name": team_name,
                "title": article.title,
                "summary": article.raw_text[:200] if article.raw_text else "",
                "url": article.url,
                "source": article.source,
                "published_at": article.published_at if article.published_at else datetime.now().isoformat(),
                "category": category,
                "sentiment": sentiment,
                "reliability": article.reliability,
                "metadata": {"scraped_at": article.scraped_at}
            }

            supabase.table('news').insert(row).execute()
            logger.info(f"💾 Saved to DB: {article.title[:40]}... ({category})")
            
        except Exception as e:
            logger.error(f"DB Save Error: {e}")

    def fetch_rss(self, source: dict) -> list[NewsArticle]:
        """Fetch articles from RSS feed"""
        articles = []
        rss_url = source.get("rss_url")
        if not rss_url:
            return articles
        
        self._rate_limit()
        
        try:
            logger.info(f"Fetching RSS from {source['name']}...")
            response = self.session.get(rss_url, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'xml')
            items = soup.find_all('item')[:MAX_ARTICLES_PER_SOURCE]
            
            for item in items:
                title = item.find('title')
                link = item.find('link')
                pub_date = item.find('pubDate')
                description = item.find('description')
                
                if title and link:
                    articles.append(NewsArticle(
                        title=title.get_text(strip=True),
                        url=link.get_text(strip=True),
                        source=source['name'],
                        published_at=pub_date.get_text(strip=True) if pub_date else "",
                        scraped_at=datetime.now().isoformat(),
                        team_mentions=[],
                        category="other",
                        raw_text=description.get_text(strip=True) if description else "",
                        reliability=source['reliability']
                    ))
            
            logger.info(f"Found {len(articles)} articles from {source['name']}")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch {source['name']}: {e}")
        except Exception as e:
            logger.error(f"Error parsing {source['name']}: {e}")
        
        return articles
    
    def fetch_html(self, source: dict, query: str = "") -> list[NewsArticle]:
        """Fetch articles by scraping HTML pages"""
        articles = []
        
        if query and source.get("search_url"):
            url = source["search_url"].format(query=query.replace(" ", "+"))
        else:
            url = source.get("base_url", "")
        
        if not url:
            return articles
        
        self._rate_limit()
        
        try:
            logger.info(f"Scraping HTML from {source['name']}...")
            response = self.session.get(url, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            article_selector = source.get("article_selector", "article")
            article_elements = soup.select(article_selector)[:MAX_ARTICLES_PER_SOURCE]
            
            for article_el in article_elements:
                # Extract title
                title_sel = source.get("title_selector", "h2 a")
                title_el = article_el.select_one(title_sel)
                if not title_el:
                    continue
                
                title = title_el.get_text(strip=True)
                
                # Extract link
                link_sel = source.get("link_selector", "a")
                link_el = article_el.select_one(link_sel)
                link = link_el.get("href", "") if link_el else ""
                
                # Make absolute URL
                if link and not link.startswith("http"):
                    link = source["base_url"] + link
                
                # Extract date
                date_sel = source.get("date_selector", "time")
                date_el = article_el.select_one(date_sel)
                pub_date = date_el.get("datetime", date_el.get_text(strip=True)) if date_el else ""
                
                if title and link:
                    articles.append(NewsArticle(
                        title=title,
                        url=link,
                        source=source['name'],
                        published_at=pub_date,
                        scraped_at=datetime.now().isoformat(),
                        team_mentions=[],
                        category="other",
                        raw_text="",
                        reliability=source['reliability']
                    ))
            
            logger.info(f"Found {len(articles)} articles from {source['name']}")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch {source['name']}: {e}")
        except Exception as e:
            logger.error(f"Error parsing {source['name']}: {e}")
        
        return articles
    
    def scrape_all_sources(self, team_filter: str = "") -> list[dict]:
        """Scrape all configured sources and push to DB"""
        all_articles = []
        
        for source in NEWS_SOURCES:
            # Fetch fresh data
            if source.get("rss_url"):
                articles = self.fetch_rss(source)
            elif source.get("search_rss_url"):
                # Dynamically build Google News search feed
                # Use a more specific query for certain teams
                query = team_filter if team_filter else "football"
                if query.lower() == "inter": query = "Inter Milan"
                if query.lower() == "milan": query = "AC Milan"
                
                source_copy = source.copy()
                source_copy["rss_url"] = source["search_rss_url"].format(query=query.replace(" ", "+"))
                articles = self.fetch_rss(source_copy)
            else:
                articles = self.fetch_html(source, team_filter)
            
            # Process and Save
            for article in articles:
                self.save_to_db(article, team_filter)
                all_articles.append(article.to_dict())
        
        return all_articles
    
    def scrape_for_match(self, home_team: str, away_team: str) -> dict:
        """Scrape news relevant to a specific match"""
        logger.info(f"Scraping news for match: {home_team} vs {away_team}")
        
        # We define a helper to scrape for a specific team
        # In a real scenario we'd query specifically for these keywords
        
        # Scrape for Home Team
        home_arts = self.scrape_all_sources(home_team)
        
        # Scrape for Away Team
        away_arts = self.scrape_all_sources(away_team)
        
        return {
            "match": f"{home_team} vs {away_team}",
            "scraped_at": datetime.now().isoformat(),
            "home_count": len(home_arts),
            "away_count": len(away_arts)
        }


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="MAGOTTO News Scraper")
    parser.add_argument("--team", type=str, help="Filter by team name")
    parser.add_argument("--match", type=str, nargs=2, metavar=("HOME", "AWAY"),
                        help="Scrape for specific match")
    parser.add_argument("--all", action="store_true", help="Scrape all sources")
    
    args = parser.parse_args()
    
    scraper = NewsScraper()
    
    if args.match:
        scraper.scrape_for_match(args.match[0], args.match[1])
        print(f"\n✅ Scrape completed for {args.match[0]} vs {args.match[1]}")
    elif args.team:
        articles = scraper.scrape_all_sources(args.team)
        print(f"\n✅ Scraped {len(articles)} articles for {args.team}")
    else:
        print("Please specify --team or --match")

if __name__ == "__main__":
    main()
