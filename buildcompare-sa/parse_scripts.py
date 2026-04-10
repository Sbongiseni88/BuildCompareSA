from bs4 import BeautifulSoup
import re

with open("builders.html", "r") as f:
    soup = BeautifulSoup(f.read(), "html.parser")
    
# Print first lines of all scripts to see if one contains product data
scripts = soup.find_all('script')
for i, s in enumerate(scripts):
    text = s.string if s.string else ""
    if text:
        print(f"Builders Script {i}: {text[:100]}...")

with open("cashbuild.html", "r") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

scripts = soup.find_all('script')
for i, s in enumerate(scripts):
    text = s.string if s.string else ""
    if text:
        print(f"Cashbuild Script {i}: {text[:100]}...")
