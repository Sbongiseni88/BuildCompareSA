import os
import sys

from supabase import create_client, Client

# Credentials come from the environment only — never hardcode keys in the repo.
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
if not url or not key:
    sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first.")

supabase: Client = create_client(url, key)

response = supabase.table("materials_cache").select("*").limit(1).execute()
print(response)
