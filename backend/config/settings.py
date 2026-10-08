import os

from dotenv import load_dotenv


# Load variables from .env
load_dotenv()


# Google Maps Platform API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")


# Application settings
APP_NAME = "Nearby Business Finder"
APP_VERSION = "1.0.0"