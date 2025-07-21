import os
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

SP500_URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
NASDAQ100_URL = "https://en.wikipedia.org/wiki/Nasdaq-100"
CACHE_DIR = os.path.join(os.path.dirname(__file__), "ticker_cache")
SP500_FILE = os.path.join(CACHE_DIR, "sp500_tickers.json")
NASDAQ100_FILE = os.path.join(CACHE_DIR, "nasdaq100_tickers.json")
REFRESH_DAYS = 30

def ensure_cache_dir():
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)

def is_file_stale(filepath):
    if not os.path.exists(filepath):
        return True
    mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
    return datetime.now() - mtime > timedelta(days=REFRESH_DAYS)

def scrape_sp500():
    resp = requests.get(SP500_URL)
    soup = BeautifulSoup(resp.text, "html.parser")
    table = soup.find("table", {"id": "constituents"})
    tickers = []
    for row in table.find("tbody").find_all("tr")[1:]:
        symbol = row.find_all("td")[0].text.strip().replace(".", "-")
        tickers.append(symbol)
    return tickers

def scrape_nasdaq100():
    resp = requests.get(NASDAQ100_URL)
    soup = BeautifulSoup(resp.text, "html.parser")
    table = soup.find("table", {"id": "constituents"})
    if not table:
        # Fallback: try the first table (Wikipedia sometimes changes structure)
        table = soup.find_all("table")[1]
    tickers = []
    for row in table.find("tbody").find_all("tr")[1:]:
        symbol = row.find_all("td")[1].text.strip().replace(".", "-")
        tickers.append(symbol)
    return tickers

def load_or_scrape_tickers():
    ensure_cache_dir()
    # S&P 500
    if is_file_stale(SP500_FILE):
        sp500 = scrape_sp500()
        with open(SP500_FILE, "w") as f:
            json.dump(sp500, f)
    else:
        with open(SP500_FILE) as f:
            sp500 = json.load(f)
    # Nasdaq-100
    if is_file_stale(NASDAQ100_FILE):
        nasdaq100 = scrape_nasdaq100()
        with open(NASDAQ100_FILE, "w") as f:
            json.dump(nasdaq100, f)
    else:
        with open(NASDAQ100_FILE) as f:
            nasdaq100 = json.load(f)
    return sp500, nasdaq100 