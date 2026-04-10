import os
from supabase import create_client, Client

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://mdmrpcjkcuuybxpshgsi.supabase.co")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbXJwY2prY3V1eWJ4cHNoZ3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTcwNzksImV4cCI6MjA4NDM5MzA3OX0.aiOrB-KXGIIzFPyvpVjNd_2YcW65kj9LAXccsWvbzAM")
supabase: Client = create_client(url, key)

response = supabase.table("materials_cache").select("*").limit(1).execute()
print(response)
