import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://mdmrpcjkcuuybxpshgsi.supabase.co")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if not key: key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbXJwY2prY3V1eWJ4cHNoZ3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTcwNzksImV4cCI6MjA4NDM5MzA3OX0.aiOrB-KXGIIzFPyvpVjNd_2YcW65kj9LAXccsWvbzAM"

sb = create_client(url, key)
res = sb.table("materials_cache").select("*").execute()
print(f"Got {len(res.data)} items in cache:")
for r in res.data: print(r["query_text"])
