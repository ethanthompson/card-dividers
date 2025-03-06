import os
import time
import requests

# Constants
SET_LIST_URL = "https://api.scryfall.com/sets"
OUTPUT_DIR = os.path.join("assets", "sets")
DELAY = 0.1  # 100 milliseconds

# Ensure the "sets" directory exists inside "assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def fetch_sets():
    """Fetch the list of all MTG sets from Scryfall."""
    response = requests.get(SET_LIST_URL)
    response.raise_for_status()
    return response.json()["data"]

def download_svg(set_code, svg_url):
    """Download and save the set icon as an SVG file."""
    response = requests.get(svg_url)
    response.raise_for_status()
    
    file_path = os.path.join(OUTPUT_DIR, f"{set_code}.svg")
    with open(file_path, "wb") as file:
        file.write(response.content)
    print(f"Saved: {file_path}")

def main():
    print("Fetching MTG sets from Scryfall...")
    sets = fetch_sets()

    for mtg_set in sets:
        set_code = mtg_set["code"]
        svg_url = mtg_set.get("icon_svg_uri")

        if svg_url:
            print(f"Downloading {set_code} icon...")
            download_svg(set_code, svg_url)
            time.sleep(DELAY)  # Respect Scryfall's rate limits

    print("Download complete.")

if __name__ == "__main__":
    main()
