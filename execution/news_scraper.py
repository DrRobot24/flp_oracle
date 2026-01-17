"""
NEWS SCRAPER - FLP Oracle
Scrapes football news from multiple sources and saves structured JSON output.
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

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment
load_dotenv()

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
    
    def _get_cache_path(self, source: str, query: str = "all") -> Path:
        """Generate cache file path"""
        key = f"{source}_{query}".lower().replace(" ", "_")
        hash_key = hashlib.md5(key.encode()).hexdigest()[:8]
        return CACHE_DIR / f"{hash_key}_{source.lower().replace(' ', '_')}.json"
    
    def _is_cache_valid(self, cache_path: Path) -> bool:
        """Check if cache is still valid"""
        if not cache_path.exists():
            return False
        
        mtime = datetime.fromtimestamp(cache_path.stat().st_mtime)
        age = datetime.now() - mtime
        return age < timedelta(minutes=CACHE_TTL_MINUTES)
    
    def _load_cache(self, cache_path: Path) -> Optional[list[dict]]:
        """Load cached articles"""
        if self._is_cache_valid(cache_path):
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    logger.info(f"Loaded {len(data)} articles from cache")
                    return data
            except Exception as e:
                logger.warning(f"Cache load failed: {e}")
        return None
    
    def _save_cache(self, cache_path: Path, articles: list[dict]):
        """Save articles to cache"""
        try:
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(articles, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved {len(articles)} articles to cache")
        except Exception as e:
            logger.warning(f"Cache save failed: {e}")
    
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
        """Scrape all configured sources"""
        all_articles = []
        
        for source in NEWS_SOURCES:
            # Check cache first
            cache_path = self._get_cache_path(source['name'], team_filter or "all")
            cached = self._load_cache(cache_path)
            
            if cached:
                all_articles.extend(cached)
                continue
            
            # Fetch fresh data
            if source.get("rss_url"):
                articles = self.fetch_rss(source)
            else:
                articles = self.fetch_html(source, team_filter)
            
            # Convert to dicts and cache
            article_dicts = [a.to_dict() for a in articles]
            if article_dicts:
                self._save_cache(cache_path, article_dicts)
                all_articles.extend(article_dicts)
        
        # Sort by date (newest first)
        all_articles.sort(
            key=lambda x: x.get('published_at', ''),
            reverse=True
        )
        
        return all_articles
    
    def scrape_for_match(self, home_team: str, away_team: str) -> dict:
        """Scrape news relevant to a specific match"""
        logger.info(f"Scraping news for match: {home_team} vs {away_team}")
        
        all_articles = self.scrape_all_sources()
        
        # Filter by team mentions (simple keyword matching)
        def mentions_team(article: dict, team: str) -> bool:
            team_lower = team.lower()
            keywords = team_lower.split()
            title_lower = article.get('title', '').lower()
            text_lower = article.get('raw_text', '').lower()
            content = title_lower + " " + text_lower
            
            return any(kw in content for kw in keywords if len(kw) > 2)
        
        home_news = [a for a in all_articles if mentions_team(a, home_team)]
        away_news = [a for a in all_articles if mentions_team(a, away_team)]
        
        result = {
            "match": f"{home_team} vs {away_team}",
            "scraped_at": datetime.now().isoformat(),
            "total_articles": len(all_articles),
            "home_team": {
                "name": home_team,
                "relevant_articles": len(home_news),
                "articles": home_news[:10]  # Limit to 10
            },
            "away_team": {
                "name": away_team,
                "relevant_articles": len(away_news),
                "articles": away_news[:10]
            }
        }
        
        # Save match-specific output
        output_path = CACHE_DIR / f"match_{home_team}_{away_team}.json".replace(" ", "_").lower()
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved match news to {output_path}")
        return result


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
        result = scraper.scrape_for_match(args.match[0], args.match[1])
        print(f"\n✅ Found {result['home_team']['relevant_articles']} articles for {args.match[0]}")
        print(f"✅ Found {result['away_team']['relevant_articles']} articles for {args.match[1]}")
    else:
        articles = scraper.scrape_all_sources(args.team or "")
        print(f"\n✅ Scraped {len(articles)} total articles")
        
        # Show sample
        if articles:
            print("\n📰 Latest articles:")
            for article in articles[:5]:
                print(f"  - [{article['source']}] {article['title'][:60]}...")


if __name__ == "__main__":
    main()
