import requests
from bs4 import BeautifulSoup

urls = [
    "https://www.gazzetta.it/rss/home.xml",
    "https://www.gazzetta.it/rss/Calcio.xml",
    "https://www.corrieredellosport.it/rss/calcio",
    "https://www.calciomercato.com/feed",
    "https://news.google.com/rss/search?q=Inter+Milan+soccer&hl=it&gl=IT&ceid=IT:it" # Google News is also a great free endpoint
]

for url in urls:
    try:
        r = requests.get(url, timeout=5, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code == 200:
            soup = BeautifulSoup(r.content, 'xml')
            items = soup.find_all('item')
            print(f"URL: {url} - Items: {len(items)}")
            if len(items) > 0:
                print(f"  Sample: {items[0].find('title').text[:50]}...")
        else:
            print(f"URL: {url} - Status: {r.status_code}")
    except Exception as e:
        print(f"URL: {url} - Error: {e}")
