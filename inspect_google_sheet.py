import urllib.request
import re

sheet_id = '13wOuOrTy4SRAYQNODNm7vQXtKln3j9apTaOdcd1UmyM'
url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/edit'

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print(f"Page loaded, length: {len(html)} bytes")
        
        # Search for sheet names and gids in bootstrap data
        # Google sheets embeds sheet info in bootstrap data array like [gid, "Sheet Name", ...]
        gids_and_names = re.findall(r'\[(\d{1,10}),\s*"([^"]+)"', html)
        print("Found potential (gid, name) pairs:", len(gids_and_names))
        for gid, name in gids_and_names[:30]:
            print(f" GID: {gid} -> Name: {name}")

except Exception as e:
    print("Error fetching sheet:", e)
