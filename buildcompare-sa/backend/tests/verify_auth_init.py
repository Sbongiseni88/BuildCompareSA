import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.auth import firebase_admin

def verify_init():
    if firebase_admin._apps:
        print("SUCCESS: Firebase Admin Initialized")
    else:
        print("FAILURE: Firebase Admin NOT Initialized")
        sys.exit(1)

if __name__ == "__main__":
    verify_init()
