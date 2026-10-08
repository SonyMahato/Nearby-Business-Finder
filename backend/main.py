from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.places import router as places_router


app = FastAPI(
    title="Nearby Business Finder",
    description=(
        "Location-based business search application "
        "for finding nearby businesses."
    ),
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(places_router)


@app.get("/")
def root():
    return {
        "message": "Nearby Business Finder API is running",
        "version": "1.0.0"
    }