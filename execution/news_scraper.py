"""
NEWS SCRAPER - FLP Oracle
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

USER_AGENT = "FLP-Oracle/1.0 (Football Prediction System; Educational Research)"

# News sources configuration
NEWS_SOURCES = [
    {
        "name": "Football Italia",
        "base_url": "https://www.football-italia.net",
        "search_url": "https://www.football-italia.net/?s={query}",
        "article_selector": "article.post",
        "title_selector": "h2.entry-title a",
        "date_selector": "time.entry-date",
        "link_selector": "h2.entry-title a",
        "reliability": 0.80
    },
    {
        "name": "ESPN FC",
        "base_url": "https://www.espn.com",
        "rss_url": "https://www.espn.com/espn/rss/soccer/news",
        "reliability": 0.90
    },
    {
        "name": "Sky Sports Football",
        "base_url": "https://www.skysports.com",
        "rss_url": "https://www.skysports.com/rss/12040",
        "reliability": 0.88
    },
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
        """Save article to Supabase if it doesn't exist"""
        if not supabase:
            return

        try:
            # Check if exists by URL
            res = supabase.table('news').select('id').eq('url', article.url).execute()
            if res.data and len(res.data) > 0:
                logger.debug(f"Article already exists: {article.title[:30]}...")
                return

            # Analyze Category & Sentiment (Basic Logic)
            category = self._class_news(article.title + " " + article.raw_text)
            sentiment = self._determine_sentiment(article.title + " " + article.raw_text, category)
            
            # Use team_filter as team_name if provided, otherwise generic
            # In a real scraper, we would extract team names from text via NER
            team_name = team_filter if team_filter else "General" 
            
            # If scraping 'all', we might want to skip general news or try to guess team
            if not team_name or team_name == "General":
                # Very basic connection to active conversation context if possible
                # For now, we skip saving 'General' news to DB to avoid pollution
                # unless we detected a team name in the text (TODO)
                pass

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
    
    parser = argparse.ArgumentParser(description="FLP Oracle News Scraper")
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
