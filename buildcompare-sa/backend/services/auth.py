import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import logging

# Initialize Firebase Admin
try:
    if not firebase_admin._apps:
        # Check for the service account file in the project root (parent of 'backend' or current working dir)
        # Assuming run from 'buildcompare-sa/' root
        service_account_path = "buildcompare-9afbd-firebase-adminsdk-fbsvc-8c39a6c12f.json"
        
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            logging.info(f"Firebase Admin initialized with {service_account_path}")
        else:
            # Fallback to default or warn
            logging.warning(f"Service account file not found at {service_account_path}. Using ApplicationDefault if available.")
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
except Exception as e:
    logging.warning(f"Firebase Admin not initialized: {e}")

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the Firebase ID token in the Authorization header.
    Returns the decoded token (user info) if valid.
    """
    token = credentials.credentials
    try:
        # Verify the ID token while checking if the token is revoked.
        # Note: This requires the Firebase Admin SDK to be properly authenticated.
        decoded_token = auth.verify_id_token(token, check_revoked=True)
        return decoded_token
    except auth.RevokedIdTokenError:
        raise HTTPException(status_code=401, detail="Token revoked")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        # For development/demo purposes without valid firebase creds, 
        # we might want to allow a specific mock token or fail.
        # For now, we fail secure.
        raise HTTPException(status_code=401, detail=f"Invalid authentication credentials: {e}")
