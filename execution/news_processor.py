"""
NEWS PROCESSOR - MAGOTTO
Processes scraped news articles using NLP for entity recognition,
sentiment analysis, and categorization.

Usage:
    python execution/news_processor.py --input data/scraped_news/match_*.json
"""

import os
import re
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict

from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# Try to import NLP libraries (optional dependencies)
try:
    import spacy
    NLP_AVAILABLE = True
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        logger.warning("spaCy model not found. Run: python -m spacy download en_core_web_sm")
        NLP_AVAILABLE = False
except ImportError:
    NLP_AVAILABLE = False
    logger.warning("spaCy not installed. Using rule-based processing only.")

# Category keywords for rule-based classification
CATEGORY_KEYWORDS = {
    "injury": [
        "injury", "injured", "hurt", "sidelined", "out", "ruled out",
        "hamstring", "knee", "ankle", "muscle", "strain", "sprain",
        "surgery", "recovery", "rehabilitation", "fitness doubt"
    ],
    "suspension": [
        "suspended", "suspension", "ban", "banned", "red card",
        "yellow cards", "accumulated", "sent off", "dismissed"
    ],
    "transfer": [
        "transfer", "signing", "signs", "loan", "loaned", "deal",
        "agreement", "contract", "extends", "renewal", "joins"
    ],
    "form": [
        "form", "winning streak", "losing streak", "unbeaten",
        "consecutive", "great form", "poor form", "struggling",
        "dominant", "impressive", "disappointing"
    ],
    "motivation": [
        "derby", "rivalry", "crucial", "must-win", "battle",
        "relegation", "title race", "champions league", "european",
        "revenge", "payback", "historic"
    ],
    "coach": [
        "manager", "coach", "sacked", "fired", "appointed",
        "interim", "replacement", "tactics", "system"
    ]
}

# Sentiment keywords
POSITIVE_WORDS = [
    "win", "won", "victory", "beat", "success", "brilliant", "excellent",
    "outstanding", "impressive", "dominant", "recover", "return", "fit",
    "confident", "optimistic", "boost"
]

NEGATIVE_WORDS = [
    "lose", "lost", "defeat", "beaten", "fail", "poor", "disappointing",
    "struggle", "crisis", "injury", "injured", "miss", "out", "doubt",
    "concern", "worry", "suspended", "banned", "sacked"
]

# Known player importance (simplified - in production would use API)
KEY_PLAYERS = {
    # Serie A
    "osimhen": {"team": "napoli", "role": "forward", "importance": 0.95},
    "lukaku": {"team": "napoli", "role": "forward", "importance": 0.85},
    "leao": {"team": "milan", "role": "forward", "importance": 0.90},
    "vlahovic": {"team": "juventus", "role": "forward", "importance": 0.88},
    "lautaro": {"team": "inter", "role": "forward", "importance": 0.92},
    "martinez": {"team": "inter", "role": "forward", "importance": 0.92},
    # Premier League
    "haaland": {"team": "man city", "role": "forward", "importance": 0.98},
    "salah": {"team": "liverpool", "role": "forward", "importance": 0.95},
    "saka": {"team": "arsenal", "role": "forward", "importance": 0.88},
    "palmer": {"team": "chelsea", "role": "midfielder", "importance": 0.85},
    "son": {"team": "tottenham", "role": "forward", "importance": 0.90},
    # La Liga
    "vinicius": {"team": "real madrid", "role": "forward", "importance": 0.93},
    "bellingham": {"team": "real madrid", "role": "midfielder", "importance": 0.92},
    "yamal": {"team": "barcelona", "role": "forward", "importance": 0.90},
    "lewandowski": {"team": "barcelona", "role": "forward", "importance": 0.88},
}


@dataclass
class ProcessedNews:
    """Processed news article with NLP analysis"""
    original_title: str
    original_url: str
    source: str
    published_at: str
    category: str
    sentiment: float  # -1 to +1
    confidence: float  # 0 to 1
    team_mentions: list[str]
    player_mentions: list[dict]
    impact_keywords: list[str]
    processed_at: str
    
    def to_dict(self):
        return asdict(self)


class NewsProcessor:
    """NLP processor for news articles"""
    
    def __init__(self):
        self.use_nlp = NLP_AVAILABLE
    
    def categorize(self, text: str) -> tuple[str, float]:
        """Categorize article based on keywords"""
        text_lower = text.lower()
        
        category_scores = {}
        for category, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                category_scores[category] = score
        
        if not category_scores:
            return "other", 0.3
        
        # Return highest scoring category
        best_category = max(category_scores, key=category_scores.get)
        confidence = min(1.0, category_scores[best_category] / 3)
        
        return best_category, confidence
    
    def analyze_sentiment(self, text: str) -> float:
        """Calculate sentiment score from -1 to +1"""
        text_lower = text.lower()
        
        positive_count = sum(1 for word in POSITIVE_WORDS if word in text_lower)
        negative_count = sum(1 for word in NEGATIVE_WORDS if word in text_lower)
        
        total = positive_count + negative_count
        if total == 0:
            return 0.0
        
        # Sentiment = (positive - negative) / total, scaled
        raw_sentiment = (positive_count - negative_count) / total
        return max(-1.0, min(1.0, raw_sentiment))
    
    def extract_players(self, text: str) -> list[dict]:
        """Extract mentioned players and their importance"""
        text_lower = text.lower()
        mentioned = []
        
        for player_name, info in KEY_PLAYERS.items():
            if player_name in text_lower:
                mentioned.append({
                    "name": player_name.capitalize(),
                    "team": info["team"],
                    "role": info["role"],
                    "importance": info["importance"]
                })
        
        return mentioned
    
    def extract_teams(self, text: str) -> list[str]:
        """Extract team mentions using NLP or rules"""
        teams = set()
        
        # Rule-based: check known teams
        known_teams = [
            "napoli", "milan", "inter", "juventus", "roma", "lazio", "atalanta",
            "manchester city", "man city", "liverpool", "arsenal", "chelsea",
            "tottenham", "manchester united", "man united",
            "real madrid", "barcelona", "atletico madrid",
            "bayern munich", "dortmund", "psg"
        ]
        
        text_lower = text.lower()
        for team in known_teams:
            if team in text_lower:
                # Normalize team names
                normalized = team.replace("man city", "Manchester City")
                normalized = normalized.replace("man united", "Manchester United")
                teams.add(normalized.title())
        
        # Use NLP if available for additional entities
        if self.use_nlp:
            try:
                doc = nlp(text)
                for ent in doc.ents:
                    if ent.label_ in ("ORG", "GPE") and len(ent.text) > 2:
                        teams.add(ent.text)
            except Exception:
                pass
        
        return list(teams)
    
    def extract_impact_keywords(self, text: str) -> list[str]:
        """Extract keywords that indicate impact on prediction"""
        keywords = []
        text_lower = text.lower()
        
        impact_phrases = [
            "ruled out", "doubtful", "expected to start", "back in training",
            "fully fit", "race against time", "touch and go",
            "latest signing", "new signing", "deadline day",
            "winning run", "losing streak", "unbeaten", "without a win"
        ]
        
        for phrase in impact_phrases:
            if phrase in text_lower:
                keywords.append(phrase)
        
        return keywords
    
    def process_article(self, article: dict) -> ProcessedNews:
        """Process a single article"""
        title = article.get("title", "")
        raw_text = article.get("raw_text", "")
        full_text = f"{title} {raw_text}"
        
        category, cat_confidence = self.categorize(full_text)
        sentiment = self.analyze_sentiment(full_text)
        teams = self.extract_teams(full_text)
        players = self.extract_players(full_text)
        impact_kw = self.extract_impact_keywords(full_text)
        
        return ProcessedNews(
            original_title=title,
            original_url=article.get("url", ""),
            source=article.get("source", ""),
            published_at=article.get("published_at", ""),
            category=category,
            sentiment=sentiment,
            confidence=cat_confidence,
            team_mentions=teams,
            player_mentions=players,
            impact_keywords=impact_kw,
            processed_at=datetime.now().isoformat()
        )
    
    def process_match_news(self, match_data: dict) -> dict:
        """Process all news for a match"""
        result = {
            "match": match_data.get("match", ""),
            "processed_at": datetime.now().isoformat(),
            "home_team": {
                "name": match_data.get("home_team", {}).get("name", ""),
                "processed_articles": [],
                "summary": {}
            },
            "away_team": {
                "name": match_data.get("away_team", {}).get("name", ""),
                "processed_articles": [],
                "summary": {}
            }
        }
        
        # Process home team articles
        home_articles = match_data.get("home_team", {}).get("articles", [])
        home_processed = [self.process_article(a).to_dict() for a in home_articles]
        result["home_team"]["processed_articles"] = home_processed
        result["home_team"]["summary"] = self._summarize(home_processed)
        
        # Process away team articles
        away_articles = match_data.get("away_team", {}).get("articles", [])
        away_processed = [self.process_article(a).to_dict() for a in away_articles]
        result["away_team"]["processed_articles"] = away_processed
        result["away_team"]["summary"] = self._summarize(away_processed)
        
        return result
    
    def _summarize(self, processed_articles: list[dict]) -> dict:
        """Create summary statistics for a team's news"""
        if not processed_articles:
            return {
                "total_articles": 0,
                "avg_sentiment": 0.0,
                "injuries": 0,
                "positive_news": 0,
                "negative_news": 0,
                "key_players_mentioned": []
            }
        
        total = len(processed_articles)
        sentiments = [a.get("sentiment", 0) for a in processed_articles]
        avg_sentiment = sum(sentiments) / total if sentiments else 0
        
        injuries = sum(1 for a in processed_articles if a.get("category") == "injury")
        positive = sum(1 for s in sentiments if s > 0.2)
        negative = sum(1 for s in sentiments if s < -0.2)
        
        # Collect all mentioned players
        all_players = []
        for a in processed_articles:
            all_players.extend(a.get("player_mentions", []))
        
        # Deduplicate by name
        unique_players = {p["name"]: p for p in all_players}.values()
        
        return {
            "total_articles": total,
            "avg_sentiment": round(avg_sentiment, 3),
            "injuries": injuries,
            "positive_news": positive,
            "negative_news": negative,
            "key_players_mentioned": list(unique_players)
        }


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="MAGOTTO News Processor")
    parser.add_argument("--input", type=str, required=True,
                        help="Path to match JSON file from scraper")
    parser.add_argument("--output", type=str,
                        help="Output path (default: input with _processed suffix)")
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        return
    
    # Load input
    with open(input_path, 'r', encoding='utf-8') as f:
        match_data = json.load(f)
    
    # Process
    processor = NewsProcessor()
    result = processor.process_match_news(match_data)
    
    # Save output
    output_path = args.output or str(input_path).replace(".json", "_processed.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    logger.info(f"✅ Processed news saved to {output_path}")
    
    # Print summary
    print(f"\n📊 Processing Summary for {result['match']}")
    print(f"\n🏠 {result['home_team']['name']}:")
    hs = result['home_team']['summary']
    print(f"   Articles: {hs['total_articles']}, Sentiment: {hs['avg_sentiment']:.2f}")
    print(f"   Injuries: {hs['injuries']}, Positive: {hs['positive_news']}, Negative: {hs['negative_news']}")
    
    print(f"\n✈️ {result['away_team']['name']}:")
    as_ = result['away_team']['summary']
    print(f"   Articles: {as_['total_articles']}, Sentiment: {as_['avg_sentiment']:.2f}")
    print(f"   Injuries: {as_['injuries']}, Positive: {as_['positive_news']}, Negative: {as_['negative_news']}")


if __name__ == "__main__":
    main()
