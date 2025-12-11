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
    # Add User-Agent header to avoid being blocked by Wikipedia
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    resp = requests.get(SP500_URL, timeout=10, headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    table = soup.find("table", {"id": "constituents"})
    tickers = []
    for row in table.find("tbody").find_all("tr")[1:]:
        symbol = row.find_all("td")[0].text.strip().replace(".", "-")
        tickers.append(symbol)
    return tickers

def scrape_nasdaq100():
    # Add User-Agent header to avoid being blocked by Wikipedia
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    resp = requests.get(NASDAQ100_URL, timeout=10, headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    
    table = None
    
    # Strategy 1: Look for table with "Ticker" column and ~100 rows (the constituents table)
    # Based on debug output, this is Table 5 with 102 rows and "Ticker" as first column
    tables = soup.find_all("table", class_="wikitable")
    for t in tables:
        rows = t.find_all("tr")
        # Check if it has ~100 rows (constituents table should have ~100-102 rows)
        if 90 <= len(rows) <= 110:
            # Verify it has a Ticker column
            header_row = t.find("thead")
            if not header_row:
                header_row = t.find("tr")
            if header_row:
                headers = [th.get_text().strip().upper() for th in header_row.find_all(["th", "td"])]
                if headers and "TICKER" in headers[0].upper():
                    table = t
                    break
    
    # Strategy 2: Look for table with "Ticker" or "Symbol" in header within wikitable
    if not table:
        tables = soup.find_all("table", class_="wikitable")
        for t in tables:
            # Check header row
            header_row = t.find("thead")
            if not header_row:
                header_row = t.find("tr")
            if header_row:
                header_text = header_row.get_text().upper()
                # Look for ticker/symbol column
                if "TICKER" in header_text or "SYMBOL" in header_text:
                    # Also verify it has many rows (constituents table should have ~100 rows)
                    rows = t.find_all("tr")
                    if len(rows) > 50:
                        table = t
                        break
    
    # Strategy 3: Look for table with "Ticker" column and ~100 rows (the constituents table)
    if not table:
        tables = soup.find_all("table", class_="wikitable")
        for t in tables:
            rows = t.find_all("tr")
            # Check if it has ~100 rows (constituents table should have ~100-102 rows)
            if 90 <= len(rows) <= 110:
                # Verify it has a Ticker column
                header_row = t.find("thead")
                if not header_row:
                    header_row = t.find("tr")
                if header_row:
                    headers = [th.get_text().strip().upper() for th in header_row.find_all(["th", "td"])]
                    if "TICKER" in " ".join(headers):
                        table = t
                        break
    
    # Strategy 4: Find the largest wikitable table (constituents table is usually the largest)
    if not table:
        tables = soup.find_all("table", class_="wikitable")
        if tables:
            # Find table with most rows (constituents should have ~100+ rows)
            largest_table = None
            max_rows = 0
            for t in tables:
                row_count = len(t.find_all("tr"))
                if row_count > max_rows:
                    max_rows = row_count
                    largest_table = t
            # Verify it's large enough to be the constituents table
            if largest_table and max_rows >= 50:
                table = largest_table
    
    if not table:
        raise ValueError("Could not find Nasdaq-100 'Current components' table on Wikipedia")
    
    tickers = []
    # Find header row to identify ticker column
    ticker_col_idx = 0  # Default to first column
    header_row = table.find("thead")
    if header_row:
        headers = [th.get_text().strip().upper() for th in header_row.find_all("th")]
        for i, header in enumerate(headers):
            if "TICKER" in header or "SYMBOL" in header:
                ticker_col_idx = i
                break
    else:
        # If no thead, check first row for headers
        first_row = table.find("tr")
        if first_row:
            headers = [th.get_text().strip().upper() for th in first_row.find_all(["th", "td"])]
            for i, header in enumerate(headers):
                if "TICKER" in header or "SYMBOL" in header:
                    ticker_col_idx = i
                    break
    
    # Extract tickers from table rows
    tbody = table.find("tbody")
    rows = tbody.find_all("tr") if tbody else table.find_all("tr")[1:]  # Skip header row
    
    for row in rows:
        cells = row.find_all(["td", "th"])
        if len(cells) > ticker_col_idx:
            symbol = cells[ticker_col_idx].text.strip().replace(".", "-")
            # Basic validation - should be uppercase alphanumeric with dashes
            cleaned = symbol.replace("-", "").replace(".", "")
            if symbol and cleaned.isalnum() and len(symbol) <= 10 and symbol.isupper():
                tickers.append(symbol)
    
    if not tickers:
        raise ValueError("Found Nasdaq-100 table but could not extract any tickers")
    
    return tickers

def load_or_scrape_tickers():
    ensure_cache_dir()
    # S&P 500
    if is_file_stale(SP500_FILE):
        try:
            sp500 = scrape_sp500()
            with open(SP500_FILE, "w") as f:
                json.dump(sp500, f)
            print(f"Successfully scraped {len(sp500)} S&P 500 tickers")
        except Exception as e:
            print(f"Error scraping S&P 500, using cached file: {e}")
            if os.path.exists(SP500_FILE):
                with open(SP500_FILE) as f:
                    sp500 = json.load(f)
            else:
                raise
    else:
        with open(SP500_FILE) as f:
            sp500 = json.load(f)
    
    # Nasdaq-100
    if is_file_stale(NASDAQ100_FILE):
        try:
            nasdaq100 = scrape_nasdaq100()
            with open(NASDAQ100_FILE, "w") as f:
                json.dump(nasdaq100, f)
            print(f"Successfully scraped {len(nasdaq100)} Nasdaq-100 tickers")
        except Exception as e:
            print(f"Error scraping Nasdaq-100, using cached file: {e}")
            if os.path.exists(NASDAQ100_FILE):
                with open(NASDAQ100_FILE) as f:
                    nasdaq100 = json.load(f)
            else:
                # If no cache exists and scraping fails, return empty list rather than crashing
                print(f"WARNING: No cached Nasdaq-100 file and scraping failed: {e}")
                nasdaq100 = []
    else:
        with open(NASDAQ100_FILE) as f:
            nasdaq100 = json.load(f)
    
    return sp500, nasdaq100 