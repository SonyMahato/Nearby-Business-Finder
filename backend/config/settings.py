
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"

APP_NAME = "Nearby Business Finder"
APP_VERSION = "1.0.0"