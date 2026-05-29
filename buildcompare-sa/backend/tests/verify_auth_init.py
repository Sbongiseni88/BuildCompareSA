import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.auth import SUPABASE_URL, SUPABASE_ANON_KEY

def verify_init():
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        print("SUCCESS: Supabase Auth Configured")
    else:
        print("WARNING: Supabase Auth environment variables are missing (will bypass in dev mode)")
        # Do not fail build/tests since dev mode has bypass
        sys.exit(0)

if __name__ == "__main__":
    verify_init()
