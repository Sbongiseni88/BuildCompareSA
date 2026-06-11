import os
import sys

from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

# Credentials come from the environment only — never hardcode keys in the repo.
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if not url or not key:
    sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env first.")

sb = create_client(url, key)
res = sb.table("materials_cache").select("*").execute()
print(f"Got {len(res.data)} items in cache:")
for r in res.data: print(r["query_text"])
