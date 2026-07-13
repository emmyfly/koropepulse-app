import json
import os
from typing import Optional

import firebase_admin
from firebase_admin import credentials

_app: Optional[firebase_admin.App] = None


def get_app() -> firebase_admin.App:
    """Returns the shared Firebase Admin app, initializing it on first use.

    Raises RuntimeError if credentials aren't configured — callers on
    optional/best-effort paths (e.g. minting a driver custom token) should
    catch this and degrade gracefully rather than fail the whole request.
    """
    global _app
    if _app is not None:
        return _app

    database_url = os.environ.get("FIREBASE_DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "FIREBASE_DATABASE_URL is not set. Copy the value from "
            "frontend/.env.local (VITE_FIREBASE_DATABASE_URL) into backend/.env."
        )

    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if service_account_json:
        cert = credentials.Certificate(json.loads(service_account_json))
    elif credentials_path:
        cert = credentials.Certificate(credentials_path)
    else:
        raise RuntimeError(
            "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON "
            "(the full service account key JSON, e.g. for a Railway env var) "
            "or GOOGLE_APPLICATION_CREDENTIALS (path to the downloaded key "
            "file, for local dev). Generate one at Firebase Console > "
            "Project Settings > Service Accounts > Generate new private key."
        )

    _app = firebase_admin.initialize_app(cert, {"databaseURL": database_url})
    return _app
