from bs4 import BeautifulSoup

def test_builders():
    with open("builders.html", "r") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    cards = soup.select(".product-card, .product-item, [data-product]")
    print(f"Builders: Found {len(cards)} cards")

def test_cashbuild():
    with open("cashbuild.html", "r") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    cards = soup.select(".product-card, .product-item, .product-grid-item, [data-product]")
    print(f"Cashbuild: Found {len(cards)} cards")

test_builders()
test_cashbuild()
