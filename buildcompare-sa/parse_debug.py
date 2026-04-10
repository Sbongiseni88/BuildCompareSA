import re
from bs4 import BeautifulSoup

def debug(filename, query):
    with open(filename, 'r') as f:
        html = f.read()
    
    if "Cloudflare" in html or "Access Denied" in html:
        print(f"{filename}: BLOCK DETECTED (Cloudflare/Access Denied)")
        return
        
    soup = BeautifulSoup(html, "html.parser")
    
    # Check for script tags with JSON
    scripts = soup.find_all('script', type=re.compile(r'json'))
    print(f"\n{filename} JSON scripts: {len(scripts)}")
    
    # Try to find elements with price-like strings
    price_pattern = re.compile(r'R\s*\d+')
    prices = soup.find_all(string=price_pattern)
    print(f"{filename} Price elements found: {len(prices)}")
    
    if prices:
        parent = prices[0].parent
        print(f"Sample price element path: {parent.name} - class {parent.get('class')}")
        ancestor = parent.parent.parent
        print(f"Grandparent class: {ancestor.get('class')}")

debug("builders.html", "cement")
debug("cashbuild.html", "cement")
