/**
 * NEWS SERVICE (Optimized)
 * Fetches football news from RSS feeds with parallel requests and caching.
 */

export interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
}

// More reliable CORS proxies (tested to work)
const CORS_PROXIES = [
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
];

// RSS Sources (keeping only 1 for speed, can add more if needed)
const RSS_FEEDS = [
    { url: 'https://www.football-italia.net/feed', source: 'Football Italia' },
];

// Simple in-memory cache
let newsCache: { data: NewsItem[], timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Parse RSS XML into NewsItem array
 */
function parseRSS(xml: string, source: string): NewsItem[] {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const items = doc.querySelectorAll('item');

        const news: NewsItem[] = [];
        items.forEach(item => {
            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';

            if (title && link) {
                news.push({ title, link, pubDate, source });
            }
        });

        return news;
    } catch {
        return [];
    }
}

/**
 * Fetch a single feed with timeout
 */
async function fetchFeed(feedUrl: string, source: string): Promise<NewsItem[]> {
    // Try each proxy until one works
    for (const proxy of CORS_PROXIES) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(proxy + encodeURIComponent(feedUrl), {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!response.ok) continue;

            const xml = await response.text();
            return parseRSS(xml, source);
        } catch {
            continue; // Try next proxy
        }
    }
    return [];
}

/**
 * Fetch news from all RSS sources (PARALLEL)
 */
export async function fetchAllNews(): Promise<NewsItem[]> {
    // Return cached data if still valid
    if (newsCache && Date.now() - newsCache.timestamp < CACHE_TTL) {
        return newsCache.data;
    }

    // Fetch all feeds in parallel
    const promises = RSS_FEEDS.map(feed => fetchFeed(feed.url, feed.source));
    const results = await Promise.all(promises);

    // Flatten and sort
    const allNews = results.flat();
    allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Cache the results
    newsCache = { data: allNews, timestamp: Date.now() };

    return allNews;
}

/**
 * Filter news by team name keywords
 */
export function filterNewsByTeam(news: NewsItem[], teamName: string): NewsItem[] {
    if (!teamName) return news;

    // Normalize team name for matching
    const keywords = teamName.toLowerCase().split(/\s+/);

    return news.filter(item => {
        const titleLower = item.title.toLowerCase();
        return keywords.some(kw => kw.length > 2 && titleLower.includes(kw));
    });
}

/**
 * Get relevant news for a match (both teams)
 */
export async function getMatchNews(homeTeam: string, awayTeam: string, limit: number = 10): Promise<NewsItem[]> {
    const allNews = await fetchAllNews();

    // Filter by either team
    const homeNews = filterNewsByTeam(allNews, homeTeam);
    const awayNews = filterNewsByTeam(allNews, awayTeam);

    // Combine and deduplicate
    const combined = [...homeNews, ...awayNews];
    const uniqueNews = Array.from(new Map(combined.map(n => [n.link, n])).values());

    // Return top N
    return uniqueNews.slice(0, limit);
}

